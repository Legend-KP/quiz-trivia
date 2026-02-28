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
  { inputs: [], name: 'submitScore', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'getEntryFee', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'pure', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'user', type: 'address' }], name: 'canUserSubmit', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'user', type: 'address' }], name: 'getUserSubmissionCount', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getStats', outputs: [{ internalType: 'uint256', name: 'total', type: 'uint256' }, { internalType: 'uint256', name: 'fees', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;

export const USDT_ABI = [
  { inputs: [{ internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;
