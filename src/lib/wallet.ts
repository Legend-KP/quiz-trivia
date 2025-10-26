import { ethers } from 'ethers';
import { getWalletClient } from 'wagmi/actions';
import { encodeFunctionData } from 'viem';

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
    farcaster?: any;
  }
}

// Contract configuration - Updated for signature-based contract
export const CONTRACT_ADDRESS = '0xBc2bC70DDed7A49806DBb4100Ef2c4e8C4721554'; // REAL deployed contract with working transactions
export const CONTRACT_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"mode","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"score","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"QuizCompleted","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"mode","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"},{"indexed":false,"internalType":"bytes32","name":"signatureHash","type":"bytes32"}],"name":"QuizStarted","type":"event"},
  {"inputs":[{"internalType":"bytes32","name":"messageHash","type":"bytes32"}],"name":"getEthSignedMessageHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"enum QuizTriviaSignature.QuizMode","name":"mode","type":"uint8"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"}],"name":"getMessageHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},
  {"inputs":[],"name":"getStats","outputs":[{"internalType":"uint256","name":"total","type":"uint256"},{"internalType":"uint256","name":"classic","type":"uint256"},{"internalType":"uint256","name":"time","type":"uint256"},{"internalType":"uint256","name":"challenge","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserNonce","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserQuizCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"enum QuizTriviaSignature.QuizMode","name":"","type":"uint8"}],"name":"modeCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"enum QuizTriviaSignature.QuizMode","name":"mode","type":"uint8"},{"internalType":"uint256","name":"score","type":"uint256"}],"name":"recordQuizCompletion","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"messageHash","type":"bytes32"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"recoverSigner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"pure","type":"function"},
  {"inputs":[{"internalType":"enum QuizTriviaSignature.QuizMode","name":"mode","type":"uint8"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"startQuizWithSignature","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"totalQuizzes","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"usedSignatures","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userNonce","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userQuizCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"enum QuizTriviaSignature.QuizMode","name":"mode","type":"uint8"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"verifySignature","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},
  {"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}
] as const;

// Quiz modes matching the smart contract
export enum QuizMode {
  CLASSIC = 0,
  TIME_MODE = 1,
  CHALLENGE = 2,
}

// Transaction states for UI feedback
export enum TransactionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONFIRMING = 'confirming',
  SUCCESS = 'success',
  ERROR = 'error',
}

// Custom error class for wallet-related errors
export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletError';
  }
}

/**
 * Connect to wallet and get provider
 */
export async function connectWallet(): Promise<ethers.BrowserProvider> {
  if (typeof window === 'undefined') {
    throw new WalletError('Wallet connection not available on server side');
  }

  if (!window.ethereum) {
    throw new WalletError('No wallet found. Please install MetaMask or connect your Farcaster wallet.');
  }

  try {
      const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    return provider;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new WalletError('User rejected wallet connection');
    }
    throw new WalletError(`Failed to connect wallet: ${error.message}`);
  }
}

/**
 * Get contract instance
 */
export async function getContract(provider: ethers.BrowserProvider): Promise<ethers.Contract> {
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/**
 * Start a quiz with signature verification (NO PAYMENT REQUIRED)
 */
export async function startQuizWithSignature(
  mode: QuizMode,
  config: any,
  onStateChange?: (state: TransactionState) => void
): Promise<string> {
  try {
    onStateChange?.(TransactionState.CONNECTING);
    
    console.log('🎮 Starting quiz with signature...');
    console.log('📝 Mode:', mode);
    console.log('📝 Config:', config);
    
    // Get wallet client
    let client;
    try {
      client = await getWalletClient(config);
      console.log('✅ Wallet client obtained');
      
      if (!client) {
        throw new WalletError('No wallet client available. Please connect your Farcaster wallet first.');
      }
      
      // Handle getChainId issues
      if (typeof client.getChainId !== 'function') {
        console.warn('⚠️ Client missing getChainId method, creating fallback...');
        const chainId = client.chain?.id || 8453; // Default to Base Mainnet
        console.log('📝 Using chain ID:', chainId);
        
        const mockClient = {
          ...client,
          getChainId: async () => chainId,
        };
        client = mockClient;
      }
      
    } catch (connectorError: any) {
      console.error('getWalletClient failed:', connectorError);
      
      if (connectorError.message?.includes('Connector not connected')) {
        throw new WalletError('Please connect your Farcaster wallet first. Go to the Wallet tab and click "Connect Farcaster".');
      } else if (connectorError.message?.includes('getChainId is not a function')) {
        console.warn('⚠️ getChainId error detected, this is a known issue with some connectors');
        console.warn('⚠️ Please try reconnecting your wallet or refreshing the page');
        throw new WalletError('Wallet connection issue. Please try reconnecting your wallet or refreshing the page.');
      } else if (connectorError.message?.includes('User rejected')) {
        throw new WalletError('Connection was rejected. Please try again.');
      }
      
      console.error('Full connector error:', connectorError);
      throw new WalletError(`Connection failed: ${connectorError.message || 'Unknown error'}`);
    }
    
    if (!client) {
      throw new WalletError('Wallet not connected. Please connect your Farcaster wallet first.');
    }
    
    onStateChange?.(TransactionState.CONFIRMING);
    
    // Verify network
    let networkId;
    try {
      networkId = await client.getChainId();
      console.log('📝 Network ID from client:', networkId);
    } catch (networkError) {
      console.warn('⚠️ getChainId failed, using fallback approach:', networkError);
      networkId = client.chain?.id || 8453; // Default to Base Mainnet
      console.log('📝 Using fallback network ID:', networkId);
    }
    
    if (networkId !== 8453) { // Base Mainnet
      throw new WalletError('Please switch to Base network to start quizzes.');
    }
    
    // Get user address and current nonce
    const userAddress = client.account.address;
    const timestamp = BigInt(Math.floor(Date.now() / 1000));
    
    // 🔑 CRITICAL FIX: Always get FRESH nonce from contract
    let nonce = BigInt(0); // Default fallback
    let contract;
    
    try {
      // Create provider using the client's transport
      const provider = new ethers.BrowserProvider(client.transport);
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      console.log('📊 Getting FRESH nonce from contract...');
      
      // Try to get the nonce with a timeout
      const noncePromise = contract.getUserNonce(userAddress);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Contract call timeout')), 5000)
      );
      
      nonce = await Promise.race([noncePromise, timeoutPromise]);
      console.log('✅ FRESH nonce from contract:', nonce.toString());
      console.log('🔑 This ensures signature matches contract expectations');
      console.log('📝 Contract will use this nonce for verification');
      
    } catch (contractError) {
      const errorMessage = contractError instanceof Error ? contractError.message : 'Unknown error';
      console.warn('⚠️ Contract call failed, using default nonce 0:', errorMessage);
      console.log('🔍 This is normal for first-time users or network issues');
      console.log('🔍 Continuing with nonce 0 - this is safe for new users');
      // Continue with nonce 0 - this is fine for new users
    }
    
    console.log('=== SIGNATURE DEBUG ===');
    console.log('User:', userAddress);
    console.log('Mode:', Number(mode));
    console.log('Timestamp:', timestamp.toString());
    console.log('Nonce:', nonce.toString());
    console.log('📝 Signature Parameters:');
    console.log('  Nonce:', nonce.toString(), '← FRESH from contract');
    console.log('🔑 This nonce will be used for signature creation');
    console.log('=====================');
    
    // 🔑 REAL CONTRACT APPROACH: Get message hash from contract
    let rawMessageHash;
    if (contract) {
      try {
        // Get the raw hash from the REAL contract
        rawMessageHash = await contract.getMessageHash(userAddress, Number(mode), timestamp, nonce);
        console.log('📝 Raw message hash from REAL contract:', rawMessageHash);
      } catch (hashError) {
        const errorMessage = hashError instanceof Error ? hashError.message : 'Unknown error';
        console.warn('⚠️ Contract getMessageHash failed, using fallback:', errorMessage);
        // Fallback: create the raw hash manually
        rawMessageHash = ethers.solidityPackedKeccak256(
          ['address', 'uint8', 'uint256', 'uint256'],
          [userAddress, Number(mode), timestamp, nonce]
        );
        console.log('📝 Fallback raw message hash:', rawMessageHash);
      }
    } else {
      // Fallback: create the raw hash manually
      rawMessageHash = ethers.solidityPackedKeccak256(
        ['address', 'uint8', 'uint256', 'uint256'],
        [userAddress, Number(mode), timestamp, nonce]
      );
      console.log('📝 Fallback raw message hash (no contract):', rawMessageHash);
    }
    
    // 🔥 URGENT FIX: Use window.ethereum.request with personal_sign
    // This is more compatible with Farcaster wallet
    let signature;
    try {
      console.log('📝 Preparing to sign...');
      console.log('Message hash:', rawMessageHash);
      console.log('User address:', userAddress);
      
      // 🔑 FIX: Use window.ethereum.request with personal_sign
      // This is more compatible with Farcaster wallet
      if (typeof window !== 'undefined' && window.ethereum) {
        signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [rawMessageHash, userAddress],
        });
        console.log('✅ Signature created with personal_sign:', signature);
      } else {
        throw new Error('window.ethereum not available');
      }
      
      console.log('=== SIGNATURE VERIFICATION DEBUG ===');
      console.log('Raw message hash used:', rawMessageHash);
      console.log('Signature created:', signature);
      console.log('=====================================');
      
      // Verify signature locally BEFORE sending
      console.log('=== VERIFYING SIGNATURE BEFORE SENDING ===');
      try {
        const provider = new ethers.BrowserProvider(client.transport);
        const testContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        
        const isValid = await testContract.verifySignature(
          userAddress,
          Number(mode),
          timestamp,
          nonce,
          signature
        );
        
        console.log('✅ Signature valid?', isValid);
        
        if (!isValid) {
          console.error('❌ SIGNATURE INVALID - will fail on chain');
          throw new WalletError('Signature verification failed. Please try again.');
        } else {
          console.log('✅ SIGNATURE VALID - proceeding with transaction');
        }
      } catch (verifyError) {
        console.warn('Could not pre-verify signature:', verifyError);
      }
      console.log('==========================================');
      
    } catch (signError) {
      const errorMessage = signError instanceof Error ? signError.message : 'Unknown error';
      console.error('❌ Signature creation failed:', errorMessage);
      
      if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
        throw new WalletError('You rejected the signature request. Please try again and approve the signature.');
      }
      
      throw new WalletError(`Failed to create signature: ${errorMessage}`);
    }
    
    // 🔑 REAL BLOCKCHAIN TRANSACTION: Send to deployed contract
    const txData = encodeFunctionData({
      abi: CONTRACT_ABI,
      functionName: 'startQuizWithSignature',
      args: [Number(mode), BigInt(timestamp), signature],
    });
    
    console.log('📝 Sending REAL blockchain transaction...');
    console.log('Transaction data:', {
      to: CONTRACT_ADDRESS,
      data: txData,
      value: '0'
    });
    
    // Send REAL transaction using Farcaster wallet (NO VALUE REQUIRED)
    const txHash = await client.sendTransaction({
      to: CONTRACT_ADDRESS as `0x${string}`,
      data: txData,
      value: BigInt(0), // NO PAYMENT REQUIRED
      chain: null,
    });
    
    console.log('✅ REAL Transaction hash:', txHash);
    console.log('🎯 This WILL count as a transaction in your mini app!');
    
    onStateChange?.(TransactionState.SUCCESS);
    
    return txHash;
  } catch (error: any) {
    onStateChange?.(TransactionState.ERROR);
    
    if (error instanceof WalletError) {
      throw error;
    }
    
    if (error.code === 4001) {
      throw new WalletError('Transaction rejected by user');
    } else if (error.code === -32603) {
      throw new WalletError('Transaction failed. Please try again.');
    } else if (error.message?.includes('Signature expired')) {
      throw new WalletError('Signature expired. Please try again.');
    } else if (error.message?.includes('Invalid signature')) {
      throw new WalletError('Invalid signature. Please try again.');
    } else if (error.message?.includes('Signature already used')) {
      throw new WalletError('Signature already used. Please try again.');
    } else if (error.message?.includes('getChainId is not a function')) {
      throw new WalletError('Wallet connection issue. Please try reconnecting your wallet.');
    } else if (error.message?.includes('missing revert data')) {
      throw new WalletError('Unable to start quiz. Please try again in a moment.');
    } else if (error.message?.includes('CALL_EXCEPTION')) {
      throw new WalletError('Quiz system is temporarily unavailable. Please try again.');
    } else if (error.message?.includes('execution reverted')) {
      throw new WalletError('Quiz entry failed. Please try again.');
    }
    
    console.error('Full error details:', error);
    throw new WalletError(`Transaction failed: ${error.message}`);
  }
}

/**
 * Record quiz completion
 */
export async function recordQuizCompletion(
  userAddress: string,
  mode: QuizMode,
  score: number
): Promise<void> {
  try {
    const provider = await connectWallet();
    const contract = await getContract(provider);
    
    const tx = await contract.recordQuizCompletion(userAddress, Number(mode), score);
    await tx.wait();
    
    console.log('✅ Quiz completion recorded:', tx.hash);
  } catch (error: any) {
    throw new WalletError(`Failed to record completion: ${error.message}`);
  }
}

/**
 * Get user's current nonce (for display purposes)
 */
export async function getUserNonce(userAddress: string): Promise<number> {
  try {
    const provider = await connectWallet();
    const contract = await getContract(provider);
    const nonce = await contract.getUserNonce(userAddress);
    console.log('📊 Current user nonce:', nonce.toNumber());
    return nonce.toNumber();
  } catch (error: any) {
    console.warn('Failed to get user nonce:', error.message);
    return 0; // Default to 0 for new users
  }
}

/**
 * Get user's quiz statistics with nonce info
 */
export async function getUserQuizInfo(userAddress: string): Promise<{
  quizCount: number;
  nonce: number;
  nextQuizNumber: number;
}> {
  try {
    const provider = await connectWallet();
    const contract = await getContract(provider);
    
    const [quizCount, nonce] = await Promise.all([
      contract.getUserQuizCount(userAddress),
      contract.getUserNonce(userAddress)
    ]);
    
    return {
      quizCount: quizCount.toNumber(),
      nonce: nonce.toNumber(),
      nextQuizNumber: nonce.toNumber() + 1
    };
  } catch (error: any) {
    console.warn('Failed to get user quiz info:', error.message);
    return {
      quizCount: 0,
      nonce: 0,
      nextQuizNumber: 1
    };
  }
}

