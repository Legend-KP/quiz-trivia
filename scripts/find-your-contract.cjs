const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Finding Your Daily Reward Distributor Contract...\n");
  
  // Check all possible environment variable names
  const possibleAddresses = [
    { name: "DAILY_REWARD_DISTRIBUTOR_ADDRESS", value: process.env.DAILY_REWARD_DISTRIBUTOR_ADDRESS },
    { name: "NEXT_PUBLIC_DAILY_REWARD_DISTRIBUTOR_ADDRESS", value: process.env.NEXT_PUBLIC_DAILY_REWARD_DISTRIBUTOR_ADDRESS },
    { name: "QT_DISTRIBUTOR_ADDRESS", value: process.env.QT_DISTRIBUTOR_ADDRESS },
    { name: "NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS", value: process.env.NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS },
  ].filter(item => item.value);
  
  console.log("📋 Environment Variables Found:");
  possibleAddresses.forEach(item => {
    console.log(`  ${item.name}: ${item.value}`);
  });
  
  if (possibleAddresses.length === 0) {
    console.log("\n❌ No distributor addresses found in environment variables!");
    console.log("\n💡 You need to deploy the contract first:");
    console.log("   npx hardhat run scripts/deploy-daily-reward-distributor.cjs --network base");
    return;
  }
  
  console.log("\n🔍 Verifying each address...\n");
  
  for (const { name, value } of possibleAddresses) {
    console.log(`📍 Checking ${name}:`);
    console.log(`   Address: ${value}`);
    console.log(`   BaseScan: https://basescan.org/address/${value}`);
    
    // Try DailyRewardDistributor (1k QT)
    try {
      const distributor = await ethers.getContractAt("DailyRewardDistributor", value);
      const rewardAmount = await distributor.REWARD_AMOUNT();
      const balance = await distributor.getQTBalance();
      const qtToken = await distributor.qtToken();
      
      console.log(`   ✅ VALID DailyRewardDistributor Contract!`);
      console.log(`      Reward Amount: ${ethers.formatEther(rewardAmount)} QT per day`);
      console.log(`      Contract Balance: ${ethers.formatEther(balance)} QT`);
      console.log(`      QT Token Address: ${qtToken}`);
      console.log(`      Status: ${Number(balance) >= Number(rewardAmount) ? "✅ Ready" : "⚠️  Needs deposit"}`);
      console.log(`\n   🎯 This is the CORRECT contract for 1,000 QT daily rewards!\n`);
      continue;
    } catch {}
    
    // Try QTRewardDistributor (old - 10k QT)
    try {
      const oldDistributor = await ethers.getContractAt("QTRewardDistributor", value);
      const rewardAmount = await oldDistributor.REWARD_AMOUNT();
      const balance = await oldDistributor.getQTBalance();
      
      console.log(`   ⚠️  OLD QTRewardDistributor Contract (10,000 QT/day)`);
      console.log(`      Reward Amount: ${ethers.formatEther(rewardAmount)} QT per day`);
      console.log(`      Contract Balance: ${ethers.formatEther(balance)} QT`);
      console.log(`   💡 This gives 10k QT, not 1k QT. Consider deploying new contract.\n`);
      continue;
    } catch {}
    
    // Check if it's the QT token
    if (value.toLowerCase() === process.env.QT_TOKEN_ADDRESS?.toLowerCase()) {
      console.log(`   ❌ This is the QT TOKEN address, NOT a distributor contract!`);
      console.log(`   💡 You need to deploy a DailyRewardDistributor contract.\n`);
      continue;
    }
    
    console.log(`   ❌ Not a valid distributor contract\n`);
  }
  
  console.log("\n📝 Recommendations:");
  console.log("   Use DAILY_REWARD_DISTRIBUTOR_ADDRESS in your .env for clarity");
  console.log("   Or keep using QT_DISTRIBUTOR_ADDRESS if you prefer");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

