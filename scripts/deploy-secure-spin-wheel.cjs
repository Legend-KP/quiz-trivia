require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🔒 Deploying Secure Spin Wheel QT Distributor Contract...\n");
  
  // Configuration
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || "0x361faAea711B20caF59726e5f478D745C187cB07";
  const BACKEND_SIGNER_ADDRESS = process.env.BACKEND_SIGNER_ADDRESS;
  
  if (!BACKEND_SIGNER_ADDRESS) {
    console.error("❌ BACKEND_SIGNER_ADDRESS environment variable is required");
    console.log("   This should be the address of the wallet that will sign claim requests.");
    console.log("   Generate a new wallet or use an existing one:");
    console.log("   BACKEND_SIGNER_ADDRESS=0xYourBackendSignerAddress");
    console.log("\n   ⚠️  IMPORTANT: Keep the private key for this address secure!");
    console.log("   Set BACKEND_SIGNER_PRIVATE_KEY in your .env file for backend API.");
    return;
  }
  
  // Check if we have a private key for deployment
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY not found in environment variables");
    console.log("   Please add your private key to .env file:");
    console.log("   PRIVATE_KEY=your_private_key_here");
    return;
  }
  
  console.log("📋 Deployment Configuration:");
  console.log("- QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("- Backend Signer Address:", BACKEND_SIGNER_ADDRESS);
  console.log("- Network: Base Mainnet\n");
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("👤 Deploying from address:", signer.address);
  
  // Deploy the contract
  console.log("\n📦 Deploying SecureSpinWheelQTDistributor...");
  const SecureSpinWheelQTDistributor = await ethers.getContractFactory("SecureSpinWheelQTDistributor");
  const contract = await SecureSpinWheelQTDistributor.deploy(
    QT_TOKEN_ADDRESS,
    BACKEND_SIGNER_ADDRESS
  );
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log("\n✅ Secure Spin Wheel Contract deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Base Explorer:", `https://basescan.org/address/${contractAddress}`);
  
  // Verify deployment
  try {
    const owner = await contract.owner();
    const backendSigner = await contract.backendSigner();
    const qtToken = await contract.qtToken();
    
    console.log("\n🔍 Contract Verification:");
    console.log("   Owner:", owner);
    console.log("   Backend Signer:", backendSigner);
    console.log("   QT Token:", qtToken);
    console.log("   ✅ All values match expected configuration");
  } catch (error) {
    console.log("⚠️  Could not verify contract state:", error.message);
  }
  
  console.log("\n📝 Next Steps:");
  console.log("1. Update environment variables:");
  console.log(`   NEXT_PUBLIC_SECURE_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS=${contractAddress}`);
  console.log(`   SPIN_WHEEL_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("\n2. Verify contract on BaseScan:");
  console.log(`   npx hardhat verify --network base ${contractAddress} "${QT_TOKEN_ADDRESS}" "${BACKEND_SIGNER_ADDRESS}"`);
  console.log("\n3. Fund the contract with QT tokens:");
  console.log(`   Use the depositQTTokens function or transfer QT tokens directly to: ${contractAddress}`);
  console.log("\n4. Update backend API to use signature service:");
  console.log("   - Set BACKEND_SIGNER_PRIVATE_KEY in .env");
  console.log("   - Update /api/currency/claim-daily route to generate signatures");
  console.log("\n5. Update frontend to use useSecureSpinWheelQTClaim hook");
  
  console.log("\n🎉 Deployment complete!");
  console.log("\n⚠️  SECURITY REMINDERS:");
  console.log("   - Keep BACKEND_SIGNER_PRIVATE_KEY secure and never commit it to git");
  console.log("   - The backend signer address must match the private key");
  console.log("   - Test the contract thoroughly before going live");
  console.log("   - Monitor for any suspicious activity");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

