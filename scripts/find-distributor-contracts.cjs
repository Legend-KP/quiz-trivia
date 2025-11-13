const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Checking for deployed distributor contracts...\n");
  
  // Check environment variables
  const addresses = [
    process.env.QT_DISTRIBUTOR_ADDRESS,
    process.env.NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS,
    "0xb8AD9216A88E2f9a24c7e2207dE4e69101031f02", // Old default
  ].filter(Boolean);
  
  const uniqueAddresses = [...new Set(addresses)];
  
  if (uniqueAddresses.length === 0) {
    console.log("❌ No distributor addresses found in environment variables");
    console.log("\n💡 You need to deploy a new DailyRewardDistributor contract:");
    console.log("   npx hardhat run scripts/deploy-daily-reward-distributor.cjs --network base");
    return;
  }
  
  console.log("📋 Checking addresses:\n");
  
  for (const address of uniqueAddresses) {
    console.log(`📍 Checking: ${address}`);
    console.log(`   BaseScan: https://basescan.org/address/${address}`);
    
    // Try DailyRewardDistributor (new - 1k QT)
    try {
      const distributor = await ethers.getContractAt("DailyRewardDistributor", address);
      const rewardAmount = await distributor.REWARD_AMOUNT();
      const balance = await distributor.getQTBalance();
      
      console.log(`   ✅ DailyRewardDistributor (NEW - 1,000 QT/day)`);
      console.log(`      Reward: ${ethers.formatEther(rewardAmount)} QT`);
      console.log(`      Balance: ${ethers.formatEther(balance)} QT`);
      console.log(`      Status: ${Number(balance) >= Number(rewardAmount) ? "✅ Ready" : "⚠️  Low balance"}\n`);
      continue;
    } catch {}
    
    // Try QTRewardDistributor (old - 10k QT)
    try {
      const oldDistributor = await ethers.getContractAt("QTRewardDistributor", address);
      const rewardAmount = await oldDistributor.REWARD_AMOUNT();
      const balance = await oldDistributor.getQTBalance();
      
      console.log(`   ⚠️  QTRewardDistributor (OLD - 10,000 QT/day)`);
      console.log(`      Reward: ${ethers.formatEther(rewardAmount)} QT`);
      console.log(`      Balance: ${ethers.formatEther(balance)} QT`);
      console.log(`      Status: ${Number(balance) >= Number(rewardAmount) ? "✅ Ready" : "⚠️  Low balance"}`);
      console.log(`   💡 Consider deploying new DailyRewardDistributor (1k QT) instead\n`);
      continue;
    } catch {}
    
    console.log(`   ❌ Not a distributor contract\n`);
  }
  
  console.log("\n📝 Next Steps:");
  console.log("   If no valid distributor found, deploy a new one:");
  console.log("   npx hardhat run scripts/deploy-daily-reward-distributor.cjs --network base");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

