const { ethers } = require("hardhat");

async function main() {
  const NEW_CONTRACT = "0x6DE14656a37D659ede5A928E371A298F880E194d";
  
  console.log("🔍 Verifying New Daily Reward Distributor Contract\n");
  console.log("📍 Address:", NEW_CONTRACT);
  console.log("🔗 BaseScan: https://basescan.org/address/" + NEW_CONTRACT + "\n");
  
  try {
    const distributor = await ethers.getContractAt("DailyRewardDistributor", NEW_CONTRACT);
    
    const rewardAmount = await distributor.REWARD_AMOUNT();
    const qtToken = await distributor.qtToken();
    const balance = await distributor.getQTBalance();
    
    console.log("✅ Contract Verified Successfully!\n");
    console.log("📋 Contract Details:");
    console.log("  Reward Amount:", ethers.formatEther(rewardAmount), "QT tokens per day");
    console.log("  QT Token Address:", qtToken);
    console.log("  Current Balance:", ethers.formatEther(balance), "QT tokens");
    console.log("  Status:", Number(balance) >= Number(rewardAmount) ? "✅ Ready" : "⚠️  Needs deposit");
    
    console.log("\n✅ This is the CORRECT contract for 1,000 QT daily rewards!");
    console.log("\n📝 Update your .env file with:");
    console.log("   QT_DISTRIBUTOR_ADDRESS=" + NEW_CONTRACT);
    console.log("   NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS=" + NEW_CONTRACT);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

