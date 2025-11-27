const fs = require('fs');

// Read the flattened file
const content = fs.readFileSync('BetModeVault_flat.sol', 'utf8');

// Split into lines
const lines = content.split('\n');

// Find first SPDX and pragma
let firstSPDX = -1;
let firstPragma = -1;
let cleanedLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Track first SPDX
  if (line.includes('SPDX-License-Identifier') && firstSPDX === -1) {
    firstSPDX = i;
    cleanedLines.push('// SPDX-License-Identifier: MIT');
    continue;
  }
  
  // Track first pragma solidity
  if (line.trim().startsWith('pragma solidity') && firstPragma === -1) {
    firstPragma = i;
    cleanedLines.push('pragma solidity ^0.8.20;');
    continue;
  }
  
  // Skip duplicate SPDX lines
  if (line.includes('SPDX-License-Identifier') && i !== firstSPDX) {
    continue;
  }
  
  // Skip duplicate pragma lines
  if (line.trim().startsWith('pragma solidity') && i !== firstPragma) {
    continue;
  }
  
  // Skip the hardhat flatten header
  if (line.includes('Sources flattened with hardhat')) {
    continue;
  }
  
  // Keep all other lines
  cleanedLines.push(line);
}

// Write cleaned file
const cleanedContent = cleanedLines.join('\n');
fs.writeFileSync('BetModeVault_flat.sol', cleanedContent);

console.log('✅ Cleaned flattened file:');
console.log('- Removed duplicate SPDX-License-Identifier lines');
console.log('- Removed duplicate pragma solidity lines');
console.log('- File starts with single SPDX and pragma');

