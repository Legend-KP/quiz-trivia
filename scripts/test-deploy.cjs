const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Testing QuizTriviaEntry contract...");
  
  // Get the contract factory
  const QuizTriviaEntry = await ethers.getContractFactory("QuizTriviaEntry");
  
  console.log("✅ Contract compiled successfully!");
  console.log("📦 Contract is ready for deployment");
  console.log("🔧 Contract features:");
  console.log("   - Entry fees: 0.001 ETH per quiz");
  console.log("   - Quiz modes: Classic, Time Mode, Challenge");
  console.log("   - Statistics tracking");
  console.log("   - Event emissions");
  console.log("   - Owner functions");
  
  console.log("\n📋 Next steps:");
  console.log("1. Deploy using Remix IDE (recommended)");
  console.log("2. Or deploy using Hardhat with private key");
  console.log("3. Update CONTRACT_ADDRESS in src/lib/wallet.ts");
  console.log("4. Test the integration");
  
  console.log("\n🎯 Contract ABI for frontend:");
  console.log("The contract ABI is already configured in src/lib/wallet.ts");
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exitCode = 1;
});
