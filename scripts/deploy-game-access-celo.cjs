const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying GameAccess to Celo Mainnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "CELO\n"
  );

  const GameAccess = await ethers.getContractFactory("GameAccess");
  const contract = await GameAccess.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("GameAccess deployed to:", address);
  console.log("CeloScan: https://celoscan.io/address/" + address);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
