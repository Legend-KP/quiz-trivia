const { ethers } = require('ethers');

async function main() {
  console.log('🔍 Fetching QT Token Balances from 3 Smart Contracts...\n');
  
  // QT Token Address (confirmed by user)
  const QT_TOKEN_ADDRESS = '0x361faAea711B20caF59726e5f478D745C187cB07';
  const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  
  // The 3 contracts as specified by user:
  // 1. Spin the wheel - SpinWheelQTDistributor
  // 2. Betmode - BetModeVault
  // 3. Daily claim of 1000 QT - DailyRewardDistributor
  const contracts = [
    {
      name: 'Spin the Wheel (SpinWheelQTDistributor)',
      address: '0x3D59700B5EBb9bDdA7D5b16eD3A77315cF1B0e2B',
    },
    {
      name: 'Betmode (BetModeVault)',
      address: '0xc6046a1a08C7DD17832C561d5ecb366d85b1FC8E', // From betModeVault.ts
    },
    {
      name: 'Daily claim of 1000 QT (DailyRewardDistributor)',
      address: '0xbC9e7dE46aA15eA26ba88aD87B76f6fa2EcCD4eD',
    },
  ];
  
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const tokenAbi = ['function balanceOf(address owner) view returns (uint256)'];
  const tokenContract = new ethers.Contract(QT_TOKEN_ADDRESS, tokenAbi, provider);
  
  console.log('='.repeat(70));
  console.log(`QT Token Address: ${QT_TOKEN_ADDRESS}`);
  console.log(`RPC URL: ${BASE_RPC_URL}`);
  console.log('='.repeat(70));
  console.log('');
  
  let totalBalance = 0;
  const results = [];
  
  for (const contract of contracts) {
    try {
      const balance = await tokenContract.balanceOf(contract.address);
      const balanceFormatted = parseFloat(ethers.formatUnits(balance, 18));
      totalBalance += balanceFormatted;
      
      results.push({
        name: contract.name,
        address: contract.address,
        balance: balanceFormatted,
      });
      
      console.log(`📦 ${contract.name}:`);
      console.log(`   Address: ${contract.address}`);
      console.log(`   Balance: ${balanceFormatted.toLocaleString('en-US', { maximumFractionDigits: 2 })} QT`);
      console.log(`   BaseScan: https://basescan.org/address/${contract.address}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Error fetching ${contract.name}:`, error.message);
      console.log('');
      results.push({
        name: contract.name,
        address: contract.address,
        balance: 0,
        error: error.message,
      });
    }
  }
  
  console.log('='.repeat(70));
  console.log(`📊 Total Balance Across All 3 Contracts: ${totalBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} QT`);
  console.log('='.repeat(70));
  console.log('');
  
  // Summary table
  console.log('📋 SUMMARY:');
  console.log('─'.repeat(70));
  results.forEach((result) => {
    if (result.error) {
      console.log(`❌ ${result.name}: ERROR - ${result.error}`);
    } else {
      console.log(`✅ ${result.name}: ${result.balance.toLocaleString('en-US', { maximumFractionDigits: 2 })} QT`);
    }
  });
  console.log('─'.repeat(70));
  console.log(`💰 TOTAL: ${totalBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} QT`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });









