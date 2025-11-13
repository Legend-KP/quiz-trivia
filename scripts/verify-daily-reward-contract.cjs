const { run } = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x6DE14656a37D659ede5A928E371A298F880E194d";
  const QT_TOKEN_ADDRESS = "0x541529ADB3f344128aa87917fd2926E7D240FB07";
  
  console.log("🔍 Verifying DailyRewardDistributor Contract on BaseScan...\n");
  console.log("📍 Contract Address:", CONTRACT_ADDRESS);
  console.log("🔗 BaseScan: https://basescan.org/address/" + CONTRACT_ADDRESS + "\n");
  
  try {
    console.log("⏳ Verifying contract...");
    await run("verify:verify", {
      address: CONTRACT_ADDRESS,
      constructorArguments: [QT_TOKEN_ADDRESS],
      contract: "contracts/DailyRewardDistributor.sol:DailyRewardDistributor"
    });
    
    console.log("\n✅ Contract verified successfully!");
    console.log("🌐 View verified contract: https://basescan.org/address/" + CONTRACT_ADDRESS);
    
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract is already verified!");
    } else {
      console.error("❌ Verification failed:", error.message);
      console.log("\n💡 You can verify manually on BaseScan:");
      console.log("   1. Go to: https://basescan.org/address/" + CONTRACT_ADDRESS);
      console.log("   2. Click 'Contract' tab");
      console.log("   3. Click 'Verify and Publish'");
      console.log("   4. Use compiler version: v0.8.19");
      console.log("   5. Optimization: Yes, 200 runs");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

