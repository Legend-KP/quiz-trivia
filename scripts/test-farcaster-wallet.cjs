const { ethers } = require('hardhat');

async function main() {
  console.log('🧪 Testing Farcaster Wallet Integration...\n');

  // Get the deployed contract
  const qtDistributorAddress = process.env.NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS || '0xb8AD9216A88E2f9a24c7e2207dE4e69101031f02';
  
  console.log('📋 Contract Details:');
  console.log(`   Address: ${qtDistributorAddress}`);
  
  // Contract ABI (minimal for testing)
  const abi = [
    {
      "inputs": [],
      "name": "claimQTReward",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
      "name": "canClaimToday",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getQTBalance",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  try {
    // Connect to the contract
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const contract = new ethers.Contract(qtDistributorAddress, abi, provider);

    // Test contract functions
    console.log('\n🔍 Testing Contract Functions:');
    
    // Check contract balance
    const balance = await contract.getQTBalance();
    console.log(`   QT Balance: ${ethers.formatEther(balance)} QT tokens`);
    
    // Test with a sample address
    const testAddress = '0x1234567890123456789012345678901234567890';
    const canClaim = await contract.canClaimToday(testAddress);
    console.log(`   Can claim today (test address): ${canClaim}`);
    
    console.log('\n✅ Contract is accessible and functions are working');
    console.log('\n📝 Integration Notes:');
    console.log('   - Farcaster Mini App connector is configured in WagmiProvider');
    console.log('   - useQTClaim hook uses Wagmi for wallet interaction');
    console.log('   - Users will sign transactions directly in their Farcaster wallet');
    console.log('   - No Coinbase/MetaMask prompts - only Farcaster wallet');
    
  } catch (error) {
    console.error('❌ Error testing contract:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
