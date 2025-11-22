const { run } = require("hardhat");
require("dotenv").config();

async function main() {
  const contractAddress = process.argv[2];
  const qtTokenAddress = process.argv[3];
  const adminSignerAddress = process.argv[4];
  
  if (!contractAddress || !qtTokenAddress || !adminSignerAddress) {
    console.error("❌ Usage: node scripts/verify-bet-mode-vault.cjs <CONTRACT_ADDRESS> <QT_TOKEN_ADDRESS> <ADMIN_SIGNER_ADDRESS>");
    process.exit(1);
  }
  
  console.log("🔍 Verifying BetModeVault contract on BaseScan...\n");
  console.log("Contract Address:", contractAddress);
  console.log("QT Token Address:", qtTokenAddress);
  console.log("Admin Signer Address:", adminSignerAddress);
  console.log("Network: Base Mainnet\n");
  
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [qtTokenAddress, adminSignerAddress],
      network: "base",
    });
    
    console.log("\n✅ Contract verified successfully!");
    console.log("🔗 View on BaseScan:", `https://basescan.org/address/${contractAddress}`);
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("\n✅ Contract is already verified!");
    } else {
      console.error("\n❌ Verification failed:", error.message);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

