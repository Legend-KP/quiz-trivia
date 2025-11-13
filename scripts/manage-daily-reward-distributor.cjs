const { ethers } = require("hardhat");

async function main() {
  const QT_DISTRIBUTOR_ADDRESS = process.env.QT_DISTRIBUTOR_ADDRESS || process.env.NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS;
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS;
  
  if (!QT_DISTRIBUTOR_ADDRESS) {
    throw new Error("QT_DISTRIBUTOR_ADDRESS or NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS environment variable is required");
  }
  
  console.log("📊 Daily Reward Distributor Contract Status\n");
  console.log("📍 Contract Address:", QT_DISTRIBUTOR_ADDRESS);
  console.log("🔗 BaseScan:", `https://basescan.org/address/${QT_DISTRIBUTOR_ADDRESS}\n`);
  
  // Get contract instance
  const dailyRewardDistributor = await ethers.getContractAt("DailyRewardDistributor", QT_DISTRIBUTOR_ADDRESS);
  
  // Get contract info
  const qtTokenAddress = await dailyRewardDistributor.qtToken();
  const rewardAmount = await dailyRewardDistributor.REWARD_AMOUNT();
  const contractBalance = await dailyRewardDistributor.getQTBalance();
  const owner = await dailyRewardDistributor.owner();
  
  console.log("📋 Contract Information:");
  console.log("  QT Token Address:", qtTokenAddress);
  console.log("  Reward Amount:", ethers.formatEther(rewardAmount), "QT tokens per day");
  console.log("  Contract Balance:", ethers.formatEther(contractBalance), "QT tokens");
  console.log("  Owner:", owner);
  
  // Calculate statistics
  const dailyClaimsSupported = Number(contractBalance) / Number(rewardAmount);
  const daysAt1000Users = dailyClaimsSupported / 1000;
  const daysAt10000Users = dailyClaimsSupported / 10000;
  
  console.log("\n📈 Statistics:");
  console.log("  Daily Claims Supported:", Math.floor(dailyClaimsSupported).toLocaleString());
  console.log("  Duration @ 1,000 users/day:", Math.floor(daysAt1000Users).toLocaleString(), "days");
  console.log("  Duration @ 10,000 users/day:", Math.floor(daysAt10000Users).toLocaleString(), "days");
  
  // Check if contract has enough balance
  if (contractBalance < rewardAmount) {
    console.log("\n⚠️  WARNING: Contract balance is below reward amount!");
    console.log("   Users won't be able to claim until you deposit more tokens.");
  } else {
    console.log("\n✅ Contract is ready for daily claims!");
  }
  
  // Optional: Check a specific user's claim status
  const checkUser = process.env.CHECK_USER_ADDRESS;
  if (checkUser) {
    console.log("\n👤 User Claim Status:");
    console.log("  User Address:", checkUser);
    const [lastClaim, canClaim] = await dailyRewardDistributor.getUserClaimStatus(checkUser);
    const lastClaimDate = lastClaim > 0 ? new Date(Number(lastClaim) * 86400 * 1000).toISOString() : "Never";
    console.log("  Last Claim Date:", lastClaimDate);
    console.log("  Can Claim Today:", canClaim ? "✅ Yes" : "❌ No");
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

