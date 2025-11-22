const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  console.log("💰 Funding BetModeVault Contract with QT Tokens...\n");
  
  // Configuration
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_QT_TOKEN_ADDRESS || "0x541529ADB3f344128aa87917fd2926E7D240FB07";
  const BET_MODE_VAULT_ADDRESS = process.env.BET_MODE_VAULT_ADDRESS || process.env.NEXT_PUBLIC_BET_MODE_VAULT_ADDRESS || "0xD9DaF0183265cf600F0e2df6aD2dE4F0334B15B3";
  const AMOUNT_QT = 200_000_000; // 200 million QT tokens
  const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  
  // Get private key (support both WALLET_PRIVATE_KEY and PRIVATE_KEY)
  const privateKey = process.env.WALLET_PRIVATE_KEY || process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error("❌ WALLET_PRIVATE_KEY or PRIVATE_KEY environment variable is required");
  }
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("📋 Transfer Details:");
  console.log("- From (Platform Wallet):", wallet.address);
  console.log("- To (BetModeVault Contract):", BET_MODE_VAULT_ADDRESS);
  console.log("- QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("- Amount:", AMOUNT_QT.toLocaleString(), "QT tokens");
  console.log("- Network: Base Mainnet\n");
  
  // Check wallet balance
  const walletBalance = await provider.getBalance(wallet.address);
  console.log("💼 Wallet ETH Balance:", ethers.formatEther(walletBalance), "ETH");
  
  if (walletBalance < ethers.parseEther("0.001")) {
    console.warn("⚠️  Warning: Low ETH balance. Make sure you have enough for gas fees.");
  }
  
  // ERC20 Token ABI (minimal - just what we need)
  const tokenAbi = [
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
  ];
  
  const tokenContract = new ethers.Contract(QT_TOKEN_ADDRESS, tokenAbi, wallet);
  
  // Check QT token balance
  const qtBalance = await tokenContract.balanceOf(wallet.address);
  const qtBalanceFormatted = parseFloat(ethers.formatEther(qtBalance));
  
  console.log("💰 Wallet QT Balance:", qtBalanceFormatted.toLocaleString(), "QT");
  
  if (qtBalance < ethers.parseEther(AMOUNT_QT.toString())) {
    throw new Error(`❌ Insufficient QT balance. You have ${qtBalanceFormatted.toLocaleString()} QT, but need ${AMOUNT_QT.toLocaleString()} QT.`);
  }
  
  // Convert amount to Wei (18 decimals)
  const amountWei = ethers.parseEther(AMOUNT_QT.toString());
  
  console.log("\n🚀 Initiating transfer...");
  console.log("Amount (Wei):", amountWei.toString());
  
  // Transfer tokens
  console.log("\n📤 Sending transaction...");
  const tx = await tokenContract.transfer(BET_MODE_VAULT_ADDRESS, amountWei);
  
  console.log("⏳ Transaction Hash:", tx.hash);
  console.log("⏳ Waiting for confirmation...");
  
  const receipt = await tx.wait();
  
  if (!receipt.status) {
    throw new Error("❌ Transaction failed!");
  }
  
  console.log("\n✅ Transfer Successful!");
  console.log("📍 Transaction Hash:", receipt.hash);
  console.log("🔗 BaseScan:", `https://basescan.org/tx/${receipt.hash}`);
  
  // Verify transfer
  console.log("\n🔍 Verifying transfer...");
  const contractBalance = await tokenContract.balanceOf(BET_MODE_VAULT_ADDRESS);
  const contractBalanceFormatted = parseFloat(ethers.formatEther(contractBalance));
  
  console.log("✅ BetModeVault Contract Balance:", contractBalanceFormatted.toLocaleString(), "QT");
  console.log("✅ Contract Address:", BET_MODE_VAULT_ADDRESS);
  console.log("🔗 View on BaseScan:", `https://basescan.org/address/${BET_MODE_VAULT_ADDRESS}`);
  
  // Check wallet balance after transfer
  const newWalletBalance = await tokenContract.balanceOf(wallet.address);
  const newWalletBalanceFormatted = parseFloat(ethers.formatEther(newWalletBalance));
  console.log("💰 Remaining Wallet Balance:", newWalletBalanceFormatted.toLocaleString(), "QT");
  
  console.log("\n📝 Summary:");
  console.log(`- Transferred: ${AMOUNT_QT.toLocaleString()} QT`);
  console.log(`- Contract now has: ${contractBalanceFormatted.toLocaleString()} QT`);
  console.log(`- Your wallet has: ${newWalletBalanceFormatted.toLocaleString()} QT remaining`);
  
  return {
    success: true,
    txHash: receipt.hash,
    amount: AMOUNT_QT,
    contractBalance: contractBalanceFormatted,
  };
}

main()
  .then((result) => {
    console.log("\n🎉 Funding complete!");
    console.log("Transaction:", result.txHash);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Funding failed:", error.message);
    process.exit(1);
  });

