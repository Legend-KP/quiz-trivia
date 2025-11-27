const { ethers } = require('ethers');
const hre = require('hardhat');

async function main() {
  console.log('🔍 Verifying bytecode match for verification...\n');
  
  const contractAddress = '0x5fD8503003efD9B9d558ca86De6da0c5BB00c263';
  const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Get deployed bytecode
  console.log('📥 Fetching deployed bytecode...');
  const deployedBytecode = await provider.getCode(contractAddress);
  const deployedRuntimeLength = (deployedBytecode.length - 2) / 2; // bytes
  console.log('✅ Deployed runtime bytecode:', deployedRuntimeLength, 'bytes');
  
  // Compile locally (using original contract, not flattened)
  console.log('\n📦 Compiling contract locally...');
  await hre.run('compile');
  
  const BetModeVault = await hre.ethers.getContractFactory('contracts/BetModeVault.sol:BetModeVault');
  const qtTokenAddress = '0x541529ADB3f344128aa87917fd2926E7D240FB07';
  const adminSignerAddress = '0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F';
  
  // Get deployment bytecode
  const deploymentBytecode = BetModeVault.bytecode;
  
  // Encode constructor args
  const abiCoder = new ethers.AbiCoder();
  const constructorArgs = abiCoder.encode(
    ['address', 'address'],
    [qtTokenAddress, adminSignerAddress]
  );
  
  // Full bytecode = deployment bytecode + constructor args (without 0x)
  const fullBytecode = deploymentBytecode + constructorArgs.slice(2);
  
  // Runtime bytecode is what's stored on-chain (after constructor runs)
  // It's the deployment bytecode minus constructor args
  const constructorArgsLength = (constructorArgs.length - 2) / 2; // bytes
  const localRuntimeLength = (deploymentBytecode.length - 2) / 2 - constructorArgsLength;
  
  console.log('✅ Local runtime bytecode:', localRuntimeLength, 'bytes');
  console.log('✅ Constructor args length:', constructorArgsLength, 'bytes');
  
  // Compare lengths
  console.log('\n📊 Comparison:');
  console.log('Deployed runtime:', deployedRuntimeLength, 'bytes');
  console.log('Local runtime:   ', localRuntimeLength, 'bytes');
  console.log('Difference:      ', Math.abs(deployedRuntimeLength - localRuntimeLength), 'bytes');
  
  if (Math.abs(deployedRuntimeLength - localRuntimeLength) < 10) {
    console.log('\n✅ Bytecode lengths match! (within tolerance)');
  } else {
    console.log('\n⚠️ Bytecode lengths differ - compiler settings may not match');
  }
  
  // Check compiler settings
  console.log('\n⚙️ Compiler Settings Used:');
  const config = hre.config.solidity;
  console.log('Version:', config.version);
  console.log('Optimizer Enabled:', config.settings.optimizer.enabled);
  console.log('Optimizer Runs:', config.settings.optimizer.runs);
  
  console.log('\n📋 For BaseScan Verification:');
  console.log('Compiler Version: v0.8.20+commit.a1b79de6');
  console.log('Optimization: Yes');
  console.log('Runs: 200');
  console.log('Constructor Args:', constructorArgs);
  
  console.log('\n✅ Check complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

