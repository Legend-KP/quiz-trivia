const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing network connection...");
  
  try {
    // Get signers
    const signers = await ethers.getSigners();
    console.log("✅ Found", signers.length, "signer(s)");
    
    if (signers.length > 0) {
      const signer = signers[0];
      const address = await signer.getAddress();
      console.log("📍 Signer address:", address);
      
      // Get balance
      const balance = await signer.provider.getBalance(address);
      console.log("💰 Balance:", ethers.utils.formatEther(balance), "ETH");
      
      if (balance.eq(0)) {
        console.log("⚠️  Warning: Balance is 0. You need Base Sepolia ETH to deploy.");
        console.log("   Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
      }
    } else {
      console.log("❌ No signers found. Check your private key in .env file.");
    }
    
    // Test network
    const network = await ethers.provider.getNetwork();
    console.log("🌐 Network:", network.name, "(Chain ID:", network.chainId.toString() + ")");
    
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exitCode = 1;
});
