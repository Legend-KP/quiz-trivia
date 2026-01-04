require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  console.log("🧪 Testing Spin Wheel Signature Generation...\n");
  
  // Configuration
  const BACKEND_SIGNER_PRIVATE_KEY = process.env.BACKEND_SIGNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const CONTRACT_ADDRESS = process.env.SPIN_WHEEL_CONTRACT_ADDRESS || 
                          process.env.NEXT_PUBLIC_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS ||
                          "0x989C19818844dc34260076cFd79be97E1E3e320e";
  const CHAIN_ID = process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID) : 8453;
  
  if (!BACKEND_SIGNER_PRIVATE_KEY) {
    throw new Error("BACKEND_SIGNER_PRIVATE_KEY or PRIVATE_KEY is required");
  }
  
  console.log("📋 Configuration:");
  console.log("- Contract Address:", CONTRACT_ADDRESS);
  console.log("- Chain ID:", CHAIN_ID);
  
  // Create wallet
  const signer = new ethers.Wallet(BACKEND_SIGNER_PRIVATE_KEY);
  console.log("- Backend Signer Address:", signer.address);
  console.log();
  
  // Test data
  const userAddress = "0x4215C58fc9C67003447C10b4A728cdBf8606570b";
  const rewardAmount = 500; // QT
  const rewardAmountWei = ethers.parseEther(rewardAmount.toString());
  const nonce = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const deadline = Math.floor(Date.now() / 1000) + 300;
  
  console.log("📝 Test Data:");
  console.log("- User Address:", userAddress);
  console.log("- Reward Amount:", rewardAmount, "QT");
  console.log("- Reward Amount (Wei):", rewardAmountWei.toString());
  console.log("- Nonce:", nonce);
  console.log("- Deadline:", deadline);
  console.log();
  
  // Create message hash (must match contract exactly)
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
  
  console.log("🔐 Message Hash:", messageHash);
  
  // Sign the message hash
  const signature = await signer.signMessage(ethers.getBytes(messageHash));
  console.log("✍️  Signature:", signature);
  console.log();
  
  // Verify signature
  console.log("✅ Verifying signature...");
  const recoveredAddress = ethers.verifyMessage(ethers.getBytes(messageHash), signature);
  console.log("- Recovered Address:", recoveredAddress);
  console.log("- Signer Address:", signer.address);
  console.log("- Match:", recoveredAddress.toLowerCase() === signer.address.toLowerCase() ? "✅ YES" : "❌ NO");
  console.log();
  
  // Simulate what the contract does
  console.log("🔍 Simulating contract verification...");
  const ethSignedMessageHash = ethers.hashMessage(ethers.getBytes(messageHash));
  console.log("- Ethereum Signed Message Hash:", ethSignedMessageHash);
  
  // Recover from signature using the ethSignedMessageHash
  const recoveredFromEthHash = ethers.recoverAddress(ethSignedMessageHash, signature);
  console.log("- Recovered from Eth Hash:", recoveredFromEthHash);
  console.log("- Match:", recoveredFromEthHash.toLowerCase() === signer.address.toLowerCase() ? "✅ YES" : "❌ NO");
  console.log();
  
  // Check contract backend signer
  console.log("📡 Checking contract backend signer...");
  const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  const contractABI = [
    "function backendSigner() view returns (address)"
  ];
  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
  
  try {
    const contractBackendSigner = await contract.backendSigner();
    console.log("- Contract Backend Signer:", contractBackendSigner);
    console.log("- Our Signer Address:", signer.address);
    console.log("- Match:", contractBackendSigner.toLowerCase() === signer.address.toLowerCase() ? "✅ YES" : "❌ NO");
    
    if (contractBackendSigner.toLowerCase() !== signer.address.toLowerCase()) {
      console.log("\n⚠️  WARNING: Backend signer address mismatch!");
      console.log("   The contract expects:", contractBackendSigner);
      console.log("   But your private key is for:", signer.address);
      console.log("   Update BACKEND_SIGNER_PRIVATE_KEY to match the contract's backendSigner");
    }
  } catch (error) {
    console.log("❌ Could not read contract backend signer:", error.message);
  }
  
  console.log("\n✅ Signature test complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });

