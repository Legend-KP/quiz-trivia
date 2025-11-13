const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Daily Reward Distributor Contract...");
  
  // Get the contract factory
  const DailyRewardDistributor = await ethers.getContractFactory("DailyRewardDistributor");
  
  // QT Token address (you'll need to provide this)
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS;
  
  if (!QT_TOKEN_ADDRESS) {
    throw new Error("QT_TOKEN_ADDRESS environment variable is required");
  }
  
  console.log("📋 Contract Details:");
  console.log("- QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("- Reward Amount: 1,000 QT tokens per day");
  console.log("- Network: Base Mainnet");
  
  // Deploy the contract
  const dailyRewardDistributor = await DailyRewardDistributor.deploy(QT_TOKEN_ADDRESS);
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

