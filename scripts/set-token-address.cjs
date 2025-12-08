const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔧 Setting QT Token Address in Daily Reward Distributor Contract...\n");
  
  // Check environment variables
  const QT_DISTRIBUTOR_ADDRESS = process.env.QT_DISTRIBUTOR_ADDRESS || process.env.NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS;
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS;
  
  if (!QT_DISTRIBUTOR_ADDRESS) {
    console.error("❌ Error: QT_DISTRIBUTOR_ADDRESS or NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS environment variable is required");
    process.exit(1);
  }
  
  if (!QT_TOKEN_ADDRESS) {
    console.error("❌ Error: QT_TOKEN_ADDRESS environment variable is required");
    console.log("\n💡 Please add to your .env file:");
    console.log("   QT_TOKEN_ADDRESS=0x541529ADB3f344128aa87917fd2926E7D240FB07");
    process.exit(1);
  }
  
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ Error: PRIVATE_KEY environment variable is required");
    process.exit(1);
  }
  
  console.log("📋 Configuration:");
  console.log("  Distributor Address:", QT_DISTRIBUTOR_ADDRESS);
  console.log("  QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("");
  
  // Get contract instance
  const dailyRewardDistributor = await ethers.getContractAt("DailyRewardDistributor", QT_DISTRIBUTOR_ADDRESS);
  
  // Check current state
  const currentTokenAddress = await dailyRewardDistributor.qtToken();
  const isLocked = await dailyRewardDistributor.tokenAddressLocked();
  const owner = await dailyRewardDistributor.owner();
  
  console.log("📊 Current State:");
  console.log("  Current Token Address:", currentTokenAddress);
  console.log("  Token Address Locked:", isLocked ? "Yes" : "No");
  console.log("  Contract Owner:", owner);
  console.log("");
  
  if (isLocked) {
    console.log("⚠️  Token address is already locked!");
    console.log("   Current address:", currentTokenAddress);
    console.log("   This operation cannot be performed.");
    process.exit(1);
  }
  
  if (currentTokenAddress.toLowerCase() === QT_TOKEN_ADDRESS.toLowerCase()) {
    console.log("⚠️  Token address is already set to the same address!");
    console.log("   No change needed.");
    process.exit(0);
  }
  
  // Set the token address
  console.log("🔧 Setting token address...");
  try {
    const tx = await dailyRewardDistributor.setQTTokenAddress(QT_TOKEN_ADDRESS);
    console.log("⏳ Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    await tx.wait();
    
    console.log("\n✅ Token address set successfully!");
    
    // Verify the change
    const newTokenAddress = await dailyRewardDistributor.qtToken();
    const newIsLocked = await dailyRewardDistributor.tokenAddressLocked();
    
    console.log("\n📊 Updated State:");
    console.log("  New Token Address:", newTokenAddress);
    console.log("  Token Address Locked:", newIsLocked ? "Yes ✅" : "No ❌");
    
    if (newIsLocked && newTokenAddress.toLowerCase() === QT_TOKEN_ADDRESS.toLowerCase()) {
      console.log("\n🎉 Success! Token address is now permanently locked.");
      console.log("   The contract is ready to receive QT token deposits.");
    } else {
      console.log("\n⚠️  Warning: Token address may not have been set correctly.");
    }
    
  } catch (error) {
    console.error("❌ Error setting token address:", error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

