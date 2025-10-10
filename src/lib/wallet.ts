import { ethers } from 'ethers';
import { getWalletClient } from 'wagmi/actions';
import { encodeFunctionData, parseUnits } from 'viem';
import { useAccount } from 'wagmi';

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
    farcaster?: any;
  }
}

// Contract configuration
export const CONTRACT_ADDRESS = '0xAdF6B40eB685b448C92d5D2c3f0C1ec997c269c2'; // Deployed on Base Mainnet
export const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "mode", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "score", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "QuizCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "mode", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "entryFee", "type": "uint256" }
    ],
    "name": "QuizStarted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "CHALLENGE_FEE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CLASSIC_FEE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TIME_MODE_FEE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "enum QuizTriviaEntry.QuizMode", "name": "mode", "type": "uint8" }],
    "name": "getRequiredFee",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getStats",
    "outputs": [
      { "internalType": "uint256", "name": "total", "type": "uint256" },
      { "internalType": "uint256", "name": "classic", "type": "uint256" },
      { "internalType": "uint256", "name": "time", "type": "uint256" },
      { "internalType": "uint256", "name": "challenge", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserQuizCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "enum QuizTriviaEntry.QuizMode", "name": "", "type": "uint8" }],
    "name": "modeCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "enum QuizTriviaEntry.QuizMode", "name": "mode", "type": "uint8" },
      { "internalType": "uint256", "name": "score", "type": "uint256" }
    ],
    "name": "recordQuizCompletion",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "enum QuizTriviaEntry.QuizMode", "name": "mode", "type": "uint8" }],
    "name": "startQuiz",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalQuizzes",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "userQuizCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Quiz modes matching the smart contract
export enum QuizMode {
  CLASSIC = 0,
  TIME_MODE = 1,
  CHALLENGE = 2
}

// Network configuration for Base Mainnet
export const NETWORK_CONFIG = {
  chainId: '0x2105', // 8453 in hex
  chainName: 'Base',
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  }
};

// Transaction states
export enum TransactionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONFIRMING = 'confirming',
  SUCCESS = 'success',
  ERROR = 'error'
}

// Error types
export class WalletError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'WalletError';
  }
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Check if Farcaster Mini App is available
 */
export function isFarcasterMiniAppAvailable(): boolean {
  return typeof window !== 'undefined' && 
    ((window as any).farcaster?.miniApp || 
     (window as any).farcaster?.context ||
     typeof (window as any).farcaster !== 'undefined');
}

/**
 * Request account access and get signer
 */
export async function connectWallet(): Promise<ethers.BrowserProvider> {
  // Check for Farcaster Mini App first
  if (isFarcasterMiniAppAvailable()) {
    try {
      // Use Farcaster Mini App provider
      const farcaster = (window as any).farcaster;
      if (farcaster?.miniApp?.getEthereumProvider) {
        const provider = farcaster.miniApp.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        
        // Check if we're on the correct network
        const network = await ethersProvider.getNetwork();
        if (Number(network.chainId) !== 8453) { // Base Mainnet chain ID
          await switchToBaseMainnet();
        }
        
        return ethersProvider;
      }
    } catch (error: any) {
      console.warn('Farcaster Mini App connection failed:', error);
    }
  }

  // Check for Farcaster Frame provider
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      // Use Farcaster Frame provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Check if we're on the correct network
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 8453) { // Base Mainnet chain ID
        await switchToBaseMainnet();
      }
      
      return provider;
    } catch (error: any) {
      console.warn('Farcaster Frame connection failed:', error);
    }
  }

  throw new WalletError('No Farcaster wallet found. Please use Farcaster to continue.');
}

/**
 * Switch to Base Mainnet network
 */
export async function switchToBaseMainnet(): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new WalletError('No wallet provider found');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: NETWORK_CONFIG.chainId }],
    });
  } catch (error: any) {
    // If the network doesn't exist, add it
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [NETWORK_CONFIG],
        });
      } catch (addError: any) {
        throw new WalletError(`Failed to add Base Mainnet network: ${addError.message}`);
      }
    } else {
      throw new WalletError(`Failed to switch to Base Mainnet: ${error.message}`);
    }
  }
}

/**
 * Get the current account address
 */
export async function getCurrentAccount(): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new WalletError('No wallet provider found');
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length === 0) {
      throw new WalletError('No accounts found. Please connect your Farcaster wallet.');
    }
    return accounts[0];
  } catch (error: any) {
    throw new WalletError(`Failed to get account: ${error.message}`);
  }
}

/**
 * Get contract instance
 */
