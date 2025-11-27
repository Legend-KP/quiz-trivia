const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying BetModeVault Contract to Base Mainnet...\n");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployment Details:");
  console.log("- Deployer Address:", deployer.address);
  console.log("- Deployer Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Get required addresses from environment
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_QT_TOKEN_ADDRESS;
  const ADMIN_SIGNER_ADDRESS = process.env.ADMIN_SIGNER_ADDRESS;
  
  if (!QT_TOKEN_ADDRESS) {
    throw new Error("❌ QT_TOKEN_ADDRESS environment variable is required");
  }
  
  if (!ADMIN_SIGNER_ADDRESS) {
    throw new Error("❌ ADMIN_SIGNER_ADDRESS environment variable is required");
  }
  
  // Validate addresses
  if (!ethers.isAddress(QT_TOKEN_ADDRESS)) {
    throw new Error("❌ Invalid QT_TOKEN_ADDRESS");
  }
  
  if (!ethers.isAddress(ADMIN_SIGNER_ADDRESS)) {
    throw new Error("❌ Invalid ADMIN_SIGNER_ADDRESS");
  }
  
  console.log("- QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("- Admin Signer Address:", ADMIN_SIGNER_ADDRESS);
  console.log("- Network: Base Mainnet (Chain ID: 8453)\n");
  
  // Verify deployer has enough ETH for gas
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance < ethers.parseEther("0.001")) {
    console.warn("⚠️  Warning: Deployer has low ETH balance. Make sure you have enough for gas fees.");
  }
  
  // Get the contract factory
  console.log("📦 Compiling contract...");
  const BetModeVault = await ethers.getContractFactory("contracts/BetModeVault.sol:BetModeVault");
  
  // Deploy the contract
  console.log("🚀 Deploying contract...");
  const betModeVault = await BetModeVault.deploy(QT_TOKEN_ADDRESS, ADMIN_SIGNER_ADDRESS);
  
  console.log("⏳ Waiting for deployment transaction to be mined...");
  await betModeVault.waitForDeployment();
  
  const contractAddress = await betModeVault.getAddress();
  
  console.log("\n✅ Deployment Successful!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 BaseScan:", `https://basescan.org/address/${contractAddress}`);
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  try {
    const qtTokenAddress = await betModeVault.qtToken();
    const adminSignerAddress = await betModeVault.adminSigner();
    const minDeposit = await betModeVault.MIN_DEPOSIT();
    const minWithdrawal = await betModeVault.MIN_WITHDRAWAL();
    
    console.log("✅ QT Token Address:", qtTokenAddress);
    console.log("✅ Admin Signer Address:", adminSignerAddress);
    console.log("✅ Min Deposit:", ethers.formatEther(minDeposit), "QT");
    console.log("✅ Min Withdrawal:", ethers.formatEther(minWithdrawal), "QT");
    
    // Verify owner
    const owner = await betModeVault.owner();
    console.log("✅ Owner:", owner);
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.warn("⚠️  Warning: Owner address doesn't match deployer address!");
    }
  } catch (error) {
    console.error("❌ Error verifying deployment:", error.message);
  }
  
  console.log("\n📝 Next Steps:");
  console.log("1. Update your .env.local file:");
  console.log(`   NEXT_PUBLIC_BET_MODE_VAULT_ADDRESS=${contractAddress}`);
  console.log(`   BET_MODE_VAULT_ADDRESS=${contractAddress}`);
  console.log("\n2. Update your Vercel environment variables:");
  console.log(`   NEXT_PUBLIC_BET_MODE_VAULT_ADDRESS=${contractAddress}`);
  console.log(`   BET_MODE_VAULT_ADDRESS=${contractAddress}`);
  console.log("\n3. Verify the contract on BaseScan:");
  console.log(`   npx hardhat verify --network base ${contractAddress} ${QT_TOKEN_ADDRESS} ${ADMIN_SIGNER_ADDRESS}`);
  console.log("\n4. Initialize event listeners in your backend");
  console.log("\n5. Test deposit/withdrawal flows");
  
  return contractAddress;
}

main()
  .then((address) => {
    console.log("\n🎉 Contract deployed successfully at:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });

