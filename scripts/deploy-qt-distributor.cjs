const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying QT Reward Distributor Contract...");
  
  // Get the contract factory
  const QTRewardDistributor = await ethers.getContractFactory("QTRewardDistributor");
  
  // QT Token address (you'll need to provide this)
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS;
  
  if (!QT_TOKEN_ADDRESS) {
    throw new Error("QT_TOKEN_ADDRESS environment variable is required");
  }
  
  console.log("📋 Contract Details:");
  console.log("- QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("- Reward Amount: 10,000 QT tokens");
  console.log("- Network: Base Mainnet");
  
  // Deploy the contract
  const qtDistributor = await QTRewardDistributor.deploy(QT_TOKEN_ADDRESS);
  await qtDistributor.waitForDeployment();
  
  const contractAddress = await qtDistributor.getAddress();
  
  console.log("\n✅ Deployment Successful!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 BaseScan:", `https://basescan.org/address/${contractAddress}`);
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const qtTokenAddress = await qtDistributor.qtToken();
  const rewardAmount = await qtDistributor.REWARD_AMOUNT();
  
  console.log("✅ QT Token Address:", qtTokenAddress);
  console.log("✅ Reward Amount:", ethers.formatEther(rewardAmount), "QT tokens");
  
  console.log("\n📝 Next Steps:");
  console.log("1. Update your .env file with the contract address:");
  console.log(`   QT_DISTRIBUTOR_ADDRESS=${contractAddress}`);
  console.log("2. Deposit QT tokens to the contract using depositQTTokens()");
  console.log("3. Update your API to use the new contract");
  
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
