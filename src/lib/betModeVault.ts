/**
 * BetModeVault Smart Contract ABI and Utilities
 * 
 * This contract holds all user QT tokens in a custodial vault.
 * Users deposit/withdraw through the contract, and events sync to database.
 */

export const BET_MODE_VAULT_ABI = [
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserStats',
    outputs: [
      { name: 'currentBalance', type: 'uint256' },
      { name: 'deposited', type: 'uint256' },
      { name: 'withdrawn', type: 'uint256' },
      { name: 'nextNonce', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'withdrawalNonces',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getContractBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'qtToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'adminSigner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MIN_DEPOSIT',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
    constant: true,
  },
  {
    inputs: [],
    name: 'MIN_WITHDRAWAL',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
    constant: true,
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'newBalance', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'Deposited',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'newBalance', type: 'uint256' },
      { indexed: false, name: 'nonce', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'Withdrawn',
    type: 'event',
  },
] as const;

/**
 * Get BetModeVault contract address from environment
 */
export function getBetModeVaultAddress(): `0x${string}` {
  const address =
    process.env.NEXT_PUBLIC_BET_MODE_VAULT_ADDRESS ||
    process.env.BET_MODE_VAULT_ADDRESS;
  
  if (!address) {
    throw new Error('BET_MODE_VAULT_ADDRESS not configured');
  }
  
  return address as `0x${string}`;
}

/**
 * Minimum deposit amount (1K QT)
 */
export const MIN_DEPOSIT_VAULT = 1_000 * 1e18; // 1K QT in wei

/**
 * Minimum withdrawal amount (1K QT)
 */
export const MIN_WITHDRAWAL_VAULT = 1_000 * 1e18; // 1K QT in wei

