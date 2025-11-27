const fs = require('fs');
const path = require('path');

// Read the flattened contract
const flattenedContent = fs.readFileSync('BetModeVault_flat.sol', 'utf8');

// Create Standard JSON Input for BaseScan verification
const standardJsonInput = {
  language: "Solidity",
  sources: {
    "BetModeVault.sol": {
      content: flattenedContent
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    evmVersion: "paris",
    outputSelection: {
      "*": {
        "*": [
          "abi",
          "evm.bytecode",
          "evm.deployedBytecode",
          "evm.bytecode.sourceMap",
          "evm.deployedBytecode.sourceMap"
        ]
      }
    }
  }
};

// Write to file
fs.writeFileSync(
  'standard-json-input-betmode.json',
  JSON.stringify(standardJsonInput, null, 2)
);

console.log('✅ Generated standard-json-input-betmode.json');
console.log('\n📋 Use this for BaseScan "Standard JSON Input" verification:');
console.log('1. Go to BaseScan → Verify and Publish');
console.log('2. Select "Solidity (Standard JSON Input)"');
console.log('3. Upload standard-json-input-betmode.json');
console.log('4. Set compiler version: v0.8.20+commit.a1b79de6');
console.log('5. Enter constructor args: 0x000000000000000000000000541529adb3f344128aa87917fd2926e7d240fb0700000000000000000000000055b2ed149545bb4af2977eeb0bff91f030b8bd5f');
console.log('\n');

