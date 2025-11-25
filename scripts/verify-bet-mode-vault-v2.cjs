const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Manual verification script for BetModeVault contract
 * 
 * Since Hardhat verify has API V2 issues, use this to get the verification data
 * and verify manually on BaseScan: https://basescan.org/address/0x9e64C4FAc590Cb159988B5b62655BBd16aeE8621#code
 */

async function main() {
  const contractAddress = "0x9e64C4FAc590Cb159988B5b62655BBd16aeE8621";
  const qtTokenAddress = "0x541529ADB3f344128aa87917fd2926E7D240FB07";
  const adminSignerAddress = "0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F";

  console.log("📋 Contract Verification Details:");
  console.log("Contract Address:", contractAddress);
  console.log("QT Token Address:", qtTokenAddress);
  console.log("Admin Signer Address:", adminSignerAddress);
  console.log("\n");

  // Get contract factory to verify compilation
  const BetModeVault = await ethers.getContractFactory("BetModeVault");
  console.log("✅ Contract compiled successfully");
  
  // Get constructor arguments
  const constructorArgs = [qtTokenAddress, adminSignerAddress];
  console.log("\n📝 Constructor Arguments:");
  console.log(JSON.stringify(constructorArgs, null, 2));
  
  // Encode constructor arguments using ABI
  const abi = BetModeVault.interface.format(ethers.FragmentFormat.full);
  const iface = new ethers.Interface(abi);
  
  // Get constructor ABI
  const constructorAbi = abi.find((f) => f.type === "constructor");
  if (constructorAbi) {
    const encodedArgs = ethers.AbiCoder.defaultAbiCoder().encode(
      constructorAbi.inputs.map((i) => i.type),
      constructorArgs
    );
    console.log("\n🔐 Encoded Constructor Arguments:");
    console.log(encodedArgs);
  }
  
  console.log("\n📖 Manual Verification Steps:");
  console.log("1. Go to: https://basescan.org/address/" + contractAddress + "#code");
  console.log("2. Click 'Verify and Publish'");
  console.log("3. Select:");
  console.log("   - Compiler Type: Solidity (Single file)");
  console.log("   - Compiler Version: 0.8.20");
  console.log("   - Open Source License: MIT");
  console.log("   - Optimization: Yes (200 runs)");
  console.log("4. Paste the contract source code from contracts/BetModeVault.sol");
  console.log("5. Constructor Arguments (ABI-encoded):");
  console.log("   " + encodedArgs);
  console.log("\n💡 Tip: You can also use the flattened contract if needed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

