const { ethers } = require("hardhat");

async function main() {
  const SPIN_WHEEL_CONTRACT = process.env.SPIN_WHEEL_CONTRACT_ADDRESS || "0x8f8298D16dC4F192587e11a7a7C7F8c7F81A4C89";
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || "0x541529ADB3f344128aa87917fd2926E7D240FB07";
  
  console.log("🔍 Checking contract balance...\n");
  console.log("Contract:", SPIN_WHEEL_CONTRACT);
  console.log("QT Token:", QT_TOKEN_ADDRESS);
  
  // Get QT token contract
  const qtTokenABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];
  
  const qtToken = await ethers.getContractAt(qtTokenABI, QT_TOKEN_ADDRESS);
  
  // Check balance directly from QT token contract
  const balance = await qtToken.balanceOf(SPIN_WHEEL_CONTRACT);
  const balanceReadable = ethers.formatEther(balance);
  
  console.log("\n✅ Contract QT Balance (from token contract):", balanceReadable, "QT");
  
  // Also check via contract's own function
  try {
    const spinWheelABI = [
      "function getQTBalanceReadable() view returns (uint256)"
    ];
    const spinWheelContract = await ethers.getContractAt(spinWheelABI, SPIN_WHEEL_CONTRACT);
    const contractBalance = await spinWheelContract.getQTBalanceReadable();
    console.log("✅ Contract QT Balance (from contract function):", contractBalance.toString(), "QT");
  } catch (error) {
    console.log("⚠️  Could not read from contract function:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
