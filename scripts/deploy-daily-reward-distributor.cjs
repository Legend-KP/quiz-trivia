const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying Daily Reward Distributor Contract...\n");
  
  // Check environment variables
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS;
  
  if (!QT_TOKEN_ADDRESS) {
    console.error("❌ Error: QT_TOKEN_ADDRESS environment variable is required");
    console.log("\n💡 Please add to your .env file:");
    console.log("   QT_TOKEN_ADDRESS=0x361faAea711B20caF59726e5f478D745C187cB07");
    process.exit(1);
  }
  
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ Error: PRIVATE_KEY environment variable is required");
    console.log("\n💡 Please add to your .env file:");
    console.log("   PRIVATE_KEY=your_wallet_private_key");
    process.exit(1);
  }
  
  console.log("📋 Environment Check:");
  console.log("  ✅ QT_TOKEN_ADDRESS:", QT_TOKEN_ADDRESS);
  console.log("  ✅ PRIVATE_KEY: Set");
  console.log("");
  
  // Get the contract factory
  console.log("📦 Loading contract factory...");
  const DailyRewardDistributor = await ethers.getContractFactory("DailyRewardDistributor");
  console.log("✅ Contract factory loaded!\n");
  
  console.log("📋 Contract Details:");
  console.log("  QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("  Reward Amount: 1,000 QT tokens per day");
  console.log("  Network: Base Mainnet");
  console.log("");
  
  // Deploy the contract
  console.log("🚀 Deploying contract...");
  const dailyRewardDistributor = await DailyRewardDistributor.deploy(QT_TOKEN_ADDRESS);
  console.log("⏳ Waiting for deployment confirmation...");
  await dailyRewardDistributor.waitForDeployment();
  
  const contractAddress = await dailyRewardDistributor.getAddress();
  
  console.log("\n✅ Deployment Successful!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 BaseScan:", `https://basescan.org/address/${contractAddress}`);
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const qtTokenAddress = await dailyRewardDistributor.qtToken();
  const rewardAmount = await dailyRewardDistributor.REWARD_AMOUNT();
  
  console.log("✅ QT Token Address:", qtTokenAddress);
  console.log("✅ Reward Amount:", ethers.formatEther(rewardAmount), "QT tokens");
  
  console.log("\n📝 Next Steps:");
  console.log("1. Update your .env file with the contract address:");
  console.log(`   NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS=${contractAddress}`);
  console.log(`   QT_DISTRIBUTOR_ADDRESS=${contractAddress}`);
  console.log("2. Deposit 100 million QT tokens to the contract using:");
  console.log("   DEPOSIT_AMOUNT=100000000 npx hardhat run scripts/deposit-daily-reward-tokens.cjs --network base");
  console.log("3. Update your frontend to use the new contract address");
  
  return contractAddress;
}

main()
  .then((address) => {
    console.log("\n🎉 Contract deployed at:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

