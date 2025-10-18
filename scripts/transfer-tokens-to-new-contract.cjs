const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const OLD_CONTRACT_ADDRESS = process.env.QT_DISTRIBUTOR_ADDRESS || '0x987f6cd07F5D3D4d507e2Ca0fd06C9e7856ADeb1';
  const NEW_CONTRACT_ADDRESS = '0xb8AD9216A88E2f9a24c7e2207dE4e69101031f02';
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS;
  
  if (!QT_TOKEN_ADDRESS) {
    throw new Error("QT_TOKEN_ADDRESS environment variable is required");
  }

  console.log("🔄 Transferring QT tokens from old to new contract...");
  console.log("📍 Old Contract:", OLD_CONTRACT_ADDRESS);
  console.log("📍 New Contract:", NEW_CONTRACT_ADDRESS);
  console.log("🪙 QT Token:", QT_TOKEN_ADDRESS);

  // Get the old contract instance
  const oldContractABI = [
    "function getQTBalance() external view returns (uint256)",
    "function withdrawQTTokens(uint256 amount) external"
  ];
  const [owner] = await ethers.getSigners();
  const oldContract = new ethers.Contract(OLD_CONTRACT_ADDRESS, oldContractABI, owner);

  // Get the new contract instance
  const newContractABI = [
    "function depositQTTokens(uint256 amount) external"
  ];
  const newContract = new ethers.Contract(NEW_CONTRACT_ADDRESS, newContractABI, owner);

  // Get old contract balance
  const oldBalance = await oldContract.getQTBalance();
  console.log("💰 Old Contract Balance:", ethers.formatUnits(oldBalance, 18), "QT tokens");

  if (oldBalance === 0n) {
    console.log("❌ Old contract has no tokens to transfer");
    return;
  }

  // Withdraw all tokens from old contract
  console.log("💸 Withdrawing tokens from old contract...");
  const withdrawTx = await oldContract.withdrawQTTokens(oldBalance);
  await withdrawTx.wait();
  console.log("✅ Withdrawal transaction:", withdrawTx.hash);

  // Approve new contract to spend tokens
  console.log("🔐 Approving new contract to spend tokens...");
  const qtTokenABI = [
    "function approve(address spender, uint256 amount) external returns (bool)"
  ];
  const qtToken = new ethers.Contract(QT_TOKEN_ADDRESS, qtTokenABI, owner);
  const approveTx = await qtToken.approve(NEW_CONTRACT_ADDRESS, oldBalance);
  await approveTx.wait();
  console.log("✅ Approval transaction:", approveTx.hash);

  // Deposit tokens to new contract
  console.log("💸 Depositing tokens to new contract...");
  const depositTx = await newContract.depositQTTokens(oldBalance);
  await depositTx.wait();
  console.log("✅ Deposit transaction:", depositTx.hash);

  // Verify new contract balance
  const newContractABI2 = [
    "function getQTBalance() external view returns (uint256)"
  ];
  const newContract2 = new ethers.Contract(NEW_CONTRACT_ADDRESS, newContractABI2, owner);
  const newBalance = await newContract2.getQTBalance();
  
  console.log("🎉 Transfer Complete!");
  console.log("💰 New Contract Balance:", ethers.formatUnits(newBalance, 18), "QT tokens");
  console.log("🎁 Max Rewards Available:", Math.floor(Number(ethers.formatUnits(newBalance, 18)) / 10000));
}

main().catch((error) => {
  console.error("❌ Transfer failed:", error);
  process.exit(1);
});
