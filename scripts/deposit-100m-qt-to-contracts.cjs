const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Depositing 100M QT Tokens to Spin the Wheel and Daily Claim Contracts...\n");
  
  // Contract addresses
  const SPIN_WHEEL_CONTRACT = "0xE50f8F6631520f1D075cF3636F6A04c3999BcDcB"; // Updated correct address
  const DAILY_REWARD_CONTRACT = "0xbC9e7dE46aA15eA26ba88aD87B76f6fa2EcCD4eD";
  const QT_TOKEN_ADDRESS = "0x361faAea711B20caF59726e5f478D745C187cB07";
  const DEPOSIT_AMOUNT = "100000000"; // 100 Million QT tokens
  
  console.log("📋 Configuration:");
  console.log("  🎰 Spin the Wheel Contract:", SPIN_WHEEL_CONTRACT);
  console.log("  📅 Daily Claim Contract:", DAILY_REWARD_CONTRACT);
  console.log("  🪙 QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("  💵 Amount per contract:", DEPOSIT_AMOUNT, "QT (100 Million)");
  console.log("  💰 Total to deposit:", (parseInt(DEPOSIT_AMOUNT) * 2).toLocaleString(), "QT (200 Million)\n");
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Funding from address:", signer.address);
  
  // Get QT token contract
  const qtTokenABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  
  const qtToken = await ethers.getContractAt(qtTokenABI, QT_TOKEN_ADDRESS, signer);
  
  // Check signer balance
  console.log("\n🔍 Checking balances...");
  const signerBalance = await qtToken.balanceOf(signer.address);
  const signerBalanceReadable = ethers.formatEther(signerBalance);
  console.log("✅ Your QT balance:", signerBalanceReadable, "QT");
  
  const totalNeeded = ethers.parseEther((parseInt(DEPOSIT_AMOUNT) * 2).toString());
  if (signerBalance < totalNeeded) {
    throw new Error(`Insufficient balance. You have ${signerBalanceReadable} QT but need ${(parseInt(DEPOSIT_AMOUNT) * 2).toLocaleString()} QT`);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("1️⃣  FUNDING SPIN THE WHEEL CONTRACT");
  console.log("=".repeat(70));
  
  // ===== FUND SPIN WHEEL CONTRACT =====
  const spinWheelABI = [
    "function depositQTTokens(uint256 amount)",
    "function getQTBalanceReadable() view returns (uint256)",
    "function getQTBalance() view returns (uint256)",
    "function owner() view returns (address)"
  ];
  
  // Check contract owner and verify QT token address
  const spinWheelABIWithToken = [
    ...spinWheelABI,
    "function qtToken() view returns (address)"
  ];
  const spinWheelContractFull = await ethers.getContractAt(spinWheelABIWithToken, SPIN_WHEEL_CONTRACT, signer);
  const spinWheelContract = spinWheelContractFull; // Use the full ABI version
  
  // Check contract owner
  const spinWheelOwner = await spinWheelContract.owner();
  console.log("👑 Contract owner:", spinWheelOwner);
  if (spinWheelOwner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`❌ You are not the owner of the Spin Wheel contract!\n   Owner: ${spinWheelOwner}\n   Your address: ${signer.address}\n   Please use the owner's private key.`);
  }
  
  // Verify contract's QT token address
  const contractQtTokenAddress = await spinWheelContract.qtToken();
  console.log("🪙 Contract's QT token address:", contractQtTokenAddress);
  if (contractQtTokenAddress.toLowerCase() !== QT_TOKEN_ADDRESS.toLowerCase()) {
    console.warn(`⚠️  WARNING: Contract's QT token address doesn't match!`);
    console.warn(`   Contract expects: ${contractQtTokenAddress}`);
    console.warn(`   We're using: ${QT_TOKEN_ADDRESS}`);
    console.warn(`   This contract was deployed with a different QT token.`);
    console.warn(`   You may need to deploy a new contract or use the old token address.`);
    throw new Error(`Contract QT token mismatch. Contract uses ${contractQtTokenAddress} but we're trying to use ${QT_TOKEN_ADDRESS}`);
  }
  
  // Check current balance
  try {
    const currentBalance = await spinWheelContract.getQTBalanceReadable();
    console.log("📊 Current balance:", currentBalance.toString(), "QT");
  } catch (e) {
    const currentBalance = await spinWheelContract.getQTBalance();
    console.log("📊 Current balance:", ethers.formatEther(currentBalance), "QT");
  }
  
  // Calculate amount with decimals for approval
  const spinWheelAmountWithDecimals = ethers.parseEther(DEPOSIT_AMOUNT);
  
  // Check and approve - reset allowance first to avoid any issues
  console.log("\n🔐 Checking allowance...");
  const spinWheelAllowance = await qtToken.allowance(signer.address, SPIN_WHEEL_CONTRACT);
  console.log("   Current allowance:", ethers.formatEther(spinWheelAllowance), "QT");
  
  // Always set a fresh approval to ensure it's correct
  console.log("⏳ Setting fresh approval for Spin Wheel contract...");
  const approveTx1 = await qtToken.approve(SPIN_WHEEL_CONTRACT, spinWheelAmountWithDecimals);
  console.log("📝 Approval transaction:", approveTx1.hash);
  console.log("⏳ Waiting for confirmation (2 blocks)...");
  await approveTx1.wait(2); // Wait for 2 confirmations
  console.log("✅ Approval confirmed!");
  
  // Wait a bit more for the approval to fully propagate
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Wait a moment for approval to process
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Double-check allowance and balance before deposit
  const finalAllowance = await qtToken.allowance(signer.address, SPIN_WHEEL_CONTRACT);
  const finalBalance = await qtToken.balanceOf(signer.address);
  console.log("🔍 Final allowance check:", ethers.formatEther(finalAllowance), "QT");
  console.log("🔍 Final balance check:", ethers.formatEther(finalBalance), "QT");
  if (finalAllowance < spinWheelAmountWithDecimals) {
    throw new Error(`Insufficient allowance. Need ${ethers.formatEther(spinWheelAmountWithDecimals)} QT but have ${ethers.formatEther(finalAllowance)} QT`);
  }
  if (finalBalance < spinWheelAmountWithDecimals) {
    throw new Error(`Insufficient balance. Need ${ethers.formatEther(spinWheelAmountWithDecimals)} QT but have ${ethers.formatEther(finalBalance)} QT`);
  }
  
  // Deposit to Spin Wheel (amount WITHOUT decimals - contract multiplies by 10^18)
  console.log("\n⏳ Depositing QT tokens to Spin Wheel contract...");
  console.log("   Amount (without decimals):", DEPOSIT_AMOUNT, "QT");
  console.log("   Amount (with decimals):", ethers.formatEther(spinWheelAmountWithDecimals), "QT");
  
  // Convert amount to BigInt to ensure proper handling
  const depositAmountBigInt = BigInt(DEPOSIT_AMOUNT);
  console.log("   Amount as BigInt:", depositAmountBigInt.toString());
  
  // Try static call first to get better error message
  try {
    await spinWheelContract.depositQTTokens.staticCall(depositAmountBigInt);
    console.log("✅ Static call succeeded - transaction should work");
  } catch (staticError) {
    console.error("❌ Static call failed:", staticError.message);
    if (staticError.data) {
      console.error("Error data:", staticError.data);
    }
    if (staticError.reason) {
      console.error("Error reason:", staticError.reason);
    }
    // Try to decode SafeERC20 error
    if (staticError.data && staticError.data.length > 10) {
      try {
        const errorSelector = staticError.data.slice(0, 10);
        console.error("Error selector:", errorSelector);
        // Common SafeERC20 error: SafeERC20FailedOperation
        if (errorSelector === "0xfb8f41b2") {
          console.error("❌ This is a SafeERC20FailedOperation error - transferFrom failed");
          console.error("   This usually means:");
          console.error("   1. Insufficient balance in your wallet");
          console.error("   2. Insufficient allowance (even if check passed)");
          console.error("   3. Token transfer reverted for another reason");
        }
      } catch (e) {
        // Ignore decode errors
      }
    }
    throw new Error(`Transaction will fail: ${staticError.message}`);
  }
  
  // Try to estimate gas
  try {
    const gasEstimate = await spinWheelContract.depositQTTokens.estimateGas(depositAmountBigInt);
    console.log("⛽ Estimated gas:", gasEstimate.toString());
  } catch (estimateError) {
    console.error("❌ Gas estimation also failed:", estimateError.message);
    throw estimateError;
  }
  
  const feeData1 = await ethers.provider.getFeeData();
  const gasPrice1 = feeData1.gasPrice ? (feeData1.gasPrice * 120n / 100n) : undefined;
  
  let depositTx1;
  try {
    depositTx1 = await spinWheelContract.depositQTTokens(depositAmountBigInt, {
      gasPrice: gasPrice1
    });
    console.log("📝 Deposit transaction:", depositTx1.hash);
    console.log("⏳ Waiting for confirmation...");
    await depositTx1.wait();
    console.log("✅ Deposit confirmed!");
  } catch (error) {
    console.error("❌ Deposit failed with error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.reason) {
      console.error("Error reason:", error.reason);
    }
    throw error;
  }
  
  // Verify new balance - check both contract method and direct token balance
  console.log("\n🔍 Verifying deposit...");
  try {
    const newBalance1 = await spinWheelContract.getQTBalanceReadable();
    console.log("✅ Contract balance (readable):", newBalance1.toString(), "QT");
  } catch (e) {
    try {
      const newBalance1 = await spinWheelContract.getQTBalance();
      console.log("✅ Contract balance:", ethers.formatEther(newBalance1), "QT");
    } catch (e2) {
      // Fallback: check balance directly from token contract
      const directBalance = await qtToken.balanceOf(SPIN_WHEEL_CONTRACT);
      console.log("✅ Contract balance (direct check):", ethers.formatEther(directBalance), "QT");
    }
  }
  console.log("🔗 View on BaseScan:", `https://basescan.org/tx/${depositTx1.hash}`);
  
  console.log("\n" + "=".repeat(70));
  console.log("2️⃣  FUNDING DAILY CLAIM CONTRACT");
  console.log("=".repeat(70));
  
  // ===== FUND DAILY REWARD CONTRACT =====
  const dailyRewardABI = [
    "function depositQTTokens(uint256 amount)",
    "function getQTBalance() view returns (uint256)",
    "function owner() view returns (address)",
    "function qtToken() view returns (address)"
  ];
  
  const dailyRewardContract = await ethers.getContractAt(dailyRewardABI, DAILY_REWARD_CONTRACT, signer);
  
  // Check contract owner
  const dailyRewardOwner = await dailyRewardContract.owner();
  console.log("👑 Contract owner:", dailyRewardOwner);
  if (dailyRewardOwner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`❌ You are not the owner of the Daily Reward contract!\n   Owner: ${dailyRewardOwner}\n   Your address: ${signer.address}\n   Please use the owner's private key.`);
  }
  
  // Verify contract's QT token address
  const dailyRewardQtTokenAddress = await dailyRewardContract.qtToken();
  console.log("🪙 Contract's QT token address:", dailyRewardQtTokenAddress);
  if (dailyRewardQtTokenAddress.toLowerCase() !== QT_TOKEN_ADDRESS.toLowerCase()) {
    console.warn(`⚠️  WARNING: Daily Reward contract's QT token address doesn't match!`);
    console.warn(`   Contract expects: ${dailyRewardQtTokenAddress}`);
    console.warn(`   We're using: ${QT_TOKEN_ADDRESS}`);
    throw new Error(`Daily Reward contract QT token mismatch. Contract uses ${dailyRewardQtTokenAddress} but we're trying to use ${QT_TOKEN_ADDRESS}`);
  }
  
  // Check current balance
  const currentBalance2 = await dailyRewardContract.getQTBalance();
  console.log("📊 Current balance:", ethers.formatEther(currentBalance2), "QT");
  
  // Calculate amount with decimals (DailyRewardDistributor expects amount WITH decimals)
  const dailyRewardAmountWithDecimals = ethers.parseEther(DEPOSIT_AMOUNT);
  
  // Check and approve
  console.log("\n🔐 Checking allowance...");
  const dailyRewardAllowance = await qtToken.allowance(signer.address, DAILY_REWARD_CONTRACT);
  
  if (dailyRewardAllowance < dailyRewardAmountWithDecimals) {
    console.log("⏳ Approving Daily Reward contract to spend QT tokens...");
    const approveTx2 = await qtToken.approve(DAILY_REWARD_CONTRACT, dailyRewardAmountWithDecimals);
    console.log("📝 Approval transaction:", approveTx2.hash);
    console.log("⏳ Waiting for confirmation...");
    await approveTx2.wait();
    console.log("✅ Approval confirmed!");
  } else {
    console.log("✅ Sufficient allowance already set");
  }
  
  // Wait a moment for approval to process
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Deposit to Daily Reward (amount WITH decimals)
  console.log("\n⏳ Depositing QT tokens to Daily Reward contract...");
  const feeData2 = await ethers.provider.getFeeData();
  const gasPrice2 = feeData2.gasPrice ? (feeData2.gasPrice * 120n / 100n) : undefined;
  
  const depositTx2 = await dailyRewardContract.depositQTTokens(dailyRewardAmountWithDecimals, {
    gasPrice: gasPrice2
  });
  console.log("📝 Deposit transaction:", depositTx2.hash);
  console.log("⏳ Waiting for confirmation...");
  await depositTx2.wait();
  console.log("✅ Deposit confirmed!");
  
  // Verify new balance
  const newBalance2 = await dailyRewardContract.getQTBalance();
  console.log("✅ New balance:", ethers.formatEther(newBalance2), "QT");
  console.log("🔗 View on BaseScan:", `https://basescan.org/tx/${depositTx2.hash}`);
  
  console.log("\n" + "=".repeat(70));
  console.log("✅ FUNDING COMPLETE!");
  console.log("=".repeat(70));
  console.log("\n📊 Summary:");
  console.log("  🎰 Spin the Wheel: 100,000,000 QT deposited");
  console.log("  📅 Daily Claim: 100,000,000 QT deposited");
  console.log("  💰 Total deposited: 200,000,000 QT");
  console.log("\n🔗 Contract Links:");
  console.log("  Spin Wheel: https://basescan.org/address/" + SPIN_WHEEL_CONTRACT);
  console.log("  Daily Claim: https://basescan.org/address/" + DAILY_REWARD_CONTRACT);
}

main()
  .then(() => {
    console.log("\n🎉 All deposits completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deposit failed:", error);
    process.exit(1);
  });

