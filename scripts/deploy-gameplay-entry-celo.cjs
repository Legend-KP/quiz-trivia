const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying GameplayEntry to Celo Mainnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "CELO\n");

  const GameplayEntry = await ethers.getContractFactory("GameplayEntry");
  const contract = await GameplayEntry.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("GameplayEntry deployed to:", address);
  console.log("CeloScan: https://celoscan.io/address/" + address);
  console.log("\nUpdate src/lib/gameplayEntry.ts DEFAULT_GAMEPLAY_ENTRY or set NEXT_PUBLIC_GAMEPLAY_ENTRY_ADDRESS in .env to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
