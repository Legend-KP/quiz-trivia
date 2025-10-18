const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const QT_DISTRIBUTOR_ADDRESS = process.env.QT_DISTRIBUTOR_ADDRESS;
  const TEST_USER_ADDRESS = "0x1234567890123456789012345678901234567890"; // Test address
  
  if (!QT_DISTRIBUTOR_ADDRESS) {
    throw new Error("QT_DISTRIBUTOR_ADDRESS environment variable is required");
  }

  console.log("🧪 Testing QT Token Claim Function...");
  console.log("📍 Contract Address:", QT_DISTRIBUTOR_ADDRESS);
  console.log("👤 Test User Address:", TEST_USER_ADDRESS);

  // Get contract instance
  const contractABI = [
    "function claimQTRewardForUser(address userAddress) external",
    "function canClaimToday(address user) external view returns (bool)",
    "function getQTBalance() external view returns (uint256)",
    "function getUserClaimStatus(address user) external view returns (uint256 lastClaim, bool canClaimToday)"
  ];
  
  const [owner] = await ethers.getSigners();
  const qtDistributor = new ethers.Contract(QT_DISTRIBUTOR_ADDRESS, contractABI, owner);

  // Check contract status
  const contractBalance = await qtDistributor.getQTBalance();
  const canClaim = await qtDistributor.canClaimToday(TEST_USER_ADDRESS);
  
  console.log("💰 Contract Balance:", ethers.formatUnits(contractBalance, 18), "QT tokens");
  console.log("✅ Can Test User Claim:", canClaim);

  if (!canClaim) {
    console.log("⚠️  Test user has already claimed today (this is expected for testing)");
    return;
  }

  if (contractBalance < ethers.parseUnits('10000', 18)) {
    console.log("❌ Contract doesn't have enough QT tokens for testing");
    return;
  }

  try {
    // Test the claimQTRewardForUser function
    console.log("🎰 Testing claimQTRewardForUser function...");
    const tx = await qtDistributor.claimQTRewardForUser(TEST_USER_ADDRESS);
    console.log("📝 Transaction Hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("🎉 Test successful! QT tokens should be transferred to test address");
    
  } catch (error) {
    console.log("❌ Test failed:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ Test error:", error);
  process.exit(1);
});
