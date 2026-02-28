import { ethers } from 'ethers';
import { getWalletClient } from 'wagmi/actions';
import { encodeFunctionData } from 'viem';
import {
  GAMEPLAY_ENTRY_ADDRESS,
  USDT_ADDRESS_CELO,
  ENTRY_FEE,
  CELO_CHAIN_ID,
  GAMEPLAY_ENTRY_ABI,
  USDT_ABI,
} from './gameplayEntry';

declare global {
  interface Window {
    ethereum?: any;
    farcaster?: any;
  }
}

export const CONTRACT_ADDRESS = GAMEPLAY_ENTRY_ADDRESS;
export const CONTRACT_ABI = GAMEPLAY_ENTRY_ABI;

export enum QuizMode {
  CLASSIC = 0,
  TIME_MODE = 1,
  CHALLENGE = 2,
}

export enum TransactionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONFIRMING = 'confirming',
  SUCCESS = 'success',
  ERROR = 'error',
}

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletError';
  }
}

// ─────────────────────────────────────────────────────────────
// ROOT CAUSE EXPLANATION
//
// "r.connector.getChainId is not a function" happens because:
//
// 1. getWalletClient(config) → wagmi calls connector.getChainId() internally
// 2. switchChain(config, ...) → ALSO calls connector.getChainId() internally
//
// Farcaster's connector (and some WalletConnect modes) never implement
// getChainId, so BOTH of these throw the error.
//
// THE FIX:
// - Never import or call wagmi's switchChain() — it triggers getChainId
// - Always pass chainId to getWalletClient to minimize internal connector calls
// - Detect chain via eth_chainId RPC directly on the client transport
// - Switch chain via wallet_switchEthereumChain RPC directly (not wagmi)
// ─────────────────────────────────────────────────────────────

/**
 * Detect chain ID purely via RPC — never touches connector.getChainId
 */
async function getSafeChainId(client: any): Promise<number> {
  // Method 1: eth_chainId RPC (most reliable, works on all connectors)
  try {
    const hex = await client.request({ method: 'eth_chainId' });
    const id = typeof hex === 'string' ? parseInt(hex, 16) : Number(hex);
    if (id > 0) return id;
  } catch {
    /* fall through */
  }

  // Method 2: client.chain.id (wagmi v2 sometimes populates this)
  if (client?.chain?.id > 0) return client.chain.id;

  // Method 3: net_version RPC as last resort
  try {
    const v = await client.request({ method: 'net_version' });
    const id = Number(v);
    if (id > 0) return id;
  } catch {
    /* fall through */
  }

  throw new WalletError(
    'Could not detect your network. Please make sure your wallet is on Celo Mainnet and try again.'
  );
}

/**
 * Switch to Celo Mainnet using raw RPC calls.
 * NEVER uses wagmi switchChain() — that also internally calls connector.getChainId.
 */
async function switchToCeloViaRPC(client: any): Promise<void> {
  const celoChainHex = '0x' + CELO_CHAIN_ID.toString(16); // 0xa4ec

  try {
    await client.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: celoChainHex }],
    });
    return;
  } catch (switchError: any) {
    const code = switchError?.code ?? switchError?.data?.originalError?.code;

    // 4902 = chain not added to the wallet yet — add it then retry
    if (code === 4902 || switchError?.message?.includes('4902')) {
      try {
        await client.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: celoChainHex,
              chainName: 'Celo Mainnet',
              nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
              rpcUrls: ['https://forno.celo.org'],
              blockExplorerUrls: ['https://celoscan.io'],
            },
          ],
        });
        return;
      } catch {
        throw new WalletError(
          'Could not add Celo Mainnet to your wallet. Please add it manually:\n' +
            'RPC: https://forno.celo.org | Chain ID: 42220'
        );
      }
    }

    // 4001 = user rejected the switch
    if (code === 4001 || switchError?.message?.includes('rejected')) {
      throw new WalletError(
        'You rejected the network switch. Please switch to Celo Mainnet in your wallet and try again.'
      );
    }

    // Farcaster embedded wallets don't support wallet_switchEthereumChain
    // Just inform the user — we cannot force it
    throw new WalletError(
      `Please switch your wallet to Celo Mainnet (Chain ID ${CELO_CHAIN_ID}) and try again.`
    );
  }
}

/**
 * Connect to wallet and return provider (for read-only calls)
 */
