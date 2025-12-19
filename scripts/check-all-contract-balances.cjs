const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking balances of all contracts...\n");
  
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || "0x361faAea711B20caF59726e5f478D745C187cB07";
  
  const contracts = [
    {
      name: "SpinWheelQTDistributor",
      address: "0x3D59700B5EBb9bDdA7D5b16eD3A77315cF1B0e2B"
    },
    {
      name: "DailyRewardDistributor",
      address: "0xbC9e7dE46aA15eA26ba88aD87B76f6fa2EcCD4eD"
    },
    {
      name: "QTRewardDistributor",
      address: "0xB0EfA92d9Da5920905F69581bAC223C3bf7E44F5"
    },
    {
      name: "BetModeVault",
      address: "0x38D90A5F0943D614187FF1e8Fa1a89D58102434a"
    }
  ];
  
  const qtToken = await ethers.getContractAt(
    ["function balanceOf(address owner) view returns (uint256)"],
    QT_TOKEN_ADDRESS
  );
  
  console.log("=".repeat(60));
  
  for (const contractInfo of contracts) {
    try {
      const balance = await qtToken.balanceOf(contractInfo.address);
      const balanceFormatted = ethers.formatEther(balance);
      
      console.log(`${contractInfo.name}:`);
      console.log(`  Address: ${contractInfo.address}`);
      console.log(`  Balance: ${balanceFormatted} QT`);
      console.log(`  BaseScan: https://basescan.org/address/${contractInfo.address}`);
      console.log("");
    } catch (error) {
      console.error(`❌ Error checking ${contractInfo.name}:`, error.message);
      console.log("");
    }
  }
  
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
