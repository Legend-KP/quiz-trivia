const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Master Script: Deploy and Fund All Contracts
 * 
 * This script will:
 * 1. Deploy BetModeVault (200M QT)
 * 2. Deploy SpinWheelQTDistributor (25M QT)
 * 3. Deploy DailyRewardDistributor (25M QT)
 * 4. Fund each contract with the specified amounts
 * 
 * Requirements:
 * - QT_TOKEN_ADDRESS (new token: 0x361faAea711B20caF59726e5f478D745C187cB07)
 * - ADMIN_SIGNER_ADDRESS (for BetModeVault)
 * - PRIVATE_KEY (wallet with QT tokens and ETH for gas)
 */

async function main() {
  console.log("🚀 Starting Deployment and Funding Process...\n");
  console.log("=" .repeat(60));
  
  // ===== CONFIGURATION =====
  const NEW_QT_TOKEN_ADDRESS = "0x361faAea711B20caF59726e5f478D745C187cB07";
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || NEW_QT_TOKEN_ADDRESS;
  const ADMIN_SIGNER_ADDRESS = process.env.ADMIN_SIGNER_ADDRESS;
  
  // Funding amounts (in QT tokens, without decimals)
  const BET_MODE_VAULT_AMOUNT = 200_000_000; // 200 million
  const SPIN_WHEEL_AMOUNT = 25_000_000; // 25 million
  const DAILY_REWARD_AMOUNT = 25_000_000; // 25 million
  
  // Validate environment
  if (!ADMIN_SIGNER_ADDRESS) {
    throw new Error("❌ ADMIN_SIGNER_ADDRESS environment variable is required for BetModeVault");
  }
  
  if (!ethers.isAddress(QT_TOKEN_ADDRESS)) {
    throw new Error("❌ Invalid QT_TOKEN_ADDRESS");
  }
  
  if (!ethers.isAddress(ADMIN_SIGNER_ADDRESS)) {
    throw new Error("❌ Invalid ADMIN_SIGNER_ADDRESS");
  }
  
  console.log("📋 Configuration:");
  console.log("  QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("  Admin Signer Address:", ADMIN_SIGNER_ADDRESS);
  console.log("  Network: Base Mainnet\n");
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer Address:", deployer.address);
  
  // Check balances
  const ethBalance = await ethers.provider.getBalance(deployer.address);
  console.log("  ETH Balance:", ethers.formatEther(ethBalance), "ETH");
  
  if (ethBalance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Warning: Low ETH balance. Make sure you have enough for gas fees.");
  }
  
  // ERC20 ABI for checking QT balance
  const erc20Abi = [
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ];
  
  const qtToken = new ethers.Contract(QT_TOKEN_ADDRESS, erc20Abi, deployer);
  const qtBalance = await qtToken.balanceOf(deployer.address);
  const qtBalanceFormatted = parseFloat(ethers.formatEther(qtBalance));
  
  console.log("  QT Balance:", qtBalanceFormatted.toLocaleString(), "QT");
  
  const totalNeeded = BET_MODE_VAULT_AMOUNT + SPIN_WHEEL_AMOUNT + DAILY_REWARD_AMOUNT;
  if (qtBalance < ethers.parseEther(totalNeeded.toString())) {
    throw new Error(
      `❌ Insufficient QT balance. Need ${totalNeeded.toLocaleString()} QT, have ${qtBalanceFormatted.toLocaleString()} QT`
    );
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📦 STEP 1: Deploying Contracts\n");
  
  // ===== DEPLOY BET MODE VAULT =====
  console.log("1️⃣  Deploying BetModeVault...");
  const BetModeVault = await ethers.getContractFactory("contracts/BetModeVault.sol:BetModeVault");
  const betModeVault = await BetModeVault.deploy(QT_TOKEN_ADDRESS, ADMIN_SIGNER_ADDRESS);
  await betModeVault.waitForDeployment();
  const betModeVaultAddress = await betModeVault.getAddress();
  console.log("   ✅ BetModeVault deployed:", betModeVaultAddress);
  console.log("   🔗 BaseScan:", `https://basescan.org/address/${betModeVaultAddress}\n`);
  
  // ===== DEPLOY SPIN WHEEL QT DISTRIBUTOR =====
  console.log("2️⃣  Deploying SpinWheelQTDistributor...");
  const SpinWheelQTDistributor = await ethers.getContractFactory("SpinWheelQTDistributor");
  const spinWheelDistributor = await SpinWheelQTDistributor.deploy(QT_TOKEN_ADDRESS);
  await spinWheelDistributor.waitForDeployment();
  const spinWheelAddress = await spinWheelDistributor.getAddress();
  console.log("   ✅ SpinWheelQTDistributor deployed:", spinWheelAddress);
  console.log("   🔗 BaseScan:", `https://basescan.org/address/${spinWheelAddress}\n`);
  
  // ===== DEPLOY DAILY REWARD DISTRIBUTOR =====
  console.log("3️⃣  Deploying DailyRewardDistributor...");
  const DailyRewardDistributor = await ethers.getContractFactory("DailyRewardDistributor");
  const dailyRewardDistributor = await DailyRewardDistributor.deploy(QT_TOKEN_ADDRESS);
  await dailyRewardDistributor.waitForDeployment();
  const dailyRewardAddress = await dailyRewardDistributor.getAddress();
  console.log("   ✅ DailyRewardDistributor deployed:", dailyRewardAddress);
  console.log("   🔗 BaseScan:", `https://basescan.org/address/${dailyRewardAddress}\n`);
  
  console.log("=".repeat(60));
  console.log("💰 STEP 2: Funding Contracts\n");
  
  // ===== FUND BET MODE VAULT =====
  console.log("1️⃣  Funding BetModeVault with", BET_MODE_VAULT_AMOUNT.toLocaleString(), "QT...");
  const betModeAmount = ethers.parseEther(BET_MODE_VAULT_AMOUNT.toString());
  const tx1 = await qtToken.transfer(betModeVaultAddress, betModeAmount);
  await tx1.wait();
  console.log("   ✅ Transaction:", tx1.hash);
  console.log("   🔗 BaseScan:", `https://basescan.org/tx/${tx1.hash}\n`);
  
  // ===== FUND SPIN WHEEL =====
  console.log("2️⃣  Funding SpinWheelQTDistributor with", SPIN_WHEEL_AMOUNT.toLocaleString(), "QT...");
  const spinWheelAmount = ethers.parseEther(SPIN_WHEEL_AMOUNT.toString());
  
  // Approve first
  const approveTx1 = await qtToken.approve(spinWheelAddress, spinWheelAmount);
  await approveTx1.wait();
  
  // Deposit using contract's depositQTTokens function (expects amount WITHOUT decimals)
  const spinWheelAbi = ["function depositQTTokens(uint256 amount)"];
  const spinWheelContract = new ethers.Contract(spinWheelAddress, spinWheelAbi, deployer);
  const depositTx1 = await spinWheelContract.depositQTTokens(SPIN_WHEEL_AMOUNT);
  await depositTx1.wait();
  console.log("   ✅ Transaction:", depositTx1.hash);
  console.log("   🔗 BaseScan:", `https://basescan.org/tx/${depositTx1.hash}\n`);
  
  // ===== FUND DAILY REWARD =====
  console.log("3️⃣  Funding DailyRewardDistributor with", DAILY_REWARD_AMOUNT.toLocaleString(), "QT...");
  const dailyRewardAmount = ethers.parseEther(DAILY_REWARD_AMOUNT.toString());
  
  // Approve first
  const approveTx2 = await qtToken.approve(dailyRewardAddress, dailyRewardAmount);
  await approveTx2.wait();
  
  // Deposit using contract's depositQTTokens function (expects amount in wei)
  const dailyRewardAbi = ["function depositQTTokens(uint256 amount)"];
  const dailyRewardContract = new ethers.Contract(dailyRewardAddress, dailyRewardAbi, deployer);
  const depositTx2 = await dailyRewardContract.depositQTTokens(dailyRewardAmount);
  await depositTx2.wait();
  console.log("   ✅ Transaction:", depositTx2.hash);
  console.log("   🔗 BaseScan:", `https://basescan.org/tx/${depositTx2.hash}\n`);
  
  // ===== VERIFY BALANCES =====
  console.log("=".repeat(60));
  console.log("🔍 STEP 3: Verifying Contract Balances\n");
  
  const betModeBalance = await qtToken.balanceOf(betModeVaultAddress);
  console.log("✅ BetModeVault Balance:", parseFloat(ethers.formatEther(betModeBalance)).toLocaleString(), "QT");
  
  const spinWheelBalanceRaw = await spinWheelDistributor.getQTBalance();
  const spinWheelBalance = parseFloat(ethers.formatEther(spinWheelBalanceRaw));
  console.log("✅ SpinWheelQTDistributor Balance:", spinWheelBalance.toLocaleString(), "QT");
  
  const dailyRewardBalance = await dailyRewardDistributor.getQTBalance();
  console.log("✅ DailyRewardDistributor Balance:", parseFloat(ethers.formatEther(dailyRewardBalance)).toLocaleString(), "QT");
  
  // ===== OUTPUT ENV VARIABLES =====
  console.log("\n" + "=".repeat(60));
  console.log("📝 ENVIRONMENT VARIABLES FOR .env FILE\n");
  console.log("# New QT Token Address");
  console.log(`QT_TOKEN_ADDRESS=${QT_TOKEN_ADDRESS}`);
  console.log(`NEXT_PUBLIC_QT_TOKEN_ADDRESS=${QT_TOKEN_ADDRESS}\n`);
  
  console.log("# BetModeVault");
  console.log(`BET_MODE_VAULT_ADDRESS=${betModeVaultAddress}`);
  console.log(`NEXT_PUBLIC_BET_MODE_VAULT_ADDRESS=${betModeVaultAddress}\n`);
  
  console.log("# SpinWheelQTDistributor");
  console.log(`SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS=${spinWheelAddress}`);
  console.log(`NEXT_PUBLIC_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS=${spinWheelAddress}\n`);
  
  console.log("# DailyRewardDistributor");
  console.log(`DAILY_REWARD_DISTRIBUTOR_ADDRESS=${dailyRewardAddress}`);
  console.log(`NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS=${dailyRewardAddress}`);
  console.log(`QT_DISTRIBUTOR_ADDRESS=${dailyRewardAddress}\n`);
  
  console.log("=".repeat(60));
  console.log("✅ DEPLOYMENT AND FUNDING COMPLETE!\n");
  
  return {
    qtTokenAddress: QT_TOKEN_ADDRESS,
    betModeVault: betModeVaultAddress,
    spinWheelDistributor: spinWheelAddress,
    dailyRewardDistributor: dailyRewardAddress,
  };
}

main()
  .then((result) => {
    console.log("\n🎉 All contracts deployed and funded successfully!");
    console.log("\nContract Addresses:");
    console.log("  BetModeVault:", result.betModeVault);
    console.log("  SpinWheelQTDistributor:", result.spinWheelDistributor);
    console.log("  DailyRewardDistributor:", result.dailyRewardDistributor);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
