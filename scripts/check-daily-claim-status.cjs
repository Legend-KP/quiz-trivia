/**
 * Script to check daily claim status for a user address
 * Usage: node scripts/check-daily-claim-status.cjs [userAddress]
 */

const { ethers } = require("hardhat");

async function main() {
  const userAddress = process.argv[2] || process.env.USER_ADDRESS;
  
  if (!userAddress) {
    console.error("❌ Please provide a user address:");
    console.log("   node scripts/check-daily-claim-status.cjs 0xYourAddress");
    console.log("   Or set USER_ADDRESS environment variable");
    process.exit(1);
  }

  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS || 
                           process.env.QT_DISTRIBUTOR_ADDRESS || 
                           '0xED19A7dF3526d9B830A3463d4b93004127dbF6A6';

  console.log("🔍 Checking Daily Claim Status\n");
  console.log("📍 Contract Address:", CONTRACT_ADDRESS);
  console.log("👤 User Address:", userAddress);
  console.log("🔗 BaseScan:", `https://basescan.org/address/${CONTRACT_ADDRESS}\n`);

  try {
    // Get contract
    const DailyRewardDistributor = await ethers.getContractFactory("DailyRewardDistributor");
    const contract = await DailyRewardDistributor.attach(CONTRACT_ADDRESS);

    // Check last claim date
    const lastClaimDate = await contract.lastClaimDate(userAddress);
    const lastClaimDateNumber = Number(lastClaimDate);
    
    // Calculate today (days since epoch)
    const now = Math.floor(Date.now() / 1000);
    const today = Math.floor(now / 86400);
    
    // Check if can claim
    const canClaim = await contract.canClaimToday(userAddress);
    
    // Get reward amount
    const rewardAmount = await contract.REWARD_AMOUNT();
    const rewardAmountReadable = ethers.formatEther(rewardAmount);
    
    // Get contract balance
    const contractBalance = await contract.getQTBalance();
    const contractBalanceReadable = ethers.formatEther(contractBalance);

    console.log("📊 Claim Status:");
    console.log("   Last Claim Date (days since epoch):", lastClaimDateNumber);
    console.log("   Today (days since epoch):", today);
    console.log("   Can Claim Today:", canClaim ? "✅ YES" : "❌ NO");
    console.log("   Reward Amount:", rewardAmountReadable, "QT");
    console.log("   Contract Balance:", contractBalanceReadable, "QT");
    
    if (lastClaimDateNumber > 0) {
      const daysSinceClaim = today - lastClaimDateNumber;
      console.log("\n   Days since last claim:", daysSinceClaim);
      
      if (lastClaimDateNumber === today) {
        console.log("   ⚠️  Last claim was recorded TODAY");
      } else if (lastClaimDateNumber > today) {
        console.log("   ⚠️  WARNING: Last claim date is in the future! This shouldn't happen.");
      } else {
        console.log("   ℹ️  Last claim was", daysSinceClaim, "day(s) ago");
      }
    } else {
      console.log("\n   ℹ️  No previous claim recorded (lastClaimDate = 0)");
    }

    if (!canClaim && lastClaimDateNumber === 0) {
      console.log("\n   ⚠️  ISSUE DETECTED: Can't claim but lastClaimDate is 0!");
      console.log("   This might indicate a contract logic issue.");
    }

    if (Number(contractBalanceReadable) < Number(rewardAmountReadable)) {
      console.log("\n   ⚠️  WARNING: Contract has insufficient balance!");
      console.log("   Need:", rewardAmountReadable, "QT");
      console.log("   Have:", contractBalanceReadable, "QT");
    }

  } catch (error) {
    console.error("❌ Error checking claim status:", error.message);
    if (error.message.includes("contract")) {
      console.log("\n   💡 Tip: Make sure the contract address is correct and deployed on Base network");
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
