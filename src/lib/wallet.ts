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
// PUBLIC CELO RPC — used for ALL reads
//
// ROOT CAUSE OF "Insufficient funds" WITH FARCASTER:
// When you do `new ethers.BrowserProvider(client.transport)` and
// call balanceOf/allowance through it, Farcaster's transport
// handles eth_call differently and can return 0 or bad data.
//
// FIX: Always use the public Celo RPC for reads.
// Only use the wallet client for WRITES (approve, pay).
// ─────────────────────────────────────────────────────────────
const CELO_RPC = 'https://forno.celo.org';

function getReadProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(CELO_RPC);
}

// ─────────────────────────────────────────────────────────────
// SAFE CHAIN ID — never calls connector.getChainId
// ─────────────────────────────────────────────────────────────
async function getSafeChainId(client: any): Promise<number> {
  try {
    const hex = await client.request({ method: 'eth_chainId' });
    const id = typeof hex === 'string' ? parseInt(hex, 16) : Number(hex);
    if (id > 0) return id;
  } catch {
    /* fall through */
  }

  if (client?.chain?.id > 0) return client.chain.id;

  try {
    const v = await client.request({ method: 'net_version' });
    const id = Number(v);
    if (id > 0) return id;
  } catch {
    /* fall through */
  }

  throw new WalletError(
    'Could not detect your network. Please make sure your wallet is on Celo Mainnet.'
  );
}

// ─────────────────────────────────────────────────────────────
// SWITCH TO CELO — never calls wagmi switchChain()
// ─────────────────────────────────────────────────────────────
async function switchToCeloViaRPC(client: any): Promise<void> {
  const celoChainHex = '0x' + CELO_CHAIN_ID.toString(16);

  try {
    await client.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: celoChainHex }],
    });
    return;
  } catch (switchError: any) {
    const code = switchError?.code ?? switchError?.data?.originalError?.code;

    if (code === 4902 || switchError?.message?.includes('4902')) {
      try {
        await client.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: celoChainHex,
              chainName: 'Celo Mainnet',
              nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
              rpcUrls: [CELO_RPC],
              blockExplorerUrls: ['https://celoscan.io'],
            },
          ],
        });
        return;
      } catch {
        throw new WalletError(
          'Could not add Celo Mainnet. Please add it manually — RPC: https://forno.celo.org | Chain ID: 42220'
        );
      }
    }

    if (code === 4001 || switchError?.message?.includes('rejected')) {
      throw new WalletError(
        'You rejected the network switch. Please switch to Celo Mainnet and try again.'
      );
    }

    throw new WalletError(
      `Please switch your wallet to Celo Mainnet (Chain ID ${CELO_CHAIN_ID}) and try again.`
    );
  }
}

// ─────────────────────────────────────────────────────────────
// SAFE READ — wraps any contract call, returns null on failure
// ─────────────────────────────────────────────────────────────
async function safeRead<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

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

