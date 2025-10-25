require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing signature-based contract...");
  
  // Contract address
  const contractAddress = "0x9bA64Ef81372f9A0dFB331eaA830B075162D1b66";
  
  // Get the contract factory
  const QuizTriviaSignature = await ethers.getContractFactory("QuizTriviaSignature");
  
  // Connect to the deployed contract
  const contract = QuizTriviaSignature.attach(contractAddress);
  
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Base Explorer:", `https://basescan.org/address/${contractAddress}`);
  
  try {
    // Test basic contract functions
    console.log("\n📊 Testing contract functions...");
    
    // Get owner
    const owner = await contract.owner();
    console.log("👤 Owner:", owner);
    
    // Get stats
    const stats = await contract.getStats();
    console.log("📈 Stats:", {
      total: stats.total.toString(),
      classic: stats.classic.toString(),
      time: stats.time.toString(),
      challenge: stats.challenge.toString()
    });
    
    // Test getMessageHash function
    const testUser = "0x1234567890123456789012345678901234567890";
    const testMode = 0; // CLASSIC
    const testTimestamp = Math.floor(Date.now() / 1000);
    const testNonce = 0;
    
    console.log("\n🔐 Testing getMessageHash...");
    const messageHash = await contract.getMessageHash(testUser, testMode, testTimestamp, testNonce);
    console.log("📝 Message Hash:", messageHash);
    
    // Test getUserNonce for a test address
    console.log("\n🔢 Testing getUserNonce...");
    const userNonce = await contract.getUserNonce(testUser);
    console.log("🔢 User Nonce:", userNonce.toString());
    
    console.log("\n✅ Contract is working correctly!");
    console.log("\n💡 The contract is deployed and functional.");
    console.log("   If you're still getting errors, check:");
    console.log("   1. Network connection (Base Mainnet)");
    console.log("   2. Wallet connection");
    console.log("   3. Contract address in wallet.ts");
    
  } catch (error) {
    console.error("❌ Contract test failed:", error);
    
    if (error.message?.includes("call revert exception")) {
      console.log("\n🔍 This might be a network issue. Try:");
      console.log("   1. Check if you're on Base Mainnet");
      console.log("   2. Verify the contract address");
      console.log("   3. Check your RPC connection");
    }
  }
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exitCode = 1;
});
