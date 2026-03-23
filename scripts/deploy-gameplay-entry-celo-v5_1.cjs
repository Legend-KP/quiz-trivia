const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying GameplayEntry v5.1 to Celo Mainnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "CELO\n"
  );

  const GameplayEntry = await ethers.getContractFactory(
    "contracts/GameplayEntry_v5_1.sol:GameplayEntry"
  );
  const contract = await GameplayEntry.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("GameplayEntry v5.1 deployed to:", address);
  console.log("CeloScan: https://celoscan.io/address/" + address);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