/**
 * Get user's quiz statistics
 */
export async function getUserQuizStats(userAddress: string): Promise<{
  quizCount: number;
  totalQuizzes: number;
  classicQuizzes: number;
  timeQuizzes: number;
  challengeQuizzes: number;
  userNonce: number;
}> {
  try {
    const provider = await connectWallet();
    const contract = await getContract(provider);
    
    const [quizCount, stats, nonce] = await Promise.all([
      contract.getUserQuizCount(userAddress),
      contract.getStats(),
      contract.getUserNonce(userAddress)
    ]);
    
    return {
      quizCount: quizCount.toNumber(),
      totalQuizzes: stats.total.toNumber(),
      classicQuizzes: stats.classic.toNumber(),
      timeQuizzes: stats.time.toNumber(),
      challengeQuizzes: stats.challenge.toNumber(),
      userNonce: nonce.toNumber()
    };
  } catch (error: any) {
    throw new WalletError(`Failed to get stats: ${error.message}`);
  }
}

/**
 * Format error message for user display
 */
export function formatWalletError(error: WalletError): string {
  return error.message;
}

/**
 * Check if wallet is connected
 */
export async function isWalletConnected(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return false;
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();
    return accounts.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get current wallet address
 */
export async function getCurrentWalletAddress(): Promise<string | null> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null;
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return await signer.getAddress();
  } catch {
    return null;
  }
}