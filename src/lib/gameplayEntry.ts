/**
 * GameplayEntry contract integration (Celo Mainnet)
 * Users pay 0.05 USDT to submit score via submitScore()
 *
 * Optional: set NEXT_PUBLIC_GAMEPLAY_ENTRY_ADDRESS in .env / Vercel to override.
 */

const DEFAULT_GAMEPLAY_ENTRY = '0xbb7fe4B68Da02f6993652d458239c6F47Fd14D37';
export const GAMEPLAY_ENTRY_ADDRESS = (
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GAMEPLAY_ENTRY_ADDRESS?.trim()
    ? process.env.NEXT_PUBLIC_GAMEPLAY_ENTRY_ADDRESS.trim()
    : DEFAULT_GAMEPLAY_ENTRY
) as `0x${string}`;
export const USDT_ADDRESS_CELO = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as const;
export const ENTRY_FEE = 50_000n; // 0.05 USDT (6 decimals)
export const CELO_CHAIN_ID = 42220;

export const GAMEPLAY_ENTRY_ABI = [
  { inputs: [{ internalType: 'address', name: '_gameServer', type: 'address' }], stateMutability: 'nonpayable', type: 'constructor' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'by', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }], name: 'ContractPaused', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'by', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }], name: 'ContractUnpaused', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'previousServer', type: 'address' }, { indexed: true, internalType: 'address', name: 'newServer', type: 'address' }], name: 'GameServerUpdated', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'user', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'score', type: 'uint256' }, { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }], name: 'GameplayCompleted', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'user', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }, { indexed: false, internalType: 'uint256', name: 'feePaid', type: 'uint256' }], name: 'ScoreSubmitted', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'owner', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }, { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }], name: 'Withdrawn', type: 'event' },
  { stateMutability: 'payable', type: 'fallback' },
  { inputs: [], name: 'ENTRY_FEE', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'RATE_LIMIT_SECONDS', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'USDT_ADDRESS', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'user', type: 'address' }], name: 'canUserSubmit', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'gameServer', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getBalance', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getEntryFee', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'pure', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'user', type: 'address' }], name: 'getPendingCompletions', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getStats', outputs: [{ internalType: 'uint256', name: 'total', type: 'uint256' }, { internalType: 'uint256', name: 'fees', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'user', type: 'address' }], name: 'getUserSubmissionCount', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'lastSubmissionTime', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'pause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'paused', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'pendingCompletions', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'user', type: 'address' }, { internalType: 'uint256', name: 'score', type: 'uint256' }], name: 'recordGameplayCompletion', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'submitScore', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'totalFeesCollected', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSubmissions', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'unpause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'newGameServer', type: 'address' }], name: 'updateGameServer', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'usdt', outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'userSubmissionCount', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'withdraw', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { stateMutability: 'payable', type: 'receive' },
] as const;

export const USDT_ABI = [
  { inputs: [{ internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;
