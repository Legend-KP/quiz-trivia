const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Testing Daily Reward Distributor Deployment...\n");
  
  // Check environment variables
  console.log("📋 Environment Check:");
  console.log("  QT_TOKEN_ADDRESS:", process.env.QT_TOKEN_ADDRESS || "❌ NOT SET");
  console.log("  PRIVATE_KEY:", process.env.PRIVATE_KEY ? "✅ SET" : "❌ NOT SET");
  console.log("  RPC_URL:", process.env.RPC_URL || "Using default");
  
  if (!process.env.QT_TOKEN_ADDRESS) {
    console.error("\n❌ Error: QT_TOKEN_ADDRESS environment variable is required");
    console.log("   Please set it in your .env file:");
    console.log("   QT_TOKEN_ADDRESS=0x541529ADB3f344128aa87917fd2926E7D240FB07");
    process.exit(1);
  }
  
  if (!process.env.PRIVATE_KEY) {
    console.error("\n❌ Error: PRIVATE_KEY environment variable is required");
    console.log("   Please set it in your .env file:");
    console.log("   PRIVATE_KEY=your_wallet_private_key");
    process.exit(1);
  }
  
  console.log("\n✅ Environment variables are set!");
  console.log("\n🚀 Attempting to get contract factory...");
  
  try {
    const DailyRewardDistributor = await ethers.getContractFactory("DailyRewardDistributor");
    console.log("✅ Contract factory loaded successfully!");
    console.log("\n📝 Contract will be deployed with:");
    console.log("  QT Token Address:", process.env.QT_TOKEN_ADDRESS);
    console.log("  Reward Amount: 1,000 QT tokens per day");
    console.log("\n💡 To deploy, run:");
    console.log("   npx hardhat run scripts/deploy-daily-reward-distributor.cjs --network base");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Make sure the contract is compiled: npx hardhat compile");
    console.log("   2. Check that contracts/DailyRewardDistributor.sol exists");
    console.log("   3. Verify your .env file has all required variables");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

