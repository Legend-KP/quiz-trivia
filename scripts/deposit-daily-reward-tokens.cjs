const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Use specific variable names for daily reward contract to avoid conflicts
  const DAILY_REWARD_DISTRIBUTOR_ADDRESS = 
    process.env.DAILY_REWARD_DISTRIBUTOR_ADDRESS || 
    process.env.NEXT_PUBLIC_DAILY_REWARD_DISTRIBUTOR_ADDRESS ||
    process.env.QT_DISTRIBUTOR_ADDRESS || 
    process.env.NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS;
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS;
  const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT || "100000000"; // 100M QT tokens by default
  
  console.log("💰 Depositing QT tokens to Daily Reward Distributor contract...\n");
  
  // Validate environment variables
  if (!DAILY_REWARD_DISTRIBUTOR_ADDRESS) {
    console.error("❌ Error: Daily Reward Distributor address is not set!");
    console.log("\n💡 You need to:");
    console.log("   1. Deploy the contract first:");
    console.log("      npx hardhat run scripts/deploy-daily-reward-distributor.cjs --network base");
    console.log("   2. Add the contract address to your .env file (use one of these):");
    console.log("      DAILY_REWARD_DISTRIBUTOR_ADDRESS=0xYourDeployedContractAddress");
    console.log("      NEXT_PUBLIC_DAILY_REWARD_DISTRIBUTOR_ADDRESS=0xYourDeployedContractAddress");
    console.log("      (or QT_DISTRIBUTOR_ADDRESS if you prefer)");
    process.exit(1);
  }
  
  const QT_DISTRIBUTOR_ADDRESS = DAILY_REWARD_DISTRIBUTOR_ADDRESS; // For backward compatibility
  
  if (!QT_TOKEN_ADDRESS) {
    console.error("❌ Error: QT_TOKEN_ADDRESS environment variable is required");
    console.log("\n💡 Please add to your .env file:");
    console.log("   QT_TOKEN_ADDRESS=0x541529ADB3f344128aa87917fd2926E7D240FB07");
    process.exit(1);
  }
  
  // Validate that distributor address is NOT the token address
  if (QT_DISTRIBUTOR_ADDRESS.toLowerCase() === QT_TOKEN_ADDRESS.toLowerCase()) {
    console.error("❌ Error: Distributor address cannot be the same as QT Token address!");
    console.log("\n💡 Current addresses:");
    console.log("   Distributor:", QT_DISTRIBUTOR_ADDRESS);
    console.log("   QT Token:   ", QT_TOKEN_ADDRESS);
    console.log("\n   These are the SAME address, which is incorrect!");
    console.log("   The distributor address should be a DIFFERENT contract.");
    console.log("\n   Please check:");
    console.log("   1. Did you deploy the DailyRewardDistributor contract?");
    console.log("   2. Did you copy the correct address from the deployment output?");
    console.log("   3. The address should be DIFFERENT from the QT token address");
    console.log("\n   To deploy a new contract:");
    console.log("   npx hardhat run scripts/deploy-daily-reward-distributor.cjs --network base");
    process.exit(1);
  }
  
  console.log("📋 Configuration:");
  console.log("  📍 Daily Reward Distributor:", QT_DISTRIBUTOR_ADDRESS);
  console.log("  🪙 QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("  💵 Deposit Amount:", DEPOSIT_AMOUNT, "QT tokens (100 Million)");
  console.log("");
  
  // Get contract instances
  console.log("📦 Loading contracts...");
  let dailyRewardDistributor;
  try {
    dailyRewardDistributor = await ethers.getContractAt("DailyRewardDistributor", QT_DISTRIBUTOR_ADDRESS);
    console.log("✅ Distributor contract loaded");
  } catch (error) {
    console.error("❌ Error: Could not load DailyRewardDistributor contract at", QT_DISTRIBUTOR_ADDRESS);
    console.log("\n💡 Possible issues:");
    console.log("   1. Contract not deployed yet - deploy it first");
    console.log("   2. Wrong contract address - check your .env file");
    console.log("   3. Contract not compiled - run: npx hardhat compile");
    process.exit(1);
  }
  
  // Create QT token contract instance manually
  const qtTokenABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
  ];
  
  // Get signer
  const [owner] = await ethers.getSigners();
  const qtToken = new ethers.Contract(QT_TOKEN_ADDRESS, qtTokenABI, owner);
  
  // Check owner's QT token balance
  const ownerBalance = await qtToken.balanceOf(owner.address);
  console.log("👤 Owner Balance:", ethers.formatEther(ownerBalance), "QT tokens");
  
  const depositAmount = ethers.parseUnits(DEPOSIT_AMOUNT, 18);
  
  if (ownerBalance < depositAmount) {
    throw new Error(`Insufficient QT token balance. Need ${DEPOSIT_AMOUNT} QT tokens, have ${ethers.formatEther(ownerBalance)}`);
  }
  
  // Verify this is actually a distributor contract by checking reward amount
  console.log("🔍 Verifying contract...");
  let rewardAmount;
  try {
    rewardAmount = await dailyRewardDistributor.REWARD_AMOUNT();
    console.log("✅ Contract verified - Reward Amount:", ethers.formatEther(rewardAmount), "QT tokens");
  } catch (error) {
    console.error("❌ Error: This address is not a valid DailyRewardDistributor contract!");
    console.log("   The contract at", QT_DISTRIBUTOR_ADDRESS, "does not have the expected functions.");
    console.log("\n💡 Please deploy a new contract:");
    console.log("   npx hardhat run scripts/deploy-daily-reward-distributor.cjs --network base");
    process.exit(1);
  }
  
  // Check current contract balance
  console.log("\n📊 Checking contract balance...");
  const contractBalanceBefore = await dailyRewardDistributor.getQTBalance();
  console.log("  Current Balance:", ethers.formatEther(contractBalanceBefore), "QT tokens");
  
  // Approve the distributor contract to spend QT tokens
  console.log("\n🔐 Approving QT token transfer...");
  const approveTx = await qtToken.approve(QT_DISTRIBUTOR_ADDRESS, depositAmount);
  await approveTx.wait();
  console.log("✅ Approval transaction:", approveTx.hash);
  
  // Deposit tokens to the contract
  console.log("\n💸 Depositing tokens to contract...");
  const depositTx = await dailyRewardDistributor.depositQTTokens(depositAmount);
  await depositTx.wait();
  console.log("✅ Deposit transaction:", depositTx.hash);
  
  // Verify deposit
  const contractBalanceAfter = await dailyRewardDistributor.getQTBalance();
  console.log("\n📊 Contract Balance After:", ethers.formatEther(contractBalanceAfter), "QT tokens");
  
  // Calculate how many daily claims this can support
  const dailyClaimsSupported = Number(contractBalanceAfter) / Number(rewardAmount);
  
  console.log("\n✅ Deposit Successful!");
  console.log("📈 Daily Claims Supported:", Math.floor(dailyClaimsSupported).toLocaleString(), "claims");
  console.log("📅 Estimated Duration:", Math.floor(dailyClaimsSupported / 1000).toLocaleString(), "days (at 1000 users/day)");
  
  console.log("\n🔗 View on BaseScan:");
  console.log(`   Contract: https://basescan.org/address/${QT_DISTRIBUTOR_ADDRESS}`);
  console.log(`   Deposit TX: https://basescan.org/tx/${depositTx.hash}`);
}

main()
  .then(() => {
    console.log("\n🎉 Deposit completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deposit failed:", error);
    process.exit(1);
  });

