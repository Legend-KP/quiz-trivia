require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting QuizTriviaSignature deployment to Base Mainnet...");
  
  // Check if we have a private key
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY not found in environment variables");
    console.log("   Please add your private key to .env file:");
    console.log("   PRIVATE_KEY=your_private_key_here");
    return;
  }
  
  // Get the contract factory
  const QuizTriviaSignature = await ethers.getContractFactory("QuizTriviaSignature");
  
  // Deploy the contract
  console.log("📦 Deploying signature-based contract to Base Mainnet...");
  const contract = await QuizTriviaSignature.deploy();
  
  // Wait for deployment
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  
  console.log("✅ QuizTriviaSignature deployed successfully to Base Mainnet!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Base Explorer:", `https://basescan.org/address/${contractAddress}`);
  console.log("💡 This contract uses signature-based authentication - NO PAYMENT REQUIRED!");
  
  // Verify the deployment by calling a view function
  try {
    const stats = await contract.getStats();
    console.log("📊 Initial Stats:", {
      total: stats.total.toString(),
      classic: stats.classic.toString(),
      time: stats.time.toString(),
      challenge: stats.challenge.toString()
    });
  } catch (error) {
    console.log("⚠️ Could not fetch initial stats:", error);
  }
  
  console.log("\n🎉 Deployment complete! Update CONTRACT_ADDRESS in src/lib/wallet.ts");
  console.log(`   export const CONTRACT_ADDRESS = '${contractAddress}';`);
  
  console.log("\n🔍 Next steps:");
  console.log("1. Update CONTRACT_ADDRESS in src/lib/wallet.ts");
  console.log("2. Verify contract on BaseScan:");
  console.log(`   npx hardhat verify --network base ${contractAddress}`);
  console.log("3. Test your app with: npm run dev");
  console.log("\n💡 Benefits of signature-based approach:");
  console.log("   - No payment required from users");
  console.log("   - Better user experience");
  console.log("   - Still maintains blockchain verification");
  console.log("   - Prevents replay attacks with nonces");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