export async function getContract(provider: ethers.BrowserProvider): Promise<ethers.Contract> {
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/**
 * Main function — pays 0.1 USDT to GameplayEntry contract
 *
 * KEY FIXES for Farcaster wallet:
 * ✅ ALL reads use public Celo RPC (forno.celo.org) — not Farcaster transport
 * ✅ Only WRITES use the wallet client (approve, pay)
 * ✅ No wagmi switchChain() — uses raw RPC
 * ✅ No connector.getChainId() — uses eth_chainId RPC
 * ✅ safeRead() on all pre-checks — never blocks user on read failure
 */
export async function startQuizTransactionWithWagmi(
  _mode: QuizMode,
  config: any,
  onStateChange?: (state: TransactionState) => void
): Promise<string> {
  try {
    onStateChange?.(TransactionState.CONNECTING);

    // ── Step 1: Get wallet client ──────────────────────────────
    let client: any;
    try {
      client = await getWalletClient(config, { chainId: CELO_CHAIN_ID });
    } catch {
      try {
        client = await getWalletClient(config);
      } catch {
        throw new WalletError('Please connect your wallet and try again.');
      }
    }
    if (!client) throw new WalletError('Please connect your wallet first.');

    const userAddress = client.account.address;

    // ── Step 2: Chain check + switch via raw RPC ───────────────
    const currentChainId = await getSafeChainId(client);
    if (currentChainId !== CELO_CHAIN_ID) {
      await switchToCeloViaRPC(client);
      const chainAfter = await getSafeChainId(client);
      if (chainAfter !== CELO_CHAIN_ID) {
        throw new WalletError(
          `Please manually switch to Celo Mainnet (Chain ID: ${CELO_CHAIN_ID}).`
        );
      }
    }

    // ── Step 3: ALL reads via public Celo RPC ──────────────────
    const readProvider = getReadProvider();
    const usdtRead = new ethers.Contract(USDT_ADDRESS_CELO, USDT_ABI, readProvider);
    const gameplayRead = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);

    // ── Step 4: Contract state pre-checks (non-blocking) ───────
    const [isPaused, canPayNow] = await Promise.all([
      safeRead(() => gameplayRead.paused()),
      safeRead(() => gameplayRead.canPay(userAddress)),
    ]);

    if (isPaused === true) {
      throw new WalletError('The contract is temporarily paused. Please try again later.');
    }

    if (canPayNow === false) {
      const secsLeft = await safeRead(() => gameplayRead.secondsUntilCanPay(userAddress));
      const wait = secsLeft != null ? Number(secsLeft) : 10;
      throw new WalletError(
        `Rate limit: please wait ${Math.ceil(wait)} seconds before paying again.`
      );
    }

    // ── Step 5: USDT balance check via public RPC ──────────────
    const usdtBalance = await safeRead(() => usdtRead.balanceOf(userAddress));
    if (usdtBalance !== null && BigInt(usdtBalance.toString()) < ENTRY_FEE) {
      throw new WalletError(
        `Insufficient USDT balance. You have ${Number(usdtBalance) / 1_000_000} USDT but need 0.1 USDT on Celo Mainnet.`
      );
    }

    // ── Step 6: CELO gas balance via public RPC ────────────────
    const celoBalance = await safeRead(() => readProvider.getBalance(userAddress));
    if (celoBalance !== null && celoBalance < ethers.parseEther('0.001')) {
      throw new WalletError(
        `Insufficient CELO for gas. You have ${ethers.formatEther(celoBalance)} CELO but need at least 0.001 CELO.`
      );
    }

    // ── Step 7: USDT allowance check via public RPC ────────────
    const allowance = await safeRead(() =>
      usdtRead.allowance(userAddress, CONTRACT_ADDRESS)
    );
    const currentAllowance = allowance !== null ? BigInt(allowance.toString()) : 0n;

    // ── Step 8: Approve USDT if needed (WRITE via wallet) ──────
    if (currentAllowance < ENTRY_FEE) {
      onStateChange?.(TransactionState.CONFIRMING);

      if (currentAllowance > 0n) {
        const approveZeroData = encodeFunctionData({
          abi: USDT_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS as `0x${string}`, 0n],
        });
        await client.sendTransaction({
          to: USDT_ADDRESS_CELO as `0x${string}`,
          data: approveZeroData,
          chain: null,
        });
        await new Promise((r) => setTimeout(r, 5000));
      }

      const approveData = encodeFunctionData({
        abi: USDT_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS as `0x${string}`, ENTRY_FEE],
      });
      await client.sendTransaction({
        to: USDT_ADDRESS_CELO as `0x${string}`,
        data: approveData,
        chain: null,
      });

      await new Promise((r) => setTimeout(r, 6000));

      const allowanceAfter = await safeRead(() =>
        usdtRead.allowance(userAddress, CONTRACT_ADDRESS)
      );
      if (
        allowanceAfter !== null &&
        BigInt(allowanceAfter.toString()) < ENTRY_FEE
      ) {
        throw new WalletError(
          'USDT approval did not go through. Please try again and approve the full 0.1 USDT amount.'
        );
      }
    }

    onStateChange?.(TransactionState.CONFIRMING);

    // ── Step 9: Call pay() on GameplayEntry (WRITE via wallet) ─
    const payData = encodeFunctionData({
      abi: CONTRACT_ABI,
      functionName: 'pay',
      args: [],
    });

    const txHash = await client.sendTransaction({
      to: CONTRACT_ADDRESS as `0x${string}`,
      data: payData,
      chain: null,
    });

    onStateChange?.(TransactionState.SUCCESS);
    return txHash;
  } catch (error: unknown) {
    let errorMessage = 'Unable to process payment. Please try again.';

    if (error instanceof WalletError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      const m = error.message;

      if (m.includes('getChainId is not a function') || m.includes('connector.getChainId')) {
        errorMessage =
          'Wallet connector issue. Please disconnect, reconnect your wallet, and try again.';
      } else if (m.includes('User rejected') || m.includes('rejected') || m.includes('4001')) {
        errorMessage = 'Transaction rejected. Please approve in your wallet to continue.';
      } else if (m.includes('missing revert data') || m.includes('CALL_EXCEPTION')) {
        errorMessage =
          'Transaction failed. Make sure you have 0.1 USDT and CELO for gas on Celo Mainnet.';
      } else if (m.includes('insufficient') || m.includes('Insufficient')) {
        errorMessage = m;
      } else if (m.includes('Rate limit') || m.includes('wait')) {
        errorMessage = m;
      } else if (m.includes('paused')) {
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
  throw new WalletError('Score completion is recorded by the game server.');
}

// ── Read functions — all use public RPC, never wallet transport ──

export async function getUserQuizCount(userAddress: string): Promise<number> {
  try {
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      getReadProvider()
    );
    const count = await contract.getPayCount(userAddress);
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
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      getReadProvider()
    );
    const [quizCount, totalPayments] = await Promise.all([
      contract.getPayCount(userAddress),
      contract.totalPayments(),
    ]);
    return {
      quizCount: Number(quizCount),
      totalQuizzes: Number(totalPayments),
      classicQuizzes: 0,
      timeQuizzes: 0,
      challengeQuizzes: 0,
    };
  } catch {
    return {
      quizCount: 0,
      totalQuizzes: 0,
      classicQuizzes: 0,
      timeQuizzes: 0,
      challengeQuizzes: 0,
    };
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
