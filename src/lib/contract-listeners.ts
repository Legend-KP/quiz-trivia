/**
 * BetModeVault Contract Event Listeners
 * 
 * Listens to Deposited and Withdrawn events and automatically updates the database.
 * This service runs continuously in the background.
 */

import { ethers, EventLog } from 'ethers';
import {
  getCurrencyAccountsCollection,
  getQTTransactionsCollection,
} from '~/lib/mongodb';
import { BET_MODE_VAULT_ABI, getBetModeVaultAddress } from './betModeVault';

// Contract configuration
const CONTRACT_ADDRESS = process.env.BET_MODE_VAULT_ADDRESS;
const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;
let isListening = false;

/**
 * Initialize contract connection
 */
function initializeContract() {
  if (!CONTRACT_ADDRESS) {
    return false;
  }

  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    contract = new ethers.Contract(CONTRACT_ADDRESS, BET_MODE_VAULT_ABI, provider);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Find user by wallet address
 */
async function findUserByWalletAddress(walletAddress: string) {
  const { getDb, getCurrencyAccountsCollection } = await import('~/lib/mongodb');
  const db = await getDb();
  const normalizedAddress = walletAddress.toLowerCase();
  
  // First, try to find in currency_accounts (most direct)
  const accounts = await getCurrencyAccountsCollection();
  const account = await accounts.findOne({
    walletAddress: normalizedAddress,
  });
  
  if (account) {
    // Return a user-like object with fid
    return { fid: account.fid, _id: account.fid };
  }
  
  // Fallback: Try to find in users collection
  const user = await db.collection('users').findOne({
    $or: [
      { walletAddress: normalizedAddress },
      { 'verified_addresses.primary.eth_address': normalizedAddress },
      { 'verified_addresses.eth_addresses': normalizedAddress },
    ],
  });

  return user;
}

/**
 * Handle Deposited event
 */
async function handleDepositEvent(
  user: string,
  amount: bigint,
  newBalance: bigint,
  timestamp: bigint,
  txHash: string,
  blockNumber: number
) {
  try {
    const amountInQT = parseFloat(ethers.formatEther(amount));
    const userAddress = ethers.getAddress(user);


    // Find user by wallet address
    const userDoc = await findUserByWalletAddress(userAddress);

    if (!userDoc) {
      // Log the transaction for manual reconciliation with pending status
      // Use fid: 0 as a placeholder for unknown users
      const transactions = await getQTTransactionsCollection();
      const contractAddress = getBetModeVaultAddress();
      await transactions.insertOne({
        fid: 0, // Placeholder for unknown user
        type: 'deposit',
        amount: amountInQT,
        fromAddress: userAddress, // User's wallet address (sender)
        toAddress: contractAddress, // Contract address (receiver)
        txHash,
        blockNumber,
        status: 'pending', // Use valid status value
        createdAt: Date.now(),
      });
      return;
    }

    const fid = userDoc.fid || userDoc._id;

    // Update user's internal balance
    const accounts = await getCurrencyAccountsCollection();
    await accounts.updateOne(
      { fid },
      {
        $inc: {
          qtBalance: amountInQT,
          qtTotalDeposited: amountInQT,
        },
        $setOnInsert: {
          fid,
          balance: 0,
          dailyStreakDay: 0,
          qtLockedBalance: 0,
          qtTotalWithdrawn: 0,
          qtTotalWagered: 0,
          qtTotalWon: 0,
          createdAt: Date.now(),
        },
        $set: {
          walletAddress: userAddress.toLowerCase(), // Store wallet address for future lookups
          updatedAt: Date.now(),
          lastDepositAt: new Date(Number(timestamp) * 1000),
        },
      },
      { upsert: true }
    );

    // Record transaction
    const transactions = await getQTTransactionsCollection();
    const contractAddress = getBetModeVaultAddress();
    await transactions.insertOne({
      fid,
      type: 'deposit',
      amount: amountInQT,
      fromAddress: userAddress, // User's wallet address (sender)
      toAddress: contractAddress, // Contract address (receiver)
      txHash,
      blockNumber,
      status: 'completed',
      createdAt: Number(timestamp) * 1000, // Convert to milliseconds timestamp
    });

  } catch (error) {
    await sendAlertToAdmin('Deposit Event Error', {
      user,
      amount: amount.toString(),
      txHash,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle Withdrawn event
 */
async function handleWithdrawalEvent(
  user: string,
  amount: bigint,
  newBalance: bigint,
  nonce: bigint,
  timestamp: bigint,
  txHash: string,
  blockNumber: number
) {
  try {
    const amountInQT = parseFloat(ethers.formatEther(amount));
    const userAddress = ethers.getAddress(user);


    // Find user by wallet address
    const userDoc = await findUserByWalletAddress(userAddress);

    if (!userDoc) {
      // Log the transaction for manual reconciliation with pending status
      // Use fid: 0 as a placeholder for unknown users
      const transactions = await getQTTransactionsCollection();
      const contractAddress = getBetModeVaultAddress();
      await transactions.insertOne({
        fid: 0, // Placeholder for unknown user
        type: 'withdrawal',
        amount: -amountInQT,
        fromAddress: contractAddress, // Contract address (sender)
        toAddress: userAddress, // User's wallet address (receiver)
        txHash,
        blockNumber,
        status: 'pending', // Use valid status value
        createdAt: Date.now(),
      });
      return;
    }

    const fid = userDoc.fid || userDoc._id;

    // Update user's internal balance
    const accounts = await getCurrencyAccountsCollection();
    await accounts.updateOne(
      { fid },
      {
        $inc: {
          qtBalance: -amountInQT,
          qtTotalWithdrawn: amountInQT,
        },
        $set: {
          walletAddress: userAddress.toLowerCase(), // Store wallet address for future lookups
          updatedAt: Date.now(),
          lastWithdrawalAt: new Date(Number(timestamp) * 1000),
        },
      }
    );

    // Record transaction
    const transactions = await getQTTransactionsCollection();
    const contractAddress = getBetModeVaultAddress();
    await transactions.insertOne({
      fid,
      type: 'withdrawal',
      amount: -amountInQT,
      fromAddress: contractAddress, // Contract address (sender)
      toAddress: userAddress, // User's wallet address (receiver)
      txHash,
      blockNumber,
      status: 'completed',
      createdAt: Number(timestamp) * 1000, // Convert to milliseconds timestamp
    });

  } catch (error) {
    await sendAlertToAdmin('Withdrawal Event Error', {
      user,
      amount: amount.toString(),
      txHash,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Send alert to admin (Discord, email, etc.)
 */
async function sendAlertToAdmin(title: string, data: any) {

  // Send to Discord webhook if configured
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🚨 **${title}**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``,
        }),
      });
    } catch (error) {
    }
  }
}

/**
 * Start listening for contract events
 */
export function startEventListeners() {
  if (isListening) {
    return;
  }

  if (!initializeContract() || !contract || !provider) {
    return;
  }


  // Listen for Deposited events
  contract.on('Deposited', async (user, amount, newBalance, timestamp, event) => {
    await handleDepositEvent(
      user,
      amount,
      newBalance,
      timestamp,
      event.transactionHash,
      event.blockNumber
    );
  });

  // Listen for Withdrawn events
  contract.on('Withdrawn', async (user, amount, newBalance, nonce, timestamp, event) => {
    await handleWithdrawalEvent(
      user,
      amount,
      newBalance,
      nonce,
      timestamp,
      event.transactionHash,
      event.blockNumber
    );
  });

  isListening = true;
}

/**
 * Stop listening for contract events
 */
export function stopEventListeners() {
  if (!contract) return;

  contract.removeAllListeners('Deposited');
  contract.removeAllListeners('Withdrawn');
  isListening = false;
}

/**
 * Process historical events (for initial sync)
 */
export async function processHistoricalEvents(fromBlock: number, toBlock: number) {
  if (!contract || !provider) {
    if (!initializeContract()) {
      throw new Error('Contract not initialized');
    }
  }

  if (!contract) {
    throw new Error('Contract not initialized');
  }


  // Get Deposited events
  const depositFilter = contract.filters.Deposited();
  const depositEvents = await contract.queryFilter(depositFilter, fromBlock, toBlock);

  for (const event of depositEvents) {
    if (event instanceof EventLog && event.args) {
      await handleDepositEvent(
        event.args.user,
        event.args.amount,
        event.args.newBalance,
        event.args.timestamp,
        event.transactionHash,
        event.blockNumber
      );
    }
  }

  // Get Withdrawn events
  const withdrawFilter = contract.filters.Withdrawn();
  const withdrawEvents = await contract.queryFilter(withdrawFilter, fromBlock, toBlock);

  for (const event of withdrawEvents) {
    if (event instanceof EventLog && event.args) {
      await handleWithdrawalEvent(
        event.args.user,
        event.args.amount,
        event.args.newBalance,
        event.args.nonce,
        event.args.timestamp,
        event.transactionHash,
        event.blockNumber
      );
    }
  }

}

