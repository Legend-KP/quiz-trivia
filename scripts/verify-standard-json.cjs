const fs = require("fs");
const path = require("path");

/**
 * Generate Standard JSON Input for contract verification
 * This is more reliable than single-file verification
 */
async function main() {
  const contractAddress = "0xD9DaF0183265cf600F0e2df6aD2dE4F0334B15B3";
  const qtTokenAddress = "0x541529ADB3f344128aa87917fd2926E7D240FB07";
  const adminSignerAddress = "0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F";

  // Read the standard JSON input from artifacts
  const artifactsPath = path.join(__dirname, "../artifacts/build-info");
  
  // Find the latest build info file
  const buildInfoFiles = fs.readdirSync(artifactsPath).filter(f => f.endsWith(".json"));
  
  if (buildInfoFiles.length === 0) {
    console.error("❌ No build info files found. Run 'npx hardhat compile' first.");
    process.exit(1);
  }

  // Get the most recent build info file
  const latestBuildInfo = buildInfoFiles[buildInfoFiles.length - 1];
  const buildInfoPath = path.join(artifactsPath, latestBuildInfo);
  
  console.log("📦 Using build info:", latestBuildInfo);
  
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));
  
  // Find BetModeVault contract in build info
  const contractName = "BetModeVault";
  const contractKey = Object.keys(buildInfo.output.contracts).find(key => 
    key.includes("BetModeVault.sol")
  );
  
  if (!contractKey) {
    console.error("❌ BetModeVault contract not found in build info");
    process.exit(1);
  }
  
  console.log("✅ Found contract:", contractKey);
  console.log("\n📋 Verification Details:");
  console.log("Contract Address:", contractAddress);
  console.log("QT Token Address:", qtTokenAddress);
  console.log("Admin Signer Address:", adminSignerAddress);
  console.log("\n💡 Use Standard JSON Input method on BaseScan:");
  console.log("1. Go to: https://basescan.org/address/" + contractAddress);
  console.log("2. Click 'Contract' tab → 'Verify and Publish'");
  console.log("3. Select 'Solidity (Standard JSON Input)'");
  console.log("4. Upload the Standard JSON Input file (created below)");
  console.log("5. Enter contract name: BetModeVault");
  console.log("6. Enter constructor arguments (ABI-encoded):");
  
  // Calculate constructor arguments
  const { ethers } = require("ethers");
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const constructorArgs = abiCoder.encode(
    ["address", "address"],
    [qtTokenAddress, adminSignerAddress]
  );
  
  console.log("   " + constructorArgs);
  
  // Create Standard JSON Input
  const standardJsonInput = {
    language: "Solidity",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "paris",
      viaIR: false
    },
    sources: buildInfo.input.sources
  };
  
  // Save Standard JSON Input to file
  const outputPath = path.join(__dirname, "../standard-json-input.json");
  fs.writeFileSync(outputPath, JSON.stringify(standardJsonInput, null, 2));
  
  console.log("\n✅ Standard JSON Input saved to: standard-json-input.json");
  console.log("\n📝 Constructor Arguments (for manual entry):");
  console.log(constructorArgs);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

