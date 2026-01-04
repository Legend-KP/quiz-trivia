require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Depositing QT tokens to Secure Spin Wheel Contract...\n");
  
  // Configuration
  const SPIN_WHEEL_CONTRACT = process.env.SPIN_WHEEL_CONTRACT_ADDRESS || 
                              process.env.NEXT_PUBLIC_SECURE_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS ||
                              "0x989C19818844dc34260076cFd79be97E1E3e320e";
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || "0x361faAea711B20caF59726e5f478D745C187cB07";
  const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT || "20000000"; // 20M QT tokens by default
  
  if (!SPIN_WHEEL_CONTRACT || SPIN_WHEEL_CONTRACT === "0x0000000000000000000000000000000000000000") {
    throw new Error("SPIN_WHEEL_CONTRACT_ADDRESS or NEXT_PUBLIC_SECURE_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS environment variable is required");
  }
  
  console.log("📋 Deposit Configuration:");
  console.log("- Spin Wheel Contract:", SPIN_WHEEL_CONTRACT);
  console.log("- QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("- Deposit Amount:", DEPOSIT_AMOUNT, "QT tokens");
  console.log("- Network: Base Mainnet\n");
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Depositing from address:", signer.address);
  
  // Get Spin Wheel contract
  const spinWheelABI = [
    "function owner() view returns (address)",
    "function depositQTTokens(uint256 amount) external",
    "function getQTBalanceReadable() view returns (uint256)",
    "function getQTBalance() view returns (uint256)"
  ];
  
  const spinWheelContract = await ethers.getContractAt(spinWheelABI, SPIN_WHEEL_CONTRACT, signer);
  
  // Check if signer is the owner
  console.log("\n🔍 Checking contract ownership...");
  const owner = await spinWheelContract.owner();
  console.log("✅ Contract owner:", owner);
  
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`❌ You are not the contract owner! Owner is: ${owner}`);
  }
  console.log("✅ You are the contract owner\n");
  
  // Get QT token contract (ERC20) for balance checking and approval
  const qtTokenABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];
  
  const qtToken = await ethers.getContractAt(qtTokenABI, QT_TOKEN_ADDRESS, signer);
  
  // Check current balances
  console.log("🔍 Checking balances...");
  const contractBalanceBefore = await spinWheelContract.getQTBalanceReadable();
  console.log("✅ Contract current balance:", contractBalanceBefore.toString(), "QT");
  
  const signerBalance = await qtToken.balanceOf(signer.address);
  const signerBalanceReadable = ethers.formatEther(signerBalance);
  console.log("✅ Your QT balance:", signerBalanceReadable, "QT");
  
  // Convert deposit amount to wei (18 decimals)
  const depositAmountWei = ethers.parseEther(DEPOSIT_AMOUNT);
  
  // Check if signer has enough balance
  if (signerBalance < depositAmountWei) {
    throw new Error(
      `❌ Insufficient QT token balance! ` +
      `You have ${signerBalanceReadable} QT but need ${DEPOSIT_AMOUNT} QT`
    );
  }
  
  // Check current allowance
  const currentAllowance = await qtToken.allowance(signer.address, SPIN_WHEEL_CONTRACT);
  console.log("✅ Current allowance:", ethers.formatEther(currentAllowance), "QT");
  
  // Approve if needed
  if (currentAllowance < depositAmountWei) {
    console.log("\n🔐 Approving QT token transfer...");
    const approveTx = await qtToken.approve(SPIN_WHEEL_CONTRACT, depositAmountWei);
    console.log("📝 Approval transaction:", approveTx.hash);
    console.log("⏳ Waiting for confirmation...");
    await approveTx.wait();
    console.log("✅ Approval confirmed!");
  } else {
    console.log("✅ Sufficient allowance already exists");
  }
  
  // Deposit tokens
  console.log("\n💸 Depositing QT tokens to contract...");
  console.log("   Amount:", DEPOSIT_AMOUNT, "QT tokens");
  const depositTx = await spinWheelContract.depositQTTokens(depositAmountWei);
  console.log("📝 Deposit transaction:", depositTx.hash);
  console.log("⏳ Waiting for confirmation...");
  await depositTx.wait();
  console.log("✅ Deposit confirmed!");
  
  // Verify new balances
  const contractBalanceAfter = await spinWheelContract.getQTBalanceReadable();
  const signerBalanceAfter = await qtToken.balanceOf(signer.address);
  const signerBalanceAfterReadable = ethers.formatEther(signerBalanceAfter);
  
  console.log("\n✅ Updated balances:");
  console.log("   Contract balance (before):", contractBalanceBefore.toString(), "QT");
  console.log("   Contract balance (after):", contractBalanceAfter.toString(), "QT");
  console.log("   Your QT balance (after):", signerBalanceAfterReadable, "QT");
  
  const depositedAmount = BigInt(contractBalanceAfter) - BigInt(contractBalanceBefore);
  console.log("   Amount deposited:", depositedAmount.toString(), "QT");
  
  console.log("\n🎉 Deposit complete!");
  console.log("📝 Transaction hash:", depositTx.hash);
  console.log("🔗 View on BaseScan:", `https://basescan.org/tx/${depositTx.hash}`);
  console.log("📍 Contract address:", SPIN_WHEEL_CONTRACT);
  console.log("🔗 Contract on BaseScan:", `https://basescan.org/address/${SPIN_WHEEL_CONTRACT}`);
  
  // Calculate capacity
  const avgReward = 770; // Average reward per spin (weighted average)
  const totalSpins = Math.floor(Number(contractBalanceAfter) / avgReward);
  console.log("\n📊 Contract Capacity:");
  console.log("   Total balance:", contractBalanceAfter.toString(), "QT");
  console.log("   Average reward per spin: ~", avgReward, "QT");
  console.log("   Estimated spins supported:", totalSpins.toLocaleString());
  
  return {
    contractAddress: SPIN_WHEEL_CONTRACT,
    amountDeposited: DEPOSIT_AMOUNT,
    newContractBalance: contractBalanceAfter.toString(),
    txHash: depositTx.hash,
  };
}

main()
  .then((result) => {
    console.log("\n✅ Successfully deposited tokens!");
    console.log("Contract:", result.contractAddress);
    console.log("Amount:", result.amountDeposited, "QT");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deposit failed:", error);
    process.exit(1);
  });

