/**
 * GameplayEntry contract integration (Celo Mainnet) — v5.1
 * Users pay 0.1 USDT via pay(); rate limit 10s, reentrancy guard, CEI pattern.
 *
 * Optional: set NEXT_PUBLIC_GAMEPLAY_ENTRY_ADDRESS in .env / Vercel to override.
 */

const DEFAULT_GAMEPLAY_ENTRY = '0xa4303482605aAEB0bAC78F184f2f132D5e8A132F';
export const GAMEPLAY_ENTRY_ADDRESS = (
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GAMEPLAY_ENTRY_ADDRESS?.trim()
    ? process.env.NEXT_PUBLIC_GAMEPLAY_ENTRY_ADDRESS.trim()
    : DEFAULT_GAMEPLAY_ENTRY
) as `0x${string}`;
// Official Celo Mainnet USDT (Tether) — same as GameplayEntry.sol USDT constant
export const USDT_ADDRESS_CELO = '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as const;
export const ENTRY_FEE = 100_000n; // 0.1 USDT (6 decimals) — matches contract FEE
export const CELO_CHAIN_ID = 42220;

export const GAMEPLAY_ENTRY_ABI = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'by', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }], name: 'ContractPaused', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'by', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }], name: 'ContractUnpaused', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'user', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }], name: 'FeePaid', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'previousOwner', type: 'address' }, { indexed: true, internalType: 'address', name: 'newOwner', type: 'address' }], name: 'OwnershipTransferred', type: 'event' },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'address', name: 'to', type: 'address' }, { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }, { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }], name: 'Withdrawn', type: 'event' },
  { stateMutability: 'payable', type: 'fallback' },
  { inputs: [], name: 'FEE', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'RATE_LIMIT_SECONDS', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'USDT', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'user', type: 'address' }], name: 'canPay', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getBalance', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'user', type: 'address' }], name: 'getPayCount', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'lastPaymentTime', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'pause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'paused', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'pay', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'address', name: '', type: 'address' }], name: 'payCount', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'user', type: 'address' }], name: 'secondsUntilCanPay', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalCollected', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalWithdrawn', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalPayments', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getStats', outputs: [{ internalType: 'uint256', name: 'lifetimeCollected', type: 'uint256' }, { internalType: 'uint256', name: 'currentBalance', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'unpause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'withdraw', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { stateMutability: 'payable', type: 'receive' },
] as const;

export const USDT_ABI = [
  { inputs: [{ internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;
