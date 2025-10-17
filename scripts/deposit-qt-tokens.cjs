const { ethers } = require("hardhat");

async function main() {
  const QT_DISTRIBUTOR_ADDRESS = process.env.QT_DISTRIBUTOR_ADDRESS;
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS;
  const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT || "1000000"; // 1M QT tokens by default
  
  if (!QT_DISTRIBUTOR_ADDRESS || !QT_TOKEN_ADDRESS) {
    throw new Error("QT_DISTRIBUTOR_ADDRESS and QT_TOKEN_ADDRESS environment variables are required");
  }
  
  console.log("💰 Depositing QT tokens to distributor contract...");
  console.log("📍 Distributor Address:", QT_DISTRIBUTOR_ADDRESS);
  console.log("🪙 QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("💵 Deposit Amount:", DEPOSIT_AMOUNT, "QT tokens");
  
  // Get contract instances
  const qtDistributor = await ethers.getContractAt("QTRewardDistributor", QT_DISTRIBUTOR_ADDRESS);
  
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
  
  // Approve the distributor contract to spend QT tokens
  console.log("🔐 Approving QT token transfer...");
  const approveTx = await qtToken.approve(QT_DISTRIBUTOR_ADDRESS, depositAmount);
  await approveTx.wait();
  console.log("✅ Approval transaction:", approveTx.hash);
  
  // Deposit QT tokens to the distributor contract
  console.log("💸 Depositing QT tokens...");
  const depositTx = await qtDistributor.depositQTTokens(depositAmount);
  await depositTx.wait();
  console.log("✅ Deposit transaction:", depositTx.hash);
  
  // Check new contract balance
  const newBalance = await qtDistributor.getQTBalance();
  console.log("💰 New Contract Balance:", ethers.formatEther(newBalance), "QT tokens");
  
  // Calculate how many rewards can be distributed
  const rewardAmount = await qtDistributor.REWARD_AMOUNT();
  const maxRewards = newBalance / rewardAmount;
  console.log("🎁 Max Rewards Available:", maxRewards.toString());
  
  console.log("\n✅ Deposit successful!");
  console.log("🎉 Contract is ready to distribute QT token rewards!");
  
  return {
    depositAmount: DEPOSIT_AMOUNT,
    newBalance: ethers.formatEther(newBalance),
    maxRewards: maxRewards.toString(),
    depositTx: depositTx.hash
  };
}

main()
  .then((result) => {
    console.log("\n📊 Deposit Summary:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deposit failed:", error);
    process.exit(1);
  });