export async function getContract(provider: ethers.BrowserProvider) {
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/**
 * Start a quiz with Farcaster wallet transaction (using Wagmi)
 */
export async function startQuizTransactionWithWagmi(
  mode: QuizMode,
  config: any,
  onStateChange?: (state: TransactionState) => void
): Promise<string> {
  try {
    onStateChange?.(TransactionState.CONNECTING);
    
    // Try to get wallet client from Wagmi
    let client;
    try {
      client = await getWalletClient(config);
    } catch (connectorError: any) {
      // If getWalletClient fails due to connector issues, try alternative approach
      if (connectorError.message?.includes('getChainId is not a function')) {
        throw new WalletError('Wallet connection issue. Please try reconnecting your wallet.');
      }
      throw connectorError;
    }
    
    if (!client) {
      throw new WalletError('Wallet not connected');
    }
    
    // Get required fee (hardcoded for now, can be fetched from contract)
    const requiredFee = getRequiredFeeForMode(mode);
    
    onStateChange?.(TransactionState.CONFIRMING);
    
    // Encode the startQuiz function call
    const txData = encodeFunctionData({
      abi: CONTRACT_ABI,
      functionName: 'startQuiz',
      args: [mode],
    });
    
    // Send transaction using Farcaster wallet
    const txHash = await client.sendTransaction({
      to: CONTRACT_ADDRESS as `0x${string}`,
      data: txData,
      value: parseUnits(requiredFee.toString(), 18),
    });
    
    onStateChange?.(TransactionState.SUCCESS);
    
    return txHash;
  } catch (error: any) {
    onStateChange?.(TransactionState.ERROR);
    
    if (error instanceof WalletError) {
      throw error;
    }
    
    // Handle common error cases
    if (error.code === 4001) {
      throw new WalletError('Transaction rejected by user');
    } else if (error.code === -32603) {
      throw new WalletError('Transaction failed. Please try again.');
    } else if (error.message?.includes('insufficient funds')) {
      throw new WalletError('Insufficient funds for transaction');
    } else if (error.message?.includes('gas')) {
      throw new WalletError('Transaction failed due to gas issues');
    } else if (error.message?.includes('getChainId is not a function')) {
      throw new WalletError('Wallet connection issue. Please try reconnecting your wallet.');
    }
    
    throw new WalletError(`Transaction failed: ${error.message}`);
  }
}

/**
 * Get required fee for quiz mode
 */
function getRequiredFeeForMode(mode: QuizMode): number {
  switch (mode) {
    case QuizMode.CLASSIC:
      return 0.001; // 0.001 ETH
    case QuizMode.TIME_MODE:
      return 0.001; // 0.001 ETH
    case QuizMode.CHALLENGE:
      return 0.001; // 0.001 ETH
    default:
      return 0.001;
  }
}

/**
 * Start a quiz with blockchain transaction (legacy method)
 */
export async function startQuizTransaction(
  mode: QuizMode,
  onStateChange?: (state: TransactionState) => void
): Promise<string> {
  try {
    onStateChange?.(TransactionState.CONNECTING);
    
    // Connect wallet
    const provider = await connectWallet();
    const contract = await getContract(provider);
    
    // Get required fee
    const requiredFee = await contract.getRequiredFee(mode);
    
    onStateChange?.(TransactionState.CONFIRMING);
    
    // Start the transaction
    const tx = await contract.startQuiz(mode, {
      value: requiredFee
    });
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    onStateChange?.(TransactionState.SUCCESS);
    
    return receipt.transactionHash;
  } catch (error: any) {
    onStateChange?.(TransactionState.ERROR);
    
    if (error instanceof WalletError) {
      throw error;
    }
    
    // Handle common error cases
    if (error.code === 4001) {
      throw new WalletError('Transaction rejected by user');
    } else if (error.code === -32603) {
      throw new WalletError('Transaction failed. Please try again.');
    } else if (error.message?.includes('insufficient funds')) {
      throw new WalletError('Insufficient funds for transaction');
    } else if (error.message?.includes('gas')) {
      throw new WalletError('Transaction failed due to gas issues');
    }
    
    throw new WalletError(`Transaction failed: ${error.message}`);
  }
}

/**
 * Record quiz completion (optional - can be called by frontend)
 */
export async function recordQuizCompletion(
  userAddress: string,
  mode: QuizMode,
  score: number
): Promise<string> {
  try {
    const provider = await connectWallet();
    const contract = await getContract(provider);
    
    const tx = await contract.recordQuizCompletion(userAddress, mode, score);
    const receipt = await tx.wait();
    
    return receipt.transactionHash;
  } catch (error: any) {
    throw new WalletError(`Failed to record completion: ${error.message}`);
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
      totalQuizzes: stats.total.toNumber(),
      classicQuizzes: stats.classic.toNumber(),
      timeQuizzes: stats.time.toNumber(),
      challengeQuizzes: stats.challenge.toNumber()
    };
  } catch (error: any) {
    throw new WalletError(`Failed to get stats: ${error.message}`);
  }
}

/**
 * Format error message for user display
 */
export function formatWalletError(error: WalletError): string {
  switch (error.code) {
    case '4001':
      return 'Transaction was cancelled';
    case '4902':
      return 'Please switch to Base Sepolia network';
    default:
      return error.message || 'An unknown error occurred';
  }
}

/**
 * Get network name from chain ID
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 84532:
      return 'Base Sepolia';
    case 1:
      return 'Ethereum Mainnet';
    case 11155111:
      return 'Sepolia';
    default:
      return `Chain ${chainId}`;
  }
}


