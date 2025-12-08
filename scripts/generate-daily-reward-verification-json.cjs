const fs = require('fs');
const path = require('path');

// Read the contract source
const contractPath = path.join(__dirname, '..', 'contracts', 'DailyRewardDistributor.sol');
const contractContent = fs.readFileSync(contractPath, 'utf8');

// Create Standard JSON Input for BaseScan verification
const standardJsonInput = {
  language: "Solidity",
  sources: {
    "DailyRewardDistributor.sol": {
      content: contractContent
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
const outputPath = path.join(__dirname, '..', 'standard-json-input-daily-reward.json');
fs.writeFileSync(outputPath, JSON.stringify(standardJsonInput, null, 2));

console.log('✅ Generated standard-json-input-daily-reward.json');
console.log('\n📋 Verification Details:');
console.log('   Compiler Version: v0.8.20+commit.a1b79de6');
console.log('   Optimization: Enabled (200 runs)');
console.log('   EVM Version: Paris');
console.log('   Constructor Arguments: 0x0000000000000000000000000000000000000001');
console.log('\n💡 Use this file for manual verification on BaseScan:');
console.log('   1. Go to your contract on BaseScan');
console.log('   2. Click "Contract" tab → "Verify and Publish"');
console.log('   3. Select "Via Standard JSON Input"');
console.log('   4. Upload: standard-json-input-daily-reward.json');
console.log('   5. Enter constructor args: 0x0000000000000000000000000000000000000001');

