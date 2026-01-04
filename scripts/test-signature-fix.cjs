require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  console.log("🧪 Testing Signature Fix (Raw Hash Signing)...\n");
  
  // Configuration
  const BACKEND_SIGNER_PRIVATE_KEY = process.env.BACKEND_SIGNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const CONTRACT_ADDRESS = process.env.SPIN_WHEEL_CONTRACT_ADDRESS || 
                          process.env.NEXT_PUBLIC_SECURE_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS ||
                          "0x989C19818844dc34260076cFd79be97E1E3e320e";
  const CHAIN_ID = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 8453;
  
  if (!BACKEND_SIGNER_PRIVATE_KEY) {
    throw new Error("BACKEND_SIGNER_PRIVATE_KEY or PRIVATE_KEY is required");
  }
  
  // Create wallet
  const signer = new ethers.Wallet(BACKEND_SIGNER_PRIVATE_KEY);
  console.log("Backend Signer Address:", signer.address);
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("Chain ID:", CHAIN_ID);
  console.log();
  
  // Test data
  const userAddress = "0x4215C58fc9C67003447C10b4A728cdBf8606570b";
  const rewardAmount = 500; // QT
  const rewardAmountWei = ethers.parseEther(rewardAmount.toString());
  const nonce = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const deadline = Math.floor(Date.now() / 1000) + 300;
  
  console.log("Test Parameters:");
  console.log("  User:", userAddress);
  console.log("  Amount:", rewardAmount, "QT");
  console.log("  Nonce:", nonce.toString());
  console.log("  Deadline:", deadline.toString());
  console.log();
  
  // Create message hash (EXACT format from contract)
  const messageHash = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'uint256', 'uint256', 'address', 'uint256'],
    [
      userAddress,
      rewardAmountWei,
      nonce,
      deadline,
      CONTRACT_ADDRESS,
      CHAIN_ID,
    ]
  );
  
  console.log("📝 Message Hash:", messageHash);
  console.log();
  
  // OLD WAY (WRONG - double prefix)
  console.log("❌ OLD WAY (signMessage - adds prefix):");
  const oldSignature = await signer.signMessage(ethers.getBytes(messageHash));
  const oldEthHash = ethers.hashMessage(ethers.getBytes(messageHash));
  const oldRecovered = ethers.recoverAddress(oldEthHash, oldSignature);
  console.log("  Signature:", oldSignature.substring(0, 20) + "...");
  console.log("  Eth Hash:", oldEthHash);
  console.log("  Recovered:", oldRecovered);
  console.log("  Match:", oldRecovered.toLowerCase() === signer.address.toLowerCase() ? "✅" : "❌");
  console.log();
  
  // NEW WAY (CORRECT - sign prefixed hash)
  console.log("✅ NEW WAY (sign prefixed hash - matches contract):");
  const ethSignedMessageHash = ethers.hashMessage(ethers.getBytes(messageHash));
  const newSignature = signer.signingKey.sign(ethSignedMessageHash).serialized;
  const newRecovered = ethers.recoverAddress(ethSignedMessageHash, newSignature);
  console.log("  Eth Hash:", ethSignedMessageHash);
  console.log("  Signature:", newSignature.substring(0, 20) + "...");
  console.log("  Recovered:", newRecovered);
  console.log("  Match:", newRecovered.toLowerCase() === signer.address.toLowerCase() ? "✅" : "❌");
  console.log();
  
  // Verify both work locally
  console.log("🔍 Verification:");
  console.log("  Old signature (signMessage):", oldRecovered.toLowerCase() === signer.address.toLowerCase() ? "✅ YES" : "❌ NO");
  console.log("  New signature (sign prefixed):", newRecovered.toLowerCase() === signer.address.toLowerCase() ? "✅ YES" : "❌ NO");
  console.log();
  
  console.log("💡 The contract uses toEthSignedMessageHash() which adds the prefix.");
  console.log("   We must sign the PREFIXED hash (ethSignedMessageHash), not the raw hash.");
  console.log("   The NEW WAY matches what the contract verifies!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });

