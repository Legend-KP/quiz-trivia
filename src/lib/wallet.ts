import { ethers } from 'ethers';

// Contract configuration
export const CONTRACT_ADDRESS = '0xAdF6B40eB685b448C92d5D2c3f0C1ec997c269c2'; // Deployed on Base Mainnet
export const CONTRACT_ABI = [
  // QuizStarted event
  "event QuizStarted(address indexed user, uint256 indexed mode, uint256 timestamp, uint256 entryFee)",
  // QuizCompleted event  
  "event QuizCompleted(address indexed user, uint256 indexed mode, uint256 score, uint256 timestamp)",
  // Functions
  "function startQuiz(uint8 mode) external payable",
  "function recordQuizCompletion(address user, uint8 mode, uint256 score) external",
  "function getUserQuizCount(address user) external view returns (uint256)",
  "function getStats() external view returns (uint256 total, uint256 classic, uint256 time, uint256 challenge)",
  "function getRequiredFee(uint8 mode) external pure returns (uint256)"
];

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
  // Only support Farcaster Mini App
  if (!isFarcasterMiniAppAvailable()) {
    throw new WalletError('Farcaster Mini App not available. Please use Farcaster to access this app.');
  }

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
    } else {
      throw new WalletError('Farcaster Mini App provider not available');
    }
  } catch (error: any) {
    if (error instanceof WalletError) {
      throw error;
    }
    throw new WalletError(`Failed to connect Farcaster wallet: ${error.message}`);
  }
}

/**
 * Switch to Base Mainnet network
 */
export async function switchToBaseMainnet(): Promise<void> {
  if (!isFarcasterMiniAppAvailable()) {
    throw new WalletError('Farcaster Mini App not available');
  }

  try {
    const farcaster = (window as any).farcaster;
    if (farcaster?.miniApp?.getEthereumProvider) {
      const provider = farcaster.miniApp.getEthereumProvider();
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.chainId }],
      });
    } else {
      throw new WalletError('Farcaster Mini App provider not available');
    }
  } catch (error: any) {
    // If the network doesn't exist, add it
    if (error.code === 4902) {
      try {
        const farcaster = (window as any).farcaster;
        if (farcaster?.miniApp?.getEthereumProvider) {
          const provider = farcaster.miniApp.getEthereumProvider();
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG],
          });
        }
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
  if (!isFarcasterMiniAppAvailable()) {
    throw new WalletError('Farcaster Mini App not available');
  }

  try {
    const farcaster = (window as any).farcaster;
    if (farcaster?.miniApp?.getEthereumProvider) {
      const provider = farcaster.miniApp.getEthereumProvider();
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        throw new WalletError('No accounts found. Please connect your Farcaster wallet.');
      }
      return accounts[0];
    } else {
      throw new WalletError('Farcaster Mini App provider not available');
    }
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
 * Start a quiz with blockchain transaction
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


