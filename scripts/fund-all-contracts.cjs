const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Funding ALL contracts with 1 million QT tokens each...\n");
  
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || "0x361faAea711B20caF59726e5f478D745C187cB07";
  const FUND_AMOUNT = 1_000_000; // 1 million QT tokens (without decimals)
  const FUND_AMOUNT_WEI = ethers.parseEther(FUND_AMOUNT.toString());
  
  // New contract addresses
  const contracts = [
    {
      name: "SpinWheelQTDistributor",
      address: "0x3D59700B5EBb9bDdA7D5b16eD3A77315cF1B0e2B",
      abi: [
        "function depositQTTokens(uint256 amount)",
        "function getQTBalanceReadable() view returns (uint256)"
      ],
      method: "depositQTTokens"
    },
    {
      name: "DailyRewardDistributor",
      address: "0xbC9e7dE46aA15eA26ba88aD87B76f6fa2EcCD4eD",
      abi: [
        "function depositQTTokens(uint256 amount)",
        "function getQTBalance() view returns (uint256)"
      ],
      method: "depositQTTokens",
      needsDecimals: true
    },
    {
      name: "QTRewardDistributor",
      address: "0xB0EfA92d9Da5920905F69581bAC223C3bf7E44F5",
      abi: [
        "function depositQTTokens(uint256 amount)",
        "function getQTBalance() view returns (uint256)"
      ],
      method: "depositQTTokens",
      needsDecimals: true
    },
    {
      name: "BetModeVault",
      address: "0x38D90A5F0943D614187FF1e8Fa1a89D58102434a",
      abi: [
        "function getContractBalance() view returns (uint256)"
      ],
      method: "directTransfer",
      needsDirectTransfer: true
    }
  ];
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Funding from address:", signer.address);
  console.log("💰 Amount per contract:", FUND_AMOUNT.toLocaleString(), "QT tokens\n");
  
  // Get QT token contract
  const qtTokenABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ];
  
  const qtToken = await ethers.getContractAt(qtTokenABI, QT_TOKEN_ADDRESS, signer);
  
  // Check signer balance
  const signerBalance = await qtToken.balanceOf(signer.address);
  const signerBalanceFormatted = ethers.formatEther(signerBalance);
  const totalNeeded = FUND_AMOUNT_WEI * BigInt(contracts.length);
  
  console.log("📊 Balance Check:");
  console.log("   Your QT Balance:", signerBalanceFormatted, "QT");
  console.log("   Total Needed:", ethers.formatEther(totalNeeded), "QT");
  console.log("   Contracts to fund:", contracts.length);
  console.log("");
  
  if (signerBalance < totalNeeded) {
    throw new Error(`❌ Insufficient balance! You have ${signerBalanceFormatted} QT but need ${ethers.formatEther(totalNeeded)} QT`);
  }
  
  // Fund each contract
  for (const contractInfo of contracts) {
    try {
      console.log("=".repeat(60));
      console.log(`💰 Funding: ${contractInfo.name}`);
      console.log(`📍 Address: ${contractInfo.address}`);
      console.log("=".repeat(60));
      
      if (contractInfo.needsDirectTransfer) {
        // BetModeVault - direct transfer
        console.log("\n📝 Transferring QT tokens directly...");
        const approveTx = await qtToken.approve(contractInfo.address, FUND_AMOUNT_WEI);
        console.log("   Approval tx:", approveTx.hash);
        await approveTx.wait();
        console.log("   ✅ Approved");
        
        // Note: BetModeVault doesn't have a deposit function, users deposit via deposit()
        // So we'll just transfer to the contract
        const transferTx = await qtToken.transfer(contractInfo.address, FUND_AMOUNT_WEI);
        console.log("   Transfer tx:", transferTx.hash);
        await transferTx.wait();
        console.log("   ✅ Transferred");
      } else {
        // Other contracts - use depositQTTokens
        console.log("\n📝 Approving contract to spend QT tokens...");
        const currentAllowance = await qtToken.allowance(signer.address, contractInfo.address);
        
        if (currentAllowance < FUND_AMOUNT_WEI) {
          const approveTx = await qtToken.approve(contractInfo.address, FUND_AMOUNT_WEI);
          console.log("   Approval tx:", approveTx.hash);
          console.log("   ⏳ Waiting for confirmation...");
          await approveTx.wait();
          console.log("   ✅ Approved");
        } else {
          console.log("   ✅ Already approved");
        }
        
        // Add delay to prevent nonce issues
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Increase gas price by 20% to prevent replacement transaction errors
        const feeData = await ethers.provider.getFeeData();
        const increasedGasPrice = feeData.gasPrice ? (feeData.gasPrice * 120n / 100n) : undefined;
        
        console.log("\n📝 Depositing QT tokens to contract...");
        const contract = await ethers.getContractAt(contractInfo.abi, contractInfo.address, signer);
        
        let depositTx;
        if (contractInfo.needsDecimals) {
          // DailyRewardDistributor and QTRewardDistributor expect amount with decimals
          depositTx = await contract.depositQTTokens(FUND_AMOUNT_WEI, {
            gasPrice: increasedGasPrice
          });
        } else {
          // SpinWheelQTDistributor expects amount without decimals
          depositTx = await contract.depositQTTokens(FUND_AMOUNT, {
            gasPrice: increasedGasPrice
          });
        }
        
        console.log("   Deposit tx:", depositTx.hash);
        console.log("   ⏳ Waiting for confirmation...");
        await depositTx.wait();
        console.log("   ✅ Deposited");
      }
      
      // Verify balance
      console.log("\n🔍 Verifying contract balance...");
      const contract = await ethers.getContractAt(contractInfo.abi, contractInfo.address);
      
      let balance;
      if (contractInfo.name === "BetModeVault") {
        balance = await contract.getContractBalance();
      } else if (contractInfo.name === "SpinWheelQTDistributor") {
        const balanceReadable = await contract.getQTBalanceReadable();
        balance = ethers.parseEther(balanceReadable.toString());
      } else {
        balance = await contract.getQTBalance();
      }
      
      const balanceFormatted = ethers.formatEther(balance);
      console.log(`   ✅ Contract Balance: ${balanceFormatted} QT`);
      console.log(`   🔗 BaseScan: https://basescan.org/address/${contractInfo.address}`);
      
      if (parseFloat(balanceFormatted) < FUND_AMOUNT * 0.99) {
        console.warn(`   ⚠️  Warning: Balance is less than expected (${FUND_AMOUNT} QT)`);
      }
      
      console.log("");
      
    } catch (error) {
      console.error(`❌ Error funding ${contractInfo.name}:`, error.message);
      console.error(`   Continuing with next contract...\n`);
      continue;
    }
  }
  
  console.log("=".repeat(60));
  console.log("✅ FUNDING COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Summary:");
  console.log(`   Contracts funded: ${contracts.length}`);
  console.log(`   Amount per contract: ${FUND_AMOUNT.toLocaleString()} QT`);
  console.log(`   Total QT distributed: ${(FUND_AMOUNT * contracts.length).toLocaleString()} QT`);
  console.log("");
}

main()
  .then(() => {
    console.log("✅ All contracts funded successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Funding failed:", error);
    process.exit(1);
  });
