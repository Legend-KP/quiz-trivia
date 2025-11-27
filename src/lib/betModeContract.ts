/**
 * BetModeVault Contract Interaction Utilities
 * 
 * This module provides functions to interact with the BetModeVault smart contract
 * from the backend, specifically for syncing game outcomes (wins/losses) to the contract.
 */

import { ethers } from 'ethers';
import { BET_MODE_VAULT_ABI, getBetModeVaultAddress } from './betModeVault';

/**
 * Get contract instance with owner wallet
 */
function getContractWithOwner(): {
  contract: ethers.Contract;
  provider: ethers.JsonRpcProvider;
} | null {
  const contractAddress = getBetModeVaultAddress();
  const ownerPrivateKey = process.env.CONTRACT_OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

  if (!ownerPrivateKey) {
    console.warn('⚠️ CONTRACT_OWNER_PRIVATE_KEY not configured - contract sync disabled');
    return null;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);
    const contract = new ethers.Contract(contractAddress, BET_MODE_VAULT_ABI, ownerWallet);
    
    return { contract, provider };
  } catch (error) {
    console.error('❌ Failed to initialize contract:', error);
    return null;
  }
}

/**
 * Credit winnings to user's contract balance
 * @param userAddress User's wallet address (optional - if not provided, sync is skipped)
 * @param profitAmount Profit amount (payout - betAmount) in QT tokens (not wei)
 * @returns Transaction hash if successful, null if skipped
 */
export async function creditWinnings(
  userAddress: string | null | undefined,
  profitAmount: number
): Promise<string | null> {
  // Skip if wallet address not provided
  if (!userAddress) {
    console.log('⚠️ Contract sync skipped - wallet address not provided');
    return null;
  }

  const contractSetup = getContractWithOwner();
  if (!contractSetup) {
    console.warn('⚠️ Contract sync skipped - owner wallet not configured');
    return null;
  }

  const { contract } = contractSetup;

  try {
    // Convert QT amount to wei (18 decimals)
    const amountWei = ethers.parseEther(profitAmount.toString());
    
    console.log(`🔄 Crediting winnings: ${userAddress} -> ${profitAmount} QT (${amountWei.toString()} wei)`);
    
    // Call contract function
    const tx = await contract.creditWinnings(userAddress, amountWei);
    console.log(`📤 Transaction sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log(`✅ Winnings credited successfully: ${tx.hash}`);
      return tx.hash;
    } else {
      console.error(`❌ Transaction failed: ${tx.hash}`);
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error crediting winnings:', error);
    // Don't throw - log error for manual reconciliation
    return null;
  }
}

/**
 * Debit loss from user's contract balance
 * @param userAddress User's wallet address (optional - if not provided, sync is skipped)
 * @param betAmount Bet amount lost in QT tokens (not wei)
 * @returns Transaction hash if successful, null if skipped
 */
export async function debitLoss(
  userAddress: string | null | undefined,
  betAmount: number
): Promise<string | null> {
  // Skip if wallet address not provided
  if (!userAddress) {
    console.log('⚠️ Contract sync skipped - wallet address not provided');
    return null;
  }

  const contractSetup = getContractWithOwner();
  if (!contractSetup) {
    console.warn('⚠️ Contract sync skipped - owner wallet not configured');
    return null;
  }

  const { contract } = contractSetup;

  try {
    // Convert QT amount to wei (18 decimals)
    const amountWei = ethers.parseEther(betAmount.toString());
    
    console.log(`🔄 Debiting loss: ${userAddress} -> ${betAmount} QT (${amountWei.toString()} wei)`);
    
    // Call contract function
    const tx = await contract.debitLoss(userAddress, amountWei);
    console.log(`📤 Transaction sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log(`✅ Loss debited successfully: ${tx.hash}`);
      return tx.hash;
    } else {
      console.error(`❌ Transaction failed: ${tx.hash}`);
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error debiting loss:', error);
    // Don't throw - log error for manual reconciliation
    return null;
  }
}

/**
 * Adjust user balance to match database (for reconciliation)
 * @param userAddress User's wallet address
 * @param newBalance New balance in QT tokens (not wei)
 * @returns Transaction hash if successful, null if skipped
 */
export async function adjustBalance(
  userAddress: string,
  newBalance: number
): Promise<string | null> {
  const contractSetup = getContractWithOwner();
  if (!contractSetup) {
    console.warn('⚠️ Contract sync skipped - owner wallet not configured');
    return null;
  }

  const { contract } = contractSetup;

  try {
    // Convert QT amount to wei (18 decimals)
    const balanceWei = ethers.parseEther(newBalance.toString());
    
    console.log(`🔄 Adjusting balance: ${userAddress} -> ${newBalance} QT (${balanceWei.toString()} wei)`);
    
    // Call contract function
    const tx = await contract.adjustBalance(userAddress, balanceWei);
    console.log(`📤 Transaction sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log(`✅ Balance adjusted successfully: ${tx.hash}`);
      return tx.hash;
    } else {
      console.error(`❌ Transaction failed: ${tx.hash}`);
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error adjusting balance:', error);
    // Don't throw - log error for manual reconciliation
    return null;
  }
}

/**
 * Get user's wallet address from FID
 * @param fid User's Farcaster ID
 * @returns Wallet address or null if not found
 */
export async function getUserWalletAddress(fid: number): Promise<string | null> {
  try {
    const { getCurrencyAccountsCollection } = await import('./mongodb');
    const accounts = await getCurrencyAccountsCollection();
    const account = await accounts.findOne({ fid });
    
    // Check if walletAddress field exists in account document
    return (account as any)?.walletAddress || null;
  } catch (error) {
    console.error('❌ Error getting user wallet address:', error);
    return null;
  }
}

/**
 * Check if contract sync is enabled
 * @returns true if contract owner wallet is configured
 */
export function isContractSyncEnabled(): boolean {
  const ownerPrivateKey = process.env.CONTRACT_OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  return !!ownerPrivateKey;
}

