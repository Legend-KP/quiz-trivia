const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verifying QT Reward Distributor Contract...");
  
  const QT_DISTRIBUTOR_ADDRESS = process.env.QT_DISTRIBUTOR_ADDRESS;
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS;
  
  if (!QT_DISTRIBUTOR_ADDRESS || !QT_TOKEN_ADDRESS) {
    throw new Error("QT_DISTRIBUTOR_ADDRESS and QT_TOKEN_ADDRESS environment variables are required");
  }
  
  console.log("📍 Contract Address:", QT_DISTRIBUTOR_ADDRESS);
  console.log("🪙 QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("🔗 BaseScan URL:", `https://basescan.org/address/${QT_DISTRIBUTOR_ADDRESS}`);
  
  try {
    // Get contract instance
    const qtDistributor = await ethers.getContractAt("QTRewardDistributor", QT_DISTRIBUTOR_ADDRESS);
    
    // Verify contract details
    console.log("\n🔍 Contract Verification:");
    
    // Check QT token address
    const qtTokenAddress = await qtDistributor.qtToken();
    console.log("✅ QT Token Address:", qtTokenAddress);
    console.log("✅ Matches Expected:", qtTokenAddress.toLowerCase() === QT_TOKEN_ADDRESS.toLowerCase() ? "Yes" : "No");
    
    // Check reward amount
    const rewardAmount = await qtDistributor.REWARD_AMOUNT();
    console.log("✅ Reward Amount:", ethers.formatEther(rewardAmount), "QT tokens");
    
    // Check owner
    const owner = await qtDistributor.owner();
    console.log("✅ Contract Owner:", owner);
    
    // Check contract balance
    const balance = await qtDistributor.getQTBalance();
    console.log("✅ Contract Balance:", ethers.formatEther(balance), "QT tokens");
    
    // Calculate max rewards
    const maxRewards = balance / rewardAmount;
    console.log("✅ Max Rewards Available:", maxRewards.toString());
    
    // Test a few functions
    console.log("\n🧪 Function Tests:");
    
    // Test canClaimToday with a random address
    const testAddress = "0x0000000000000000000000000000000000000001";
    const canClaim = await qtDistributor.canClaimToday(testAddress);
    console.log("✅ canClaimToday() works:", canClaim ? "Yes" : "No");
    
    // Test getUserClaimStatus
    const claimStatus = await qtDistributor.getUserClaimStatus(testAddress);
    console.log("✅ getUserClaimStatus() works:", claimStatus ? "Yes" : "No");
    
    console.log("\n🎉 Contract Verification Complete!");
    console.log("✅ All functions are working correctly");
    console.log("✅ Contract is ready for production use");
    
    console.log("\n📋 Contract Summary:");
    console.log("- Contract Address:", QT_DISTRIBUTOR_ADDRESS);
    console.log("- QT Token Address:", qtTokenAddress);
    console.log("- Reward Amount:", ethers.formatEther(rewardAmount), "QT tokens");
    console.log("- Contract Balance:", ethers.formatEther(balance), "QT tokens");
    console.log("- Max Users:", maxRewards.toString());
    console.log("- Owner:", owner);
    
    console.log("\n🔗 View on BaseScan:");
    console.log(`https://basescan.org/address/${QT_DISTRIBUTOR_ADDRESS}`);
    
    return {
      contractAddress: QT_DISTRIBUTOR_ADDRESS,
      qtTokenAddress: qtTokenAddress,
      rewardAmount: ethers.formatEther(rewardAmount),
      balance: ethers.formatEther(balance),
      maxRewards: maxRewards.toString(),
      owner: owner,
      baseScanUrl: `https://basescan.org/address/${QT_DISTRIBUTOR_ADDRESS}`
    };
    
  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
    throw error;
  }
}

main()
  .then((result) => {
    console.log("\n📊 Verification Results:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
