const { ethers } = require("hardhat");

async function main() {
  const QT_DISTRIBUTOR_ADDRESS = process.env.QT_DISTRIBUTOR_ADDRESS;
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS;
  
  if (!QT_DISTRIBUTOR_ADDRESS || !QT_TOKEN_ADDRESS) {
    throw new Error("QT_DISTRIBUTOR_ADDRESS and QT_TOKEN_ADDRESS environment variables are required");
  }
  
  // Get contract instances
  const qtDistributor = await ethers.getContractAt("QTRewardDistributor", QT_DISTRIBUTOR_ADDRESS);
  
  // Create QT token contract instance manually
  const qtTokenABI = [
    "function balanceOf(address account) external view returns (uint256)"
  ];
  const [owner] = await ethers.getSigners();
  const qtToken = new ethers.Contract(QT_TOKEN_ADDRESS, qtTokenABI, owner);
  
  console.log("🔍 QT Reward Distributor Management");
  console.log("📍 Contract Address:", QT_DISTRIBUTOR_ADDRESS);
  console.log("🪙 QT Token Address:", QT_TOKEN_ADDRESS);
  
  // Get contract balance
  const contractBalance = await qtDistributor.getQTBalance();
  console.log("💰 Contract QT Balance:", ethers.formatEther(contractBalance), "QT tokens");
  
  // Get owner
  const contractOwner = await qtDistributor.owner();
  console.log("👤 Owner:", contractOwner);
  
  // Get reward amount
  const rewardAmount = await qtDistributor.REWARD_AMOUNT();
  console.log("🎁 Reward Amount:", ethers.formatEther(rewardAmount), "QT tokens per claim");
  
  // Check if contract has enough tokens for one reward
  const canDistribute = contractBalance >= rewardAmount;
  console.log("✅ Can Distribute:", canDistribute ? "Yes" : "No");
  
  if (!canDistribute) {
    console.log("\n⚠️  WARNING: Contract needs more QT tokens!");
    console.log("💡 To deposit QT tokens, run:");
    console.log(`   npx hardhat run scripts/deposit-qt-tokens.cjs --network base`);
  }
  
  return {
    contractAddress: QT_DISTRIBUTOR_ADDRESS,
    qtTokenAddress: QT_TOKEN_ADDRESS,
    balance: ethers.formatEther(contractBalance),
    canDistribute,
    contractOwner
  };
}

main()
  .then((result) => {
    console.log("\n✅ Management check complete!");
    console.log("📊 Summary:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Management check failed:", error);
    process.exit(1);
  });
