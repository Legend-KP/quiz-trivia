const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Spin Wheel QT Distributor Contract...");
  
  // Get the contract factory
  const SpinWheelQTDistributor = await ethers.getContractFactory("SpinWheelQTDistributor");
  
  // QT Token address on Base network
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || "0x541529ADB3f344128aa87917fd2926E7D240FB07";
  
  if (!QT_TOKEN_ADDRESS) {
    throw new Error("QT_TOKEN_ADDRESS environment variable is required");
  }
  
  console.log("📋 Contract Details:");
  console.log("- QT Token Address:", QT_TOKEN_ADDRESS);
  console.log("- Reward Amounts: 100, 200, 500, 1000, 2000, 10000 QT tokens");
  console.log("- Cooldown Period: 1 hour (3600 seconds)");
  console.log("- Network: Base Mainnet");
  
  // Deploy the contract
  console.log("\n⏳ Deploying contract...");
  const spinWheelDistributor = await SpinWheelQTDistributor.deploy(QT_TOKEN_ADDRESS);
  await spinWheelDistributor.waitForDeployment();
  
  const contractAddress = await spinWheelDistributor.getAddress();
  
  console.log("\n✅ Deployment Successful!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 BaseScan:", `https://basescan.org/address/${contractAddress}`);
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const qtTokenAddress = await spinWheelDistributor.qtToken();
  const owner = await spinWheelDistributor.owner();
  const cooldownPeriod = await spinWheelDistributor.COOLDOWN_PERIOD();
  
  console.log("✅ QT Token Address:", qtTokenAddress);
  console.log("✅ Owner:", owner);
  console.log("✅ Cooldown Period:", cooldownPeriod.toString(), "seconds (1 hour)");
  
  // Wait for block confirmations
  console.log("\n⏳ Waiting for block confirmations...");
  const deploymentTx = spinWheelDistributor.deploymentTransaction();
  if (deploymentTx) {
    await deploymentTx.wait(5);
    console.log("✅ Contract confirmed on blockchain");
  }
  
  console.log("\n📝 Next Steps:");
  console.log("1. Update your .env file with the contract address:");
  console.log(`   NEXT_PUBLIC_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS=${contractAddress}`);
  console.log("2. Verify the contract on BaseScan:");
  console.log(`   npx hardhat verify --network base ${contractAddress} "${QT_TOKEN_ADDRESS}"`);
  console.log("3. Deposit QT tokens to the contract:");
  console.log("   - Approve the contract to spend your QT tokens");
  console.log("   - Call depositQTTokens(amount) - amount should be in QT (without decimals)");
  console.log("   - Recommended initial deposit: 1,000,000 - 2,000,000 QT");
  console.log("4. Update your frontend code to use the new contract address");
  console.log("5. Test the complete flow: spin → win → claim");
  
  console.log("\n💰 Funding Example:");
  console.log("   const qtToken = await ethers.getContractAt('IERC20', QT_TOKEN_ADDRESS);");
  console.log(`   const contract = await ethers.getContractAt('SpinWheelQTDistributor', '${contractAddress}');`);
  console.log("   await qtToken.approve(contractAddress, ethers.parseEther('1000000'));");
  console.log("   await contract.depositQTTokens(1000000);");
  
  return contractAddress;
}

main()
  .then((address) => {
    console.log("\n🎉 Contract deployed at:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
