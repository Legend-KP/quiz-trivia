const { ethers } = require('ethers');

async function main() {
  console.log('🔍 Fetching QT Token Balances from All Contracts...\n');
  
  // QT Token Address (confirmed)
  const QT_TOKEN_ADDRESS = '0x361faAea711B20caF59726e5f478D745C187cB07';
  const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  
  // All contract addresses
  const contracts = [
    {
      name: 'Spin the Wheel (SpinWheelQTDistributor)',
      address: '0xE50f8F6631520f1D075cF3636F6A04c3999BcDcB',
    },
    {
      name: 'Daily Claim (DailyRewardDistributor)',
      address: '0xED19A7dF3526d9B830A3463d4b93004127dbF6A6',
    },
    {
      name: 'QT Reward Distributor',
      address: '0xB0EfA92d9Da5920905F69581bAC223C3bf7E44F5',
    },
    {
      name: 'Bet Mode Vault (BetModeVault)',
      address: '0xc6046a1a08C7DD17832C561d5ecb366d85b1FC8E',
    },
  ];
  
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const tokenAbi = ['function balanceOf(address owner) view returns (uint256)'];
  const tokenContract = new ethers.Contract(QT_TOKEN_ADDRESS, tokenAbi, provider);
  
  console.log('='.repeat(80));
  console.log(`QT Token Address: ${QT_TOKEN_ADDRESS}`);
  console.log(`RPC URL: ${BASE_RPC_URL}`);
  console.log('='.repeat(80));
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
  
  console.log('='.repeat(80));
  console.log(`📊 Total Balance Across All Contracts: ${totalBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} QT`);
  console.log('='.repeat(80));
  console.log('');
  
  // Summary table
  console.log('📋 SUMMARY:');
  console.log('─'.repeat(80));
  results.forEach((result) => {
    if (result.error) {
      console.log(`❌ ${result.name}: ERROR - ${result.error}`);
    } else {
      const balanceStr = result.balance.toLocaleString('en-US', { maximumFractionDigits: 2 });
      console.log(`✅ ${result.name}: ${balanceStr} QT`);
    }
  });
  console.log('─'.repeat(80));
  console.log(`💰 TOTAL: ${totalBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} QT`);
  console.log('');
  
  // Detailed breakdown
  console.log('📊 DETAILED BREAKDOWN:');
  console.log('─'.repeat(80));
  results.forEach((result, index) => {
    if (!result.error) {
      const percentage = ((result.balance / totalBalance) * 100).toFixed(2);
      console.log(`${index + 1}. ${result.name}`);
      console.log(`   Balance: ${result.balance.toLocaleString('en-US', { maximumFractionDigits: 2 })} QT`);
      console.log(`   Percentage: ${percentage}%`);
      console.log(`   Link: https://basescan.org/address/${result.address}`);
      console.log('');
    }
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });









