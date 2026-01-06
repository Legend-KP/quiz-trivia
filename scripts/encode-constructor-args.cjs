const { ethers } = require('ethers');

// Constructor arguments
const qtTokenAddress = '0x361faAea711B20caF59726e5f478D745C187cB07';
const adminSignerAddress = '0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F';

// ABI-encode the constructor arguments (properly padded)
// Each address needs to be 32 bytes (64 hex chars) with leading zeros
const abiCoder = new ethers.AbiCoder();

const encoded = abiCoder.encode(
  ['address', 'address'],
  [qtTokenAddress, adminSignerAddress]
);

console.log('\n✅ ABI-Encoded Constructor Arguments:\n');
console.log(encoded);
console.log('\n📋 Copy this for BaseScan verification:\n');
console.log(encoded);
console.log('\n');

// Also show the format with 0x prefix removed (some verifiers want it)
console.log('Alternative format (without 0x):\n');
console.log(encoded.slice(2));
console.log('\n');

// Verify the encoding
console.log('Verification:');
console.log('- QT Token:', qtTokenAddress.toLowerCase());
console.log('- Admin Signer:', adminSignerAddress.toLowerCase());
console.log('- Encoded length:', encoded.length, 'characters (should be 130: 0x + 128 hex chars)');
console.log('\n');

