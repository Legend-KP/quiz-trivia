const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const ADDRESS = process.argv[2] || process.env.QT_DISTRIBUTOR_ADDRESS || "0x361faAea711B20caF59726e5f478D745C187cB07";
  
  console.log("🔍 Verifying contract at address:", ADDRESS);
  console.log("🔗 BaseScan:", `https://basescan.org/address/${ADDRESS}\n`);
  
  try {
    // Try to load as DailyRewardDistributor
    console.log("📦 Attempting to load as DailyRewardDistributor...");
    const distributor = await ethers.getContractAt("DailyRewardDistributor", ADDRESS);
    
    try {
      const rewardAmount = await distributor.REWARD_AMOUNT();
      const qtToken = await distributor.qtToken();
      const balance = await distributor.getQTBalance();
      
      console.log("✅ This IS a DailyRewardDistributor contract!");
      console.log("  Reward Amount:", ethers.formatEther(rewardAmount), "QT tokens");
      console.log("  QT Token Address:", qtToken);
      console.log("  Contract Balance:", ethers.formatEther(balance), "QT tokens");
      
      // Check if it's the old contract (10k) or new (1k)
      if (Number(rewardAmount) === 1000 * 10**18) {
        console.log("\n✅ This is the NEW DailyRewardDistributor (1,000 QT per day)");
      } else if (Number(rewardAmount) === 10000 * 10**18) {
        console.log("\n⚠️  This is the OLD QTRewardDistributor (10,000 QT per day)");
        console.log("   You may want to deploy a new one with 1,000 QT rewards");
      }
      
    } catch (error) {
      console.log("❌ Error reading contract:", error.message);
    }
    
  } catch (error) {
    console.log("❌ Not a DailyRewardDistributor contract");
    console.log("   Error:", error.message);
    
    // Try to check if it's the QT token contract
    console.log("\n🔍 Checking if it's the QT Token contract...");
    const tokenABI = [
      "function symbol() external view returns (string)",
      "function name() external view returns (string)",
      "function totalSupply() external view returns (uint256)"
    ];
    
    try {
      const token = new ethers.Contract(ADDRESS, tokenABI, ethers.provider);
      const symbol = await token.symbol();
      const name = await token.name();
      
      console.log("✅ This IS the QT Token contract!");
      console.log("  Name:", name);
      console.log("  Symbol:", symbol);
      console.log("\n❌ This is NOT the distributor contract!");
      console.log("💡 You need to deploy the DailyRewardDistributor contract first:");
      console.log("   npx hardhat run scripts/deploy-daily-reward-distributor.cjs --network base");
    } catch (tokenError) {
      console.log("❌ Not a recognized contract");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

