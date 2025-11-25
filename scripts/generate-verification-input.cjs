const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

/**
 * Generate Standard JSON Input for BaseScan verification
 * This includes all OpenZeppelin contracts inline
 */
async function main() {
  console.log('📦 Generating Standard JSON Input for BaseScan verification...\n');

  const contractAddress = '0x9e64C4FAc590Cb159988B5b62655BBd16aeE8621';
  const qtTokenAddress = process.env.QT_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_QT_TOKEN_ADDRESS || '0x541529ADB3f344128aa87917fd2926E7D240FB07';
  
  // Try to get admin signer from contract, or use env var
  let adminSignerAddress = process.env.ADMIN_SIGNER_ADDRESS;
  
  if (!adminSignerAddress) {
    console.log('📡 Fetching admin signer address from deployed contract...');
    try {
      const contract = await ethers.getContractAt('BetModeVault', contractAddress);
      adminSignerAddress = await contract.adminSigner();
      console.log('✅ Found admin signer:', adminSignerAddress);
    } catch (error) {
      console.error('❌ Could not fetch admin signer from contract:', error.message);
      console.log('💡 Please provide ADMIN_SIGNER_ADDRESS as environment variable');
      throw new Error('ADMIN_SIGNER_ADDRESS is required');
    }
  }

  console.log('Contract Address:', contractAddress);
  console.log('QT Token Address:', qtTokenAddress);
  console.log('Admin Signer Address:', adminSignerAddress);
  console.log('');

  // Get Hardhat compilation artifacts
  const artifactsPath = path.join(__dirname, '..', 'artifacts', 'build-info');
  
  if (!fs.existsSync(artifactsPath)) {
    throw new Error('❌ Artifacts not found. Run "npx hardhat compile" first.');
  }

  // Find the build info file
  const buildInfoFiles = fs.readdirSync(artifactsPath).filter(f => f.endsWith('.json'));
  
  if (buildInfoFiles.length === 0) {
    throw new Error('❌ No build info files found. Run "npx hardhat compile" first.');
  }

  // Get the most recent build info file
  const buildInfoFile = buildInfoFiles[buildInfoFiles.length - 1];
  const buildInfoPath = path.join(artifactsPath, buildInfoFile);
  
  console.log('📄 Reading build info:', buildInfoFile);
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));

  // Extract the Standard JSON Input
  const standardJsonInput = buildInfo.input;
  
  // Get the contract output
  const contractOutput = buildInfo.output.contracts['contracts/BetModeVault.sol'].BetModeVault;
  
  // Create the verification input
  const verificationInput = {
    language: 'Solidity',
    sources: standardJsonInput.sources,
    settings: standardJsonInput.settings,
  };

  // Save to file
  const outputPath = path.join(__dirname, '..', 'verification-input.json');
  fs.writeFileSync(outputPath, JSON.stringify(verificationInput, null, 2));
  
  console.log('✅ Standard JSON Input saved to:', outputPath);
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Go to BaseScan: https://basescan.org/address/' + contractAddress + '#code');
  console.log('2. Click "Contract" tab, then "Verify and Publish"');
  console.log('3. Select "Via Standard JSON Input"');
  console.log('4. Upload the file:', outputPath);
  console.log('5. Enter constructor arguments (ABI-encoded):');
  
  // Calculate ABI-encoded constructor arguments
  const { ethers } = require('hardhat');
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const constructorArgs = abiCoder.encode(
    ['address', 'address'],
    [qtTokenAddress, adminSignerAddress]
  );
  
  console.log('   Constructor Arguments:', constructorArgs);
  console.log('');
  console.log('📝 Or use this command (if Hardhat verify works):');
  console.log(`   npx hardhat verify --network base ${contractAddress} ${qtTokenAddress} ${adminSignerAddress}`);
}

main()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });

