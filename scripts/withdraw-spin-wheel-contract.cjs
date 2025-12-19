const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Withdrawing QT tokens from Spin Wheel QT Distributor Contract...\n");
  
  // Contract addresses
  const SPIN_WHEEL_CONTRACT = process.env.SPIN_WHEEL_CONTRACT_ADDRESS || "0x8f8298D16dC4F192587e11a7a7C7F8c7F81A4C89";
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || "0x361faAea711B20caF59726e5f478D745C187cB07";
  // Amount to withdraw - if "all" or "0", withdraws entire balance
  const WITHDRAW_AMOUNT = process.env.WITHDRAW_AMOUNT || "all";
  
  if (!SPIN_WHEEL_CONTRACT || SPIN_WHEEL_CONTRACT === "0x0000000000000000000000000000000000000000") {
    throw new Error("SPIN_WHEEL_CONTRACT_ADDRESS environment variable is required");
  }
  
  console.log("📋 Withdrawal Details:");
  console.log("- Spin Wheel Contract:", SPIN_WHEEL_CONTRACT);
  console.log("- QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("- Withdraw Amount:", WITHDRAW_AMOUNT === "all" || WITHDRAW_AMOUNT === "0" ? "ALL (entire balance)" : `${WITHDRAW_AMOUNT} QT tokens`);
  console.log("- Network: Base Mainnet\n");
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Withdrawing to address:", signer.address);
  
  // Get Spin Wheel contract
  const spinWheelABI = [
    "function owner() view returns (address)",
    "function withdrawQTTokens(uint256 amount)",
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
  
  // Get QT token contract (ERC20) for balance checking
  const qtTokenABI = [
    "function balanceOf(address owner) view returns (uint256)"
  ];
  
  const qtToken = await ethers.getContractAt(qtTokenABI, QT_TOKEN_ADDRESS);
  
  // Check current balances
  console.log("🔍 Checking balances...");
  const contractBalance = await spinWheelContract.getQTBalanceReadable();
  console.log("✅ Contract current balance:", contractBalance.toString(), "QT");
  
  const signerBalanceBefore = await qtToken.balanceOf(signer.address);
  const signerBalanceBeforeReadable = ethers.formatEther(signerBalanceBefore);
  console.log("✅ Your QT balance (before):", signerBalanceBeforeReadable, "QT");
  
  // Determine withdrawal amount
  let amountToWithdraw;
  if (WITHDRAW_AMOUNT === "all" || WITHDRAW_AMOUNT === "0") {
    // Withdraw entire balance
    amountToWithdraw = contractBalance.toString();
    console.log("\n📊 Withdrawing entire contract balance:", amountToWithdraw, "QT");
  } else {
    // Withdraw specific amount
    amountToWithdraw = WITHDRAW_AMOUNT;
    const amountBigInt = BigInt(amountToWithdraw);
    const contractBalanceBigInt = BigInt(contractBalance.toString());
    
    if (amountBigInt > contractBalanceBigInt) {
      throw new Error(`❌ Insufficient contract balance! Contract has ${contractBalance.toString()} QT but you're trying to withdraw ${amountToWithdraw} QT`);
    }
    console.log("\n📊 Withdrawing specific amount:", amountToWithdraw, "QT");
  }
  
  // Withdraw tokens
  console.log("\n⏳ Withdrawing QT tokens from contract...");
  const withdrawTx = await spinWheelContract.withdrawQTTokens(amountToWithdraw);
  console.log("📝 Withdrawal transaction:", withdrawTx.hash);
  console.log("⏳ Waiting for confirmation...");
  await withdrawTx.wait();
  console.log("✅ Withdrawal confirmed!");
  
  // Verify new balances
  const newContractBalance = await spinWheelContract.getQTBalanceReadable();
  const signerBalanceAfter = await qtToken.balanceOf(signer.address);
  const signerBalanceAfterReadable = ethers.formatEther(signerBalanceAfter);
  
  console.log("\n✅ Updated balances:");
  console.log("   Contract balance:", newContractBalance.toString(), "QT");
  console.log("   Your QT balance (after):", signerBalanceAfterReadable, "QT");
  
  const withdrawnAmount = BigInt(signerBalanceAfter) - BigInt(signerBalanceBefore);
  console.log("   Amount withdrawn:", ethers.formatEther(withdrawnAmount), "QT");
  
  console.log("\n🎉 Withdrawal complete!");
  console.log("📝 Transaction hash:", withdrawTx.hash);
  console.log("🔗 View on BaseScan:", `https://basescan.org/tx/${withdrawTx.hash}`);
  
  return {
    contractAddress: SPIN_WHEEL_CONTRACT,
    amountWithdrawn: amountToWithdraw,
    txHash: withdrawTx.hash,
    newContractBalance: newContractBalance.toString(),
    newSignerBalance: signerBalanceAfterReadable
  };
}

main()
  .then((result) => {
    console.log("\n✅ Successfully withdrew tokens!");
    console.log("Contract:", result.contractAddress);
    console.log("Amount:", result.amountWithdrawn, "QT");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Withdrawal failed:", error);
    process.exit(1);
  });

