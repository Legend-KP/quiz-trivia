const { ethers } = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    console.log("❌ Please set CONTRACT_ADDRESS environment variable");
    console.log("   Example: CONTRACT_ADDRESS=0x123... npx hardhat run scripts/verify-contract.cjs --network baseSepolia");
    return;
  }
  
  console.log("🔍 Verifying contract at:", contractAddress);
  
  try {
    // Get the contract factory
    const QuizTriviaEntry = await ethers.getContractFactory("QuizTriviaEntry");
    
    // Connect to the deployed contract
    const contract = QuizTriviaEntry.attach(contractAddress);
    
    // Test contract functions
    console.log("📊 Testing contract functions...");
    
    // Get initial stats
    const stats = await contract.getStats();
    console.log("✅ Contract stats:", {
      total: stats.total.toString(),
      classic: stats.classic.toString(),
      time: stats.time.toString(),
      challenge: stats.challenge.toString()
    });
    
    // Get required fees
    const classicFee = await contract.getRequiredFee(0);
    const timeFee = await contract.getRequiredFee(1);
    const challengeFee = await contract.getRequiredFee(2);
    
    console.log("💰 Entry fees:");
    console.log("   Classic:", ethers.utils.formatEther(classicFee), "ETH");
    console.log("   Time Mode:", ethers.utils.formatEther(timeFee), "ETH");
    console.log("   Challenge:", ethers.utils.formatEther(challengeFee), "ETH");
    
    console.log("\n✅ Contract verification successful!");
    console.log("🔗 Contract is ready for use");
    
  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
    console.log("\n💡 Make sure:");
    console.log("   - Contract is deployed");
    console.log("   - CONTRACT_ADDRESS is correct");
    console.log("   - You're connected to the right network");
  }
}

main().catch((error) => {
  console.error("❌ Verification failed:", error);
  process.exitCode = 1;
});
