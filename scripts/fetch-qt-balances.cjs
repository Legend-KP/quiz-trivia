const { ethers } = require('ethers');

async function main() {
  console.log('🔍 Fetching QT Token Balances from 3 Smart Contracts...\n');
  
  const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || '0x361faAea711B20caF59726e5f478D745C187cB07';
  const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  
  const contracts = [
    {
      name: 'SpinWheelQTDistributor',
      address: '0x3D59700B5EBb9bDdA7D5b16eD3A77315cF1B0e2B',
      funded: 25_000_000, // 25M QT
    },
    {
      name: 'DailyRewardDistributor',
      address: '0xbC9e7dE46aA15eA26ba88aD87B76f6fa2EcCD4eD',
      funded: 25_000_000, // 25M QT
    },
    {
      name: 'QTRewardDistributor',
      address: '0xB0EfA92d9Da5920905F69581bAC223C3bf7E44F5',
      funded: 'Unknown', // Not in main deployment script
    },
    {
      name: 'BetModeVault',
      address: '0x38D90A5F0943D614187FF1e8Fa1a89D58102434a',
      funded: 200_000_000, // 200M QT
    },
  ];
  
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const tokenAbi = ['function balanceOf(address owner) view returns (uint256)'];
  const tokenContract = new ethers.Contract(QT_TOKEN_ADDRESS, tokenAbi, provider);
  
  console.log('='.repeat(60));
  console.log(`QT Token Address: ${QT_TOKEN_ADDRESS}`);
  console.log(`RPC URL: ${BASE_RPC_URL}`);
  console.log('='.repeat(60));
  console.log('');
  
  let totalBalance = 0;
  
  for (const contract of contracts) {
    try {
      const balance = await tokenContract.balanceOf(contract.address);
      const balanceFormatted = parseFloat(ethers.formatUnits(balance, 18));
      totalBalance += balanceFormatted;
      
      const fundedAmount = typeof contract.funded === 'number' 
        ? contract.funded.toLocaleString('en-US') 
        : contract.funded;
      
      console.log(`📦 ${contract.name}:`);
      console.log(`   Address: ${contract.address}`);
      console.log(`   Originally Funded: ${fundedAmount} QT`);
      console.log(`   Current Balance: ${balanceFormatted.toLocaleString('en-US', { maximumFractionDigits: 2 })} QT`);
      
      if (typeof contract.funded === 'number') {
        const difference = balanceFormatted - contract.funded;
        const diffFormatted = difference.toLocaleString('en-US', { maximumFractionDigits: 2 });
        if (difference > 0) {
          console.log(`   ⬆️  Difference: +${diffFormatted} QT (users deposited)`);
        } else if (difference < 0) {
          console.log(`   ⬇️  Difference: ${diffFormatted} QT (withdrawn/distributed)`);
        } else {
          console.log(`   ✅ Balance matches original funding`);
        }
      }
      
      console.log(`   BaseScan: https://basescan.org/address/${contract.address}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Error fetching ${contract.name}:`, error.message);
      console.log('');
    }
  }
  
  console.log('='.repeat(60));
  console.log(`📊 Total Balance Across All Contracts: ${totalBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} QT`);
  console.log('='.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

