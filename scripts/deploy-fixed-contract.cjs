const { ethers } = require('hardhat');

async function deployFixedContract() {
  console.log('🚀 Deploying Fixed QuizTriviaSignature Contract...\n');

  try {
    const [deployer] = await ethers.getSigners();
    console.log('📝 Deploying with account:', deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log('📝 Account balance:', ethers.formatEther(balance), 'ETH');
    console.log('');

    // Deploy the contract
    console.log('📦 Deploying QuizTriviaSignature contract...');
    const QuizTriviaSignature = await ethers.getContractFactory('QuizTriviaSignature');
    const contract = await QuizTriviaSignature.deploy();
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log('✅ Contract deployed successfully!');
    console.log('📍 Contract Address:', contractAddress);
    console.log('🔗 BaseScan: https://basescan.org/address/' + contractAddress);
    console.log('');

    // Test the contract functions
    console.log('🧪 Testing contract functions...');
    
    // Test basic functions
    const owner = await contract.owner();
    console.log('✅ Owner:', owner);
    
    const totalQuizzes = await contract.totalQuizzes();
    console.log('✅ Total quizzes:', totalQuizzes.toString());
    
    // Test getMessageHash function
    const userAddress = deployer.address;
    const mode = 0;
    const timestamp = BigInt(Math.floor(Date.now() / 1000));
    const nonce = BigInt(0);
    
    console.log('🧪 Testing getMessageHash...');
    const messageHash = await contract.getMessageHash(userAddress, mode, timestamp, nonce);
    console.log('✅ getMessageHash works!');
    console.log('   Message hash:', messageHash);
    
    // Test getEthSignedMessageHash
    console.log('🧪 Testing getEthSignedMessageHash...');
    const ethSignedMessageHash = await contract.getEthSignedMessageHash(messageHash);
    console.log('✅ getEthSignedMessageHash works!');
    console.log('   Ethereum signed message hash:', ethSignedMessageHash);
    
    // Test signature creation and verification
    console.log('🧪 Testing signature flow...');
    const signature = await deployer.signMessage(ethers.getBytes(messageHash));
    console.log('✅ Signature created:', signature);
    
    const recoveredSigner = await contract.recoverSigner(messageHash, signature);
    console.log('✅ Recovered signer:', recoveredSigner);
    console.log('✅ Signers match:', recoveredSigner.toLowerCase() === userAddress.toLowerCase());
    
    const isValid = await contract.verifySignature(userAddress, mode, timestamp, nonce, signature);
    console.log('✅ Complete verification:', isValid);
    
    console.log('\n🎉 Contract deployment and testing complete!');
    console.log('📍 New Contract Address:', contractAddress);
    console.log('🔗 View on BaseScan: https://basescan.org/address/' + contractAddress);
    
    return contractAddress;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

deployFixedContract()
  .then((contractAddress) => {
    console.log('\n✅ Deployment successful!');
    console.log('📍 Update your CONTRACT_ADDRESS to:', contractAddress);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
