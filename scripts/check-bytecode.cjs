const { ethers } = require('ethers');
const fs = require('fs');
const hre = require('hardhat');

async function main() {
  console.log('🔍 Checking contract bytecode...\n');
  
  const contractAddress = '0x5fD8503003efD9B9d558ca86De6da0c5BB00c263';
  const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Get deployed bytecode
  console.log('📥 Fetching deployed bytecode from Base...');
  const deployedBytecode = await provider.getCode(contractAddress);
  console.log('✅ Deployed bytecode length:', deployedBytecode.length, 'characters');
  console.log('   (excluding 0x prefix:', deployedBytecode.length - 2, 'hex chars)');
  
  // Compile locally
  console.log('\n📦 Compiling contract locally...');
  await hre.run('compile');
  
  const BetModeVault = await hre.ethers.getContractFactory('contracts/BetModeVault.sol:BetModeVault');
  const qtTokenAddress = '0x541529ADB3f344128aa87917fd2926E7D240FB07';
  const adminSignerAddress = '0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F';
  
  // Get bytecode with constructor args
  const deploymentBytecode = BetModeVault.bytecode;
  const abiCoder = new ethers.AbiCoder();
  const constructorArgs = abiCoder.encode(
    ['address', 'address'],
    [qtTokenAddress, adminSignerAddress]
  );
  
  const fullBytecode = deploymentBytecode + constructorArgs.slice(2);
  
  console.log('✅ Local bytecode length:', fullBytecode.length, 'characters');
  console.log('   (excluding 0x prefix:', fullBytecode.length - 2, 'hex chars)');
  
  // Compare
  console.log('\n🔍 Comparison:');
  console.log('Deployed:', deployedBytecode.slice(0, 50) + '...');
  console.log('Local:   ', fullBytecode.slice(0, 50) + '...');
  
  // Check if runtime bytecode matches (without constructor)
  const deployedRuntime = deployedBytecode;
  const localRuntime = '0x' + deploymentBytecode.slice(2 + (constructorArgs.length - 2));
  
  console.log('\n📊 Runtime Bytecode (after constructor):');
  console.log('Deployed runtime length:', deployedRuntime.length);
  console.log('Local runtime length:   ', localRuntime.length);
  
  // Extract just the contract bytecode (without constructor)
  const contractBytecodeOnly = deploymentBytecode.slice(2, deploymentBytecode.length - (constructorArgs.length - 2));
  console.log('\n📋 Contract bytecode only (for verification):');
  console.log('Length:', contractBytecodeOnly.length, 'hex characters');
  console.log('First 50 chars:', contractBytecodeOnly.slice(0, 50) + '...');
  
  // Check compiler settings
  console.log('\n⚙️ Compiler Settings:');
  const config = hre.config.solidity;
  console.log('Version:', config.version);
  console.log('Optimizer:', config.settings.optimizer.enabled);
  console.log('Runs:', config.settings.optimizer.runs);
  
  console.log('\n✅ Check complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

