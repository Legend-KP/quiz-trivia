const { ethers } = require("hardhat");

async function main() {
  const QT_DISTRIBUTOR_ADDRESS = process.env.QT_DISTRIBUTOR_ADDRESS || process.env.NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS;
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS;
  const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT || "100000000"; // 100M QT tokens by default
  
  if (!QT_DISTRIBUTOR_ADDRESS || !QT_TOKEN_ADDRESS) {
    throw new Error("QT_DISTRIBUTOR_ADDRESS and QT_TOKEN_ADDRESS environment variables are required");
  }
  
  console.log("💰 Depositing QT tokens to Daily Reward Distributor contract...");
  console.log("📍 Distributor Address:", QT_DISTRIBUTOR_ADDRESS);
  console.log("🪙 QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("💵 Deposit Amount:", DEPOSIT_AMOUNT, "QT tokens (100 Million)");
  
  // Get contract instances
  const dailyRewardDistributor = await ethers.getContractAt("DailyRewardDistributor", QT_DISTRIBUTOR_ADDRESS);
  
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
  
  // Check current contract balance
  const contractBalanceBefore = await dailyRewardDistributor.getQTBalance();
  console.log("📊 Contract Balance Before:", ethers.formatEther(contractBalanceBefore), "QT tokens");
  
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
  const rewardAmount = await dailyRewardDistributor.REWARD_AMOUNT();
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

