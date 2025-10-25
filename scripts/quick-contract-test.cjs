require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Quick Contract Test...");
  
  const contractAddress = "0x9bA64Ef81372f9A0dFB331eaA830B075162D1b66";
  
  try {
    // Get contract
    const QuizTriviaSignature = await ethers.getContractFactory("QuizTriviaSignature");
    const contract = QuizTriviaSignature.attach(contractAddress);
    
    console.log("📍 Contract:", contractAddress);
    console.log("🔗 Explorer: https://basescan.org/address/" + contractAddress);
    
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
    
    console.log("✅ Contract is working!");
    
  } catch (error) {
    console.error("❌ Contract test failed:", error.message);
    
    if (error.message.includes("call revert exception")) {
      console.log("\n🔧 Possible fixes:");
      console.log("1. Check if contract is deployed on Base Mainnet");
      console.log("2. Verify contract address is correct");
      console.log("3. Check your RPC connection");
    }
  }
}

main().catch(console.error);
