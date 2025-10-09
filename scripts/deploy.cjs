const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting QuizTriviaEntry deployment...");
  
  // Get the contract factory
  const QuizTriviaEntry = await ethers.getContractFactory("QuizTriviaEntry");
  
  // Deploy the contract
  console.log("📦 Deploying contract...");
  const contract = await QuizTriviaEntry.deploy();
  
  // Wait for deployment
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  
  console.log("✅ QuizTriviaEntry deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Base Sepolia Explorer:", `https://sepolia.basescan.org/address/${contractAddress}`);
  
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
}

// Run the deploy script
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
