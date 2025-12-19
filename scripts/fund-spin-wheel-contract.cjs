const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Funding Spin Wheel QT Distributor Contract...\n");
  
  // Contract addresses
  const SPIN_WHEEL_CONTRACT = process.env.SPIN_WHEEL_CONTRACT_ADDRESS || "0x8f8298D16dC4F192587e11a7a7C7F8c7F81A4C89";
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || "0x361faAea711B20caF59726e5f478D745C187cB07";
  const AMOUNT_TO_DEPOSIT = process.env.DEPOSIT_AMOUNT || "1000000"; // 1 million QT (without decimals)
  
  if (!SPIN_WHEEL_CONTRACT || SPIN_WHEEL_CONTRACT === "0x0000000000000000000000000000000000000000") {
    throw new Error("SPIN_WHEEL_CONTRACT_ADDRESS environment variable is required");
  }
  
  console.log("📋 Funding Details:");
  console.log("- Spin Wheel Contract:", SPIN_WHEEL_CONTRACT);
  console.log("- QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("- Amount to Deposit:", AMOUNT_TO_DEPOSIT, "QT tokens");
  console.log("- Network: Base Mainnet\n");
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Funding from address:", signer.address);
  
  // Get QT token contract (ERC20)
  const qtTokenABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  
  const qtToken = await ethers.getContractAt(qtTokenABI, QT_TOKEN_ADDRESS, signer);
  
  // Get Spin Wheel contract
  const spinWheelABI = [
    "function depositQTTokens(uint256 amount)",
    "function getQTBalanceReadable() view returns (uint256)"
  ];
  
  const spinWheelContract = await ethers.getContractAt(spinWheelABI, SPIN_WHEEL_CONTRACT, signer);
  
  // Check current balance
  console.log("\n🔍 Checking balances...");
  const signerBalance = await qtToken.balanceOf(signer.address);
  const signerBalanceReadable = ethers.formatEther(signerBalance);
  console.log("✅ Your QT balance:", signerBalanceReadable, "QT");
  
  const contractBalance = await spinWheelContract.getQTBalanceReadable();
  console.log("✅ Contract current balance:", contractBalance.toString(), "QT");
  
  // Calculate amount with decimals
  const amountWithDecimals = ethers.parseEther(AMOUNT_TO_DEPOSIT);
  
  if (signerBalance < amountWithDecimals) {
    throw new Error(`Insufficient balance. You have ${signerBalanceReadable} QT but need ${AMOUNT_TO_DEPOSIT} QT`);
  }
  
  // Check allowance
  console.log("\n🔍 Checking allowance...");
  const currentAllowance = await qtToken.allowance(signer.address, SPIN_WHEEL_CONTRACT);
  const currentAllowanceReadable = ethers.formatEther(currentAllowance);
  console.log("Current allowance:", currentAllowanceReadable, "QT");
  
  // Approve if needed
  if (currentAllowance < amountWithDecimals) {
    console.log("\n⏳ Approving contract to spend QT tokens...");
    const approveTx = await qtToken.approve(SPIN_WHEEL_CONTRACT, amountWithDecimals);
    console.log("📝 Approval transaction:", approveTx.hash);
    console.log("⏳ Waiting for confirmation...");
    await approveTx.wait();
    console.log("✅ Approval confirmed!");
  } else {
    console.log("✅ Sufficient allowance already set");
  }
  
  // Deposit tokens
  console.log("\n⏳ Depositing QT tokens to contract...");
  console.log("   Waiting a moment for approval to fully process...");
  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
  
  // Get current gas price and add 20% for priority
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ? (feeData.gasPrice * 120n / 100n) : undefined;
  
  const depositTx = await spinWheelContract.depositQTTokens(AMOUNT_TO_DEPOSIT, {
    gasPrice: gasPrice
  });
  console.log("📝 Deposit transaction:", depositTx.hash);
  console.log("⏳ Waiting for confirmation...");
  await depositTx.wait();
  console.log("✅ Deposit confirmed!");
  
  // Verify new balance
  const newContractBalance = await spinWheelContract.getQTBalanceReadable();
  console.log("\n✅ Contract new balance:", newContractBalance.toString(), "QT");
  
  console.log("\n🎉 Funding complete!");
  console.log("📝 Transaction hash:", depositTx.hash);
  console.log("🔗 View on BaseScan:", `https://basescan.org/tx/${depositTx.hash}`);
  
  return {
    contractAddress: SPIN_WHEEL_CONTRACT,
    amountDeposited: AMOUNT_TO_DEPOSIT,
    txHash: depositTx.hash,
    newBalance: newContractBalance.toString()
  };
}

main()
  .then((result) => {
    console.log("\n✅ Successfully funded contract!");
    console.log("Contract:", result.contractAddress);
    console.log("Amount:", result.amountDeposited, "QT");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Funding failed:", error);
    process.exit(1);
  });
