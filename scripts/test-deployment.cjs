require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Testing deployment configuration...");
  
  const contractAddress = "0x9bA64Ef81372f9A0dFB331eaA830B075162D1b66";
  
  try {
    // Test contract connection
    const QuizTriviaSignature = await ethers.getContractFactory("QuizTriviaSignature");
    const contract = QuizTriviaSignature.attach(contractAddress);
    
    console.log("✅ Contract factory loaded");
    console.log("📍 Contract Address:", contractAddress);
    
    // Test basic functions
    const owner = await contract.owner();
    console.log("👤 Owner:", owner);
    
    const stats = await contract.getStats();
    console.log("📊 Stats:", {
      total: stats.total.toString(),
      classic: stats.classic.toString(),
      time: stats.time.toString(),
      challenge: stats.challenge.toString()
    });
    
    // Test with a dummy address
    const testAddress = "0x1234567890123456789012345678901234567890";
    const nonce = await contract.getUserNonce(testAddress);
    console.log("🔢 Test nonce:", nonce.toString());
    
    // Test message hash generation
    const testMode = 0; // CLASSIC
    const testTimestamp = Math.floor(Date.now() / 1000);
    const messageHash = await contract.getMessageHash(testAddress, testMode, testTimestamp, nonce);
    console.log("📝 Message Hash:", messageHash);
    
    console.log("\n✅ All tests passed! Contract is ready for deployment.");
    console.log("🔗 Explorer: https://basescan.org/address/" + contractAddress);
    
  } catch (error) {
    console.error("❌ Deployment test failed:", error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
