const { run } = require("hardhat");
require("dotenv").config();

async function main() {
  const CONTRACT_ADDRESS = process.env.QT_DISTRIBUTOR_ADDRESS || process.env.NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS;
  const CONSTRUCTOR_ARGS = "0x0000000000000000000000000000000000000001"; // Placeholder address

  if (!CONTRACT_ADDRESS) {
    console.error("❌ Error: QT_DISTRIBUTOR_ADDRESS or NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS environment variable is required");
    process.exit(1);
  }

  console.log("🔍 Verifying DailyRewardDistributor contract...\n");
  console.log("📍 Contract Address:", CONTRACT_ADDRESS);
  console.log("🔧 Constructor Args:", CONSTRUCTOR_ARGS);
  console.log("");

  try {
    await run("verify:verify", {
      address: CONTRACT_ADDRESS,
      constructorArguments: [CONSTRUCTOR_ARGS],
      contract: "contracts/DailyRewardDistributor.sol:DailyRewardDistributor",
      compilerVersion: "v0.8.20+commit.a1b79de6",
    });

    console.log("\n✅ Contract verified successfully!");
    console.log("🔗 View on BaseScan: https://basescan.org/address/" + CONTRACT_ADDRESS);
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("✅ Contract is already verified!");
    } else {
      console.error("❌ Verification failed:", error.message);
      console.log("\n💡 Try manual verification on BaseScan:");
      console.log("   1. Go to: https://basescan.org/address/" + CONTRACT_ADDRESS);
      console.log("   2. Click 'Contract' tab");
      console.log("   3. Click 'Verify and Publish'");
      console.log("   4. Use these settings:");
      console.log("      - Compiler Version: v0.8.20+commit.a1b79de6");
      console.log("      - Optimization: Yes (200 runs)");
      console.log("      - EVM Version: Paris");
      console.log("      - Constructor Arguments: " + CONSTRUCTOR_ARGS);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

