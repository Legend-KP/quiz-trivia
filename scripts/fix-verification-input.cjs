const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

/**
 * Fix Standard JSON Input to ensure BaseScan can verify it
 * Adds explicit compiler version and ensures proper formatting
 */
async function main() {
  console.log('🔧 Fixing Standard JSON Input for BaseScan verification...\n');

  const contractAddress = '0x9e64C4FAc590Cb159988B5b62655BBd16aeE8621';
  const qtTokenAddress = process.env.QT_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_QT_TOKEN_ADDRESS || '0x541529ADB3f344128aa87917fd2926E7D240FB07';
  
  // Get admin signer from contract
  let adminSignerAddress = process.env.ADMIN_SIGNER_ADDRESS;
  
  if (!adminSignerAddress) {
    console.log('📡 Fetching admin signer address from deployed contract...');
    try {
      const contract = await ethers.getContractAt('BetModeVault', contractAddress);
      adminSignerAddress = await contract.adminSigner();
      console.log('✅ Found admin signer:', adminSignerAddress);
    } catch (error) {
      console.error('❌ Could not fetch admin signer from contract:', error.message);
      throw new Error('ADMIN_SIGNER_ADDRESS is required');
    }
  }

  // Read the existing verification input
  const inputPath = path.join(__dirname, '..', 'verification-input.json');
  const verificationInput = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  // Ensure compiler version is explicitly set
  if (!verificationInput.settings.compiler) {
    verificationInput.settings.compiler = {};
  }
  
  // Add explicit compiler version (BaseScan needs this)
  verificationInput.settings.compiler.version = '0.8.20';

  // Ensure remappings are set (even if empty, BaseScan might need this)
  if (!verificationInput.settings.remappings) {
    verificationInput.settings.remappings = [];
  }

  // Save the fixed version
  fs.writeFileSync(inputPath, JSON.stringify(verificationInput, null, 2));
  
  console.log('✅ Fixed Standard JSON Input saved to:', inputPath);
  console.log('');
  console.log('📋 Verification Details:');
  console.log('Contract Address:', contractAddress);
  console.log('QT Token Address:', qtTokenAddress);
  console.log('Admin Signer Address:', adminSignerAddress);
  console.log('Compiler Version:', verificationInput.settings.compiler.version || '0.8.20');
  console.log('');
  
  // Calculate ABI-encoded constructor arguments
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const constructorArgs = abiCoder.encode(
    ['address', 'address'],
    [qtTokenAddress, adminSignerAddress]
  );
  
  console.log('📝 Constructor Arguments (ABI-encoded):');
  console.log(constructorArgs);
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Go to: https://basescan.org/address/' + contractAddress + '#code');
  console.log('2. Click "Contract" → "Verify and Publish"');
  console.log('3. Select "Via Standard JSON Input"');
  console.log('4. Upload:', inputPath);
  console.log('5. Enter compiler version: 0.8.20');
  console.log('6. Enter constructor arguments:', constructorArgs);
  console.log('7. Click "Verify and Publish"');
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

