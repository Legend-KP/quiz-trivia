/**
 * Utility functions to sync Bet Mode game outcomes with the smart contract
 * 
 * When users win or lose in Bet Mode, we need to update their balance in the contract
 * to keep the on-chain balance in sync with the database.
 */

import { ethers } from 'ethers';
import { getBetModeVaultAddress, BET_MODE_VAULT_ABI } from './betModeVault';
import { getDb } from './mongodb';

const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

/**
 * Get user's wallet address from FID
 */
async function getUserWalletAddress(fid: number): Promise<string | null> {
  const db = await getDb();
  const user = await db.collection('users').findOne({
    fid,
    $or: [
      { walletAddress: { $exists: true, $ne: null } },
      { 'verified_addresses.primary.eth_address': { $exists: true, $ne: null } },
      { 'verified_addresses.eth_addresses': { $exists: true, $ne: [] } },
    ],
  });

  if (!user) {
    return null;
  }

  if (user.walletAddress) {
    return ethers.getAddress(user.walletAddress);
  }

  if (user.verified_addresses?.primary?.eth_address) {
    return ethers.getAddress(user.verified_addresses.primary.eth_address);
  }

  if (user.verified_addresses?.eth_addresses?.length > 0) {
    return ethers.getAddress(user.verified_addresses.eth_addresses[0]);
  }

  return null;
}

/**
 * Get the next balance update nonce for a user
 */
async function getBalanceUpdateNonce(walletAddress: string): Promise<bigint> {
  const contractAddress = getBetModeVaultAddress();
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const contract = new ethers.Contract(contractAddress, BET_MODE_VAULT_ABI, provider);
  
  try {
    const stats = await contract.getUserStats(walletAddress);
    // getUserStats returns: [currentBalance, deposited, withdrawn, nextNonce, nextBalanceUpdateNonce]
    // stats is an array: [currentBalance, deposited, withdrawn, nextNonce, nextBalanceUpdateNonce]
    return stats[4] || 0n; // Return the 5th element (index 4) which is nextBalanceUpdateNonce
  } catch (error) {
    console.error('Error getting balance update nonce:', error);
    return 0n;
  }
}

/**
 * Generate signature for balance update (credit or debit)
 */
async function generateBalanceUpdateSignature(
  wallet: ethers.Wallet,
  userAddress: string,
  amountWei: bigint,
  nonce: bigint,
  chainId: number,
  contractAddress: string,
  action: 'CREDIT' | 'DEBIT'
): Promise<string> {
  // Generate message hash matching contract format
  // keccak256(abi.encodePacked(user, amount, nonce, chainId, contractAddress, action))
  const messageHash = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'uint256', 'uint256', 'address', 'string'],
    [userAddress, amountWei, nonce, chainId, contractAddress, action]
  );
  
  // Use signMessage which applies Ethereum message prefix
  // The contract uses MessageHashUtils.toEthSignedMessageHash which also applies prefix
  // This matches the pattern used in withdraw/prepare route
  return await wallet.signMessage(ethers.getBytes(messageHash));
}

/**
 * Sync balance update to contract (credit or debit)
 * 
 * @param fid User's Farcaster ID
 * @param amount Amount in QT (not Wei)
 * @param action 'CREDIT' for wins, 'DEBIT' for losses
 * @returns Transaction hash if successful, null if failed
 */
export async function syncBalanceUpdate(
  fid: number,
  amount: number,
  action: 'CREDIT' | 'DEBIT'
): Promise<string | null> {
  try {
    // Get user's wallet address
    const walletAddress = await getUserWalletAddress(fid);
    if (!walletAddress) {
      console.warn(`No wallet address found for FID ${fid}`);
      return null;
    }

    // Get admin signer private key
    const adminPrivateKey = process.env.ADMIN_SIGNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!adminPrivateKey) {
      console.error('Admin signer not configured');
      return null;
    }

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    const contractAddress = getBetModeVaultAddress();
    const contract = new ethers.Contract(contractAddress, BET_MODE_VAULT_ABI, adminWallet);

    // Get chain ID
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    // Get next nonce
    const nonce = await getBalanceUpdateNonce(walletAddress);

    // Convert amount to Wei
    const amountWei = ethers.parseEther(amount.toString());

    // Generate signature
    const signature = await generateBalanceUpdateSignature(
      adminWallet,
      walletAddress,
      amountWei,
      nonce,
      chainId,
      contractAddress,
      action
    );

    // Call contract function
    let tx: ethers.ContractTransactionResponse;
    if (action === 'CREDIT') {
      tx = await contract.creditBalance(walletAddress, amountWei, nonce, signature);
    } else {
      tx = await contract.debitBalance(walletAddress, amountWei, nonce, signature);
    }

    console.log(`✅ ${action} balance update sent:`, {
      fid,
      walletAddress,
      amount,
      nonce: nonce.toString(),
      txHash: tx.hash,
    });

    // Wait for confirmation (optional, can be done async)
    // await tx.wait();

    return tx.hash;
  } catch (error: any) {
    console.error(`❌ Error syncing ${action} balance update:`, error);
    return null;
  }
}

