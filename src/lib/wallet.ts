import { ethers } from 'ethers';
import { getWalletClient, switchChain } from 'wagmi/actions';
import { encodeFunctionData } from 'viem';
import {
  GAMEPLAY_ENTRY_ADDRESS,
  USDT_ADDRESS_CELO,
  ENTRY_FEE,
  CELO_CHAIN_ID,
  GAMEPLAY_ENTRY_ABI,
  USDT_ABI,
} from './gameplayEntry';

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
    farcaster?: any;
  }
}

// GameplayEntry contract on Celo Mainnet - users pay 0.05 USDT to submit score
export const CONTRACT_ADDRESS = GAMEPLAY_ENTRY_ADDRESS;
export const CONTRACT_ABI = GAMEPLAY_ENTRY_ABI;

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
 * Submit score via GameplayEntry contract on Celo.
 * User pays 0.05 USDT to submit. Requires USDT approval first.
 */
export async function startQuizTransactionWithWagmi(
  _mode: QuizMode,
  config: any,
  onStateChange?: (state: TransactionState) => void
): Promise<string> {
  try {
    onStateChange?.(TransactionState.CONNECTING);

    const client = await getWalletClient(config);
    if (!client) {
      throw new WalletError('Please connect your wallet first');
    }

    const userAddress = client.account.address;

    // Switch to Celo Mainnet if needed
    try {
      const chainId = await client.getChainId();
      if (chainId !== CELO_CHAIN_ID) {
        await switchChain(config, { chainId: CELO_CHAIN_ID });
      }
    } catch (chainError) {
      // If switch fails, user may need to add Celo manually
    }

    const provider = new ethers.BrowserProvider(client.transport);

    // Check USDT balance
    const usdtContract = new ethers.Contract(USDT_ADDRESS_CELO, USDT_ABI, provider);
    const usdtBalance = await usdtContract.balanceOf(userAddress);
    if (usdtBalance < ENTRY_FEE) {
      throw new WalletError('Insufficient USDT balance. You need at least 0.05 USDT to submit your score.');
    }

    // Check CELO balance for gas
    const celoBalance = await provider.getBalance(userAddress);
    const minGasBalance = ethers.parseEther('0.001');
    if (celoBalance < minGasBalance) {
      throw new WalletError('Insufficient CELO for gas. You need a small amount of CELO for transaction fees.');
    }

    // Check if we need to approve USDT
    const allowance = await usdtContract.allowance(userAddress, GAMEPLAY_ENTRY_ADDRESS);
    if (allowance < ENTRY_FEE) {
      onStateChange?.(TransactionState.CONFIRMING);
      const approveData = encodeFunctionData({
        abi: USDT_ABI,
        functionName: 'approve',
        args: [GAMEPLAY_ENTRY_ADDRESS, ENTRY_FEE],
      });
      await client.sendTransaction({
        to: USDT_ADDRESS_CELO as `0x${string}`,
        data: approveData,
        chain: null,
      });
    }

    onStateChange?.(TransactionState.CONFIRMING);

    // Submit score (transfers 0.05 USDT to contract)
    const submitData = encodeFunctionData({
      abi: CONTRACT_ABI,
      functionName: 'submitScore',
      args: [],
    });

    const txHash = await client.sendTransaction({
      to: CONTRACT_ADDRESS as `0x${string}`,
      data: submitData,
      chain: null,
    });

    onStateChange?.(TransactionState.SUCCESS);
    return txHash;
  } catch (error) {
    let errorMessage = 'Unable to submit score. Please try again.';

    if (error instanceof WalletError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      if (error.message.includes('User rejected') || error.message.includes('rejected')) {
        errorMessage = 'You rejected the transaction. Please try again and approve the transaction.';
      } else if (error.message.includes('insufficient') || error.message.includes('Insufficient')) {
        errorMessage = error.message;
      } else if (error.message.includes('Please wait')) {
        errorMessage = 'Please wait 10 seconds before submitting again (rate limit).';
      }
    }

    onStateChange?.(TransactionState.ERROR);
    throw new WalletError(errorMessage);
  }
}

/**
 * Get required fee (0.05 USDT for GameplayEntry)
 */
export function getRequiredFeeInWei(_mode: QuizMode): bigint {
  return ENTRY_FEE;
}

/**
 * Record quiz completion - GameplayEntry uses recordGameplayCompletion which is
 * only callable by the game server. Frontend should not call this.
 */
export async function recordQuizCompletion(
  _userAddress: string,
  _mode: QuizMode,
  _score: number
): Promise<void> {
  throw new WalletError(
    'Completion is recorded by the game server after you submit. Use submitScore to pay and submit.'
  );
}

/**
 * Get user's submission count (GameplayEntry)
 */
export async function getUserQuizCount(userAddress: string): Promise<number> {
  try {
    const provider = await connectWallet();
    const contract = await getContract(provider);
    const count = await contract.getUserSubmissionCount(userAddress);
    return Number(count);
  } catch (error: any) {
    return 0;
  }
}

/**
 * Get user's quiz statistics (GameplayEntry)
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
      contract.getUserSubmissionCount(userAddress),
      contract.getStats(),
    ]);
    return {
      quizCount: Number(quizCount),
      totalQuizzes: Number(stats[0]),
      classicQuizzes: 0,
      timeQuizzes: 0,
      challengeQuizzes: 0,
    };
  } catch (error: any) {
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
    return null;
  }
}