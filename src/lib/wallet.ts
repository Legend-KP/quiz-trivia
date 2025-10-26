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

// Contract configuration - RESTORED MICRO TRANSACTION CONTRACT
export const CONTRACT_ADDRESS = '0xAa23aCDaf5B0B7C2eBF2ff0E059c85bbD33FA7fd'; // NEWLY DEPLOYED micro transaction contract
export const CONTRACT_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"mode","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"score","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"QuizCompleted","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"mode","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"feePaid","type":"uint256"}],"name":"QuizStarted","type":"event"},
  {"inputs":[],"name":"CHALLENGE_FEE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"CLASSIC_FEE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"TIME_MODE_FEE","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"enum QuizTriviaEntry.QuizMode","name":"mode","type":"uint8"}],"name":"getRequiredFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},
  {"inputs":[],"name":"getStats","outputs":[{"internalType":"uint256","name":"total","type":"uint256"},{"internalType":"uint256","name":"classic","type":"uint256"},{"internalType":"uint256","name":"time","type":"uint256"},{"internalType":"uint256","name":"challenge","type":"uint256"},{"internalType":"uint256","name":"fees","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserQuizCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"enum QuizTriviaEntry.QuizMode","name":"","type":"uint8"}],"name":"modeCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"enum QuizTriviaEntry.QuizMode","name":"mode","type":"uint8"},{"internalType":"uint256","name":"score","type":"uint256"}],"name":"recordQuizCompletion","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"enum QuizTriviaEntry.QuizMode","name":"mode","type":"uint8"}],"name":"startQuiz","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[],"name":"totalFeesCollected","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalQuizzes","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userQuizCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
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
 * Connect to wallet and return provider
 */
export async function connectWallet(): Promise<ethers.BrowserProvider> {
  try {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please install MetaMask or connect your Farcaster wallet.');
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    return provider;
  } catch (error: any) {
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
 * Start a quiz with micro transaction payment
 */
export async function startQuizTransactionWithWagmi(
  mode: QuizMode,
  config: any,
  onStateChange?: (state: TransactionState) => void
): Promise<string> {
  try {
    onStateChange?.(TransactionState.CONNECTING);
    
    console.log('🎮 Starting quiz with micro transaction...');
    console.log('📝 Mode:', mode);
    
    // Get wallet client
    const client = await getWalletClient(config);
    if (!client) {
      throw new WalletError('Please connect your wallet first');
    }
    
    // Get user address
    const userAddress = client.account.address;
    console.log('👤 User address:', userAddress);
    
    // Verify we're on Base Mainnet
    try {
      const chainId = await client.getChainId();
      console.log('🔗 Current chain ID:', chainId);
      
      if (chainId !== 8453) {
        throw new WalletError('Please switch to Base Mainnet to start a quiz');
      }
    } catch (chainError) {
      console.warn('Could not verify chain ID:', chainError);
      // Continue anyway - some wallets don't support getChainId
    }
    
    onStateChange?.(TransactionState.CONFIRMING);
    
    // Get required fee for the quiz mode (FREE!)
    const requiredFee = getRequiredFeeInWei(mode);
    console.log('💰 Required fee:', ethers.formatEther(requiredFee), 'ETH (FREE!)');
    
    // Check user's balance (only need gas for transaction)
    const provider = new ethers.BrowserProvider(client.transport);
    const balance = await provider.getBalance(userAddress);
    console.log('💳 User balance:', ethers.formatEther(balance), 'ETH');
    
    // Only check if user has enough for gas (very small amount)
    const minGasBalance = ethers.parseEther('0.00001'); // ~$0.00001 for gas (Base network is very cheap!)
    if (balance < minGasBalance) {
      throw new WalletError(`Insufficient balance for gas fees. You need at least ${ethers.formatEther(minGasBalance)} ETH for transaction gas.`);
    }
    
    // Prepare transaction data
    const txData = encodeFunctionData({
      abi: CONTRACT_ABI,
      functionName: 'startQuiz',
      args: [Number(mode)],
    });
    
    console.log('📝 Sending micro transaction...');
    console.log('Transaction data:', {
      to: CONTRACT_ADDRESS,
      data: txData,
      value: requiredFee.toString()
    });
    
    // Send transaction with payment
    const txHash = await client.sendTransaction({
      to: CONTRACT_ADDRESS as `0x${string}`,
      data: txData,
      value: requiredFee,
      chain: null,
    });
    
    console.log('✅ Transaction sent! Hash:', txHash);
    onStateChange?.(TransactionState.SUCCESS);
    
    return txHash;
    
  } catch (error) {
    console.error('❌ Quiz start failed:', error);
    
    let errorMessage = 'Unable to start quiz. Please try again in a moment.';
    
    if (error instanceof WalletError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      if (error.message.includes('User rejected')) {
        errorMessage = 'You rejected the transaction. Please try again and approve the transaction.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds. Please add ETH to your wallet.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
    }
    
    onStateChange?.(TransactionState.ERROR);
    throw new WalletError(errorMessage);
  }
}

/**
 * Get required fee in wei for a quiz mode
 */
export function getRequiredFeeInWei(_mode: QuizMode): bigint {
  // FREE entry: 0 ETH (no payment required)
  return BigInt(0);
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
    
    const tx = await contract.recordQuizCompletion(userAddress, mode, score);
    await tx.wait();
    console.log('✅ Quiz completion recorded');
  } catch (error: any) {
    console.error('❌ Failed to record completion:', error);
    throw new WalletError(`Failed to record completion: ${error.message}`);
  }
}

/**
 * Get user's quiz count
 */
export async function getUserQuizCount(userAddress: string): Promise<number> {
  try {
    const provider = await connectWallet();
    const contract = await getContract(provider);
    
    const count = await contract.getUserQuizCount(userAddress);
    return count.toNumber();
  } catch (error: any) {
    console.warn('Failed to get user quiz count:', error.message);
    return 0; // Default to 0 for new users
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
}> {
  try {
    const provider = await connectWallet();
    const contract = await getContract(provider);
    
    const [quizCount, stats] = await Promise.all([
      contract.getUserQuizCount(userAddress),
      contract.getStats()
    ]);
    
    return {
      quizCount: quizCount.toNumber(),
      totalQuizzes: stats[0].toNumber(),
      classicQuizzes: stats[1].toNumber(),
      timeQuizzes: stats[2].toNumber(),
      challengeQuizzes: stats[3].toNumber(),
    };
  } catch (error: any) {
    console.warn('Failed to get user quiz stats:', error.message);
    return {
      quizCount: 0,
      totalQuizzes: 0,
      classicQuizzes: 0,
      timeQuizzes: 0,
      challengeQuizzes: 0,
    };
  }
}

/**
 * Format wallet error for display
 */
export function formatWalletError(error: WalletError): string {
  return error.message;
}

/**
 * Check if wallet is connected
 */
export async function isWalletConnected(): Promise<boolean> {
  try {
    if (!window.ethereum) return false;
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();
    return accounts.length > 0;
  } catch (error) {
    console.warn('Failed to check wallet connection:', error);
    return false;
  }
}

/**
 * Get current wallet address
 */
export async function getCurrentWalletAddress(): Promise<string | null> {
  try {
    if (!window.ethereum) return null;
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();
    return accounts.length > 0 ? accounts[0].address : null;
  } catch (error) {
    console.warn('Failed to get wallet address:', error);
    return null;
  }
}