export async function connectWallet(): Promise<ethers.BrowserProvider> {
  try {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please install MetaMask or use a Farcaster wallet.');
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
 * Submit score — user pays 0.05 USDT
 *
 * Fixes applied:
 * ✅ getWalletClient called with chainId to prevent connector.getChainId() call
 * ✅ Chain detection via eth_chainId RPC only — not connector API
 * ✅ Chain switching via wallet_switchEthereumChain RPC — not wagmi switchChain()
 * ✅ switchChain import removed entirely from this file
 */
export async function startQuizTransactionWithWagmi(
  _mode: QuizMode,
  config: any,
  onStateChange?: (state: TransactionState) => void
): Promise<string> {
  try {
    onStateChange?.(TransactionState.CONNECTING);

    // ✅ KEY FIX: Pass chainId so wagmi skips calling connector.getChainId()
    let client: any;
    try {
      client = await getWalletClient(config, { chainId: CELO_CHAIN_ID });
    } catch {
      // Fallback: some connectors fail even with chainId hint
      try {
        client = await getWalletClient(config);
      } catch {
        throw new WalletError('Please connect your wallet and try again.');
      }
    }

    if (!client) {
      throw new WalletError('Please connect your wallet first.');
    }

    const userAddress = client.account.address;

    // ✅ Detect chain via RPC — never via connector API
    const currentChainId = await getSafeChainId(client);

    if (currentChainId !== CELO_CHAIN_ID) {
      // ✅ Switch via raw RPC — never via wagmi switchChain()
      await switchToCeloViaRPC(client);

      // Verify the switch worked
      const chainAfterSwitch = await getSafeChainId(client);
      if (chainAfterSwitch !== CELO_CHAIN_ID) {
        throw new WalletError(
          `Still on wrong network (Chain ID: ${chainAfterSwitch}). ` +
            `Please manually switch to Celo Mainnet (Chain ID: ${CELO_CHAIN_ID}).`
        );
      }
    }

    const provider = new ethers.BrowserProvider(client.transport);
    const usdtContract = new ethers.Contract(USDT_ADDRESS_CELO, USDT_ABI, provider);

    // Check USDT balance
    const usdtBalance = await usdtContract.balanceOf(userAddress);
    if (usdtBalance < ENTRY_FEE) {
      throw new WalletError(
        'Insufficient USDT balance. You need at least 0.05 USDT on Celo Mainnet.'
      );
    }

    // Check CELO gas balance
    const celoBalance = await provider.getBalance(userAddress);
    if (celoBalance < ethers.parseEther('0.001')) {
      throw new WalletError(
        'Insufficient CELO for gas. Please add a small amount of CELO to your wallet.'
      );
    }

    // Handle USDT allowance
    const allowance = await usdtContract.allowance(userAddress, GAMEPLAY_ENTRY_ADDRESS);

    if (allowance < ENTRY_FEE) {
      onStateChange?.(TransactionState.CONFIRMING);

      // Reset to 0 first if needed (some USDT implementations require this)
      if (allowance > 0n) {
        const approveZeroData = encodeFunctionData({
          abi: USDT_ABI,
          functionName: 'approve',
          args: [GAMEPLAY_ENTRY_ADDRESS, 0n],
        });
        await client.sendTransaction({
          to: USDT_ADDRESS_CELO as `0x${string}`,
          data: approveZeroData,
          chain: null,
        });
      }

      // Set required allowance
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

    // Submit score — transfers 0.05 USDT to contract
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
  } catch (error: unknown) {
    let errorMessage = 'Unable to submit score. Please try again.';

    if (error instanceof WalletError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      const m = error.message;

      if (m.includes('getChainId is not a function') || m.includes('connector.getChainId')) {
        errorMessage =
          'Wallet connector issue. Please disconnect, reconnect your wallet, and try again.';
      } else if (m.includes('User rejected') || m.includes('rejected') || m.includes('4001')) {
        errorMessage = 'Transaction rejected. Please approve in your wallet to continue.';
      } else if (
        m.includes('CALL_EXCEPTION') ||
        m.includes('execution reverted') ||
        m.includes('missing revert data')
      ) {
        errorMessage =
          'Transaction failed on Celo. Check you have 0.05 USDT and CELO for gas, then retry.';
      } else if (m.includes('Please wait')) {
        errorMessage = 'Rate limit: please wait 10 seconds before submitting again.';
      } else if (m.includes('insufficient') || m.includes('Insufficient')) {
        errorMessage = m;
      } else if (m.includes('Celo') || m.includes('network') || m.includes('chain')) {
        errorMessage = m;
      } else {
        errorMessage = m || errorMessage;
      }

      if (process.env.NODE_ENV === 'development') {
        console.error('[GameplayEntry] error:', error);
      }
    }

    onStateChange?.(TransactionState.ERROR);
    throw new WalletError(errorMessage);
  }
}

export function getRequiredFeeInWei(_mode: QuizMode): bigint {
  return ENTRY_FEE;
}

export async function recordQuizCompletion(
  _userAddress: string,
  _mode: QuizMode,
  _score: number
): Promise<void> {
  throw new WalletError(
    'Score completion is recorded by the game server. Call submitScore() to pay and submit.'
  );
}

export async function getUserQuizCount(userAddress: string): Promise<number> {
  try {
    const provider = await connectWallet();
    const contract = await getContract(provider);
    const count = await contract.getUserSubmissionCount(userAddress);
    return Number(count);
  } catch {
    return 0;
  }
}

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
  } catch {
    return { quizCount: 0, totalQuizzes: 0, classicQuizzes: 0, timeQuizzes: 0, challengeQuizzes: 0 };
  }
}

export function formatWalletError(error: WalletError): string {
  return error.message;
}

export async function isWalletConnected(): Promise<boolean> {
  try {
    if (!window.ethereum) return false;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();
    return accounts.length > 0;
  } catch {
    return false;
  }
}

export async function getCurrentWalletAddress(): Promise<string | null> {
  try {
    if (!window.ethereum) return null;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();
    return accounts.length > 0 ? (await accounts[0].getAddress()) : null;
  } catch {
    return null;
  }
}
