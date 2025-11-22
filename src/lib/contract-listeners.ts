/**
 * BetModeVault Contract Event Listeners
 * 
 * Listens to Deposited and Withdrawn events and automatically updates the database.
 * This service runs continuously in the background.
 */

import { ethers } from 'ethers';
import {
  getCurrencyAccountsCollection,
  getQTTransactionsCollection,
} from '~/lib/mongodb';
import { BET_MODE_VAULT_ABI } from './betModeVault';

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
    console.warn('⚠️ BET_MODE_VAULT_ADDRESS not configured. Event listeners disabled.');
    return false;
  }

  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    contract = new ethers.Contract(CONTRACT_ADDRESS, BET_MODE_VAULT_ABI, provider);
    console.log('✅ Contract initialized:', CONTRACT_ADDRESS);
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize contract:', error);
    return false;
  }
}

/**
 * Find user by wallet address
 */
async function findUserByWalletAddress(walletAddress: string) {
  // Try to find user in database by wallet address
  // This assumes you have a users collection with walletAddress field
  const { getDb } = await import('~/lib/mongodb');
  const db = await getDb();
  
  // Try multiple possible collections/fields
  const user = await db.collection('users').findOne({
    $or: [
      { walletAddress: walletAddress.toLowerCase() },
      { 'verified_addresses.primary.eth_address': walletAddress.toLowerCase() },
      { 'verified_addresses.eth_addresses': walletAddress.toLowerCase() },
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

    console.log('💰 Deposit event detected:', {
      user: userAddress,
      amount: amountInQT,
      txHash,
    });

    // Find user by wallet address
    const userDoc = await findUserByWalletAddress(userAddress);

    if (!userDoc) {
      console.warn('⚠️ User not found for address:', userAddress);
      // Still log the transaction for manual reconciliation
      const transactions = await getQTTransactionsCollection();
      await transactions.insertOne({
        type: 'deposit',
        walletAddress: userAddress,
        amount: amountInQT,
        contractAmount: amount.toString(),
        txHash,
        blockNumber,
        status: 'pending_user_lookup',
        createdAt: new Date(Number(timestamp) * 1000),
        processedAt: new Date(),
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
          updatedAt: Date.now(),
          lastDepositAt: new Date(Number(timestamp) * 1000),
        },
      },
      { upsert: true }
    );

    // Record transaction
    const transactions = await getQTTransactionsCollection();
    await transactions.insertOne({
      fid,
      type: 'deposit',
      amount: amountInQT,
      contractAmount: amount.toString(),
      walletAddress: userAddress,
      txHash,
      blockNumber,
      status: 'completed',
      createdAt: new Date(Number(timestamp) * 1000),
      processedAt: new Date(),
    });

    console.log(`✅ Deposit processed for user ${fid}: ${amountInQT} QT`);
  } catch (error) {
    console.error('❌ Error handling deposit event:', error);
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

    console.log('💸 Withdrawal event detected:', {
      user: userAddress,
      amount: amountInQT,
      txHash,
    });

    // Find user by wallet address
    const userDoc = await findUserByWalletAddress(userAddress);

    if (!userDoc) {
      console.warn('⚠️ User not found for address:', userAddress);
      // Still log the transaction
      const transactions = await getQTTransactionsCollection();
      await transactions.insertOne({
        type: 'withdrawal',
        walletAddress: userAddress,
        amount: -amountInQT,
        contractAmount: amount.toString(),
        txHash,
        blockNumber,
        nonce: Number(nonce),
        status: 'pending_user_lookup',
        createdAt: new Date(Number(timestamp) * 1000),
        processedAt: new Date(),
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
          updatedAt: Date.now(),
          lastWithdrawalAt: new Date(Number(timestamp) * 1000),
        },
      }
    );

    // Record transaction
    const transactions = await getQTTransactionsCollection();
    await transactions.insertOne({
      fid,
      type: 'withdrawal',
      amount: -amountInQT,
      contractAmount: amount.toString(),
      walletAddress: userAddress,
      txHash,
      blockNumber,
      nonce: Number(nonce),
      status: 'completed',
      createdAt: new Date(Number(timestamp) * 1000),
      processedAt: new Date(),
    });

    console.log(`✅ Withdrawal processed for user ${fid}: ${amountInQT} QT`);
  } catch (error) {
    console.error('❌ Error handling withdrawal event:', error);
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
  console.error('🚨 ADMIN ALERT:', title, data);

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
      console.error('Failed to send Discord alert:', error);
    }
  }
}

/**
 * Start listening for contract events
 */
export function startEventListeners() {
  if (isListening) {
    console.log('⚠️ Event listeners already running');
    return;
  }

  if (!initializeContract() || !contract || !provider) {
    console.warn('⚠️ Cannot start event listeners - contract not initialized');
    return;
  }

  console.log('🎧 Starting event listeners...');

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
  console.log('✅ Event listeners started');
}

/**
 * Stop listening for contract events
 */
export function stopEventListeners() {
  if (!contract) return;

  contract.removeAllListeners('Deposited');
  contract.removeAllListeners('Withdrawn');
  isListening = false;
  console.log('🛑 Event listeners stopped');
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

  console.log(`📜 Processing historical events from block ${fromBlock} to ${toBlock}...`);

  // Get Deposited events
  const depositFilter = contract.filters.Deposited();
  const depositEvents = await contract.queryFilter(depositFilter, fromBlock, toBlock);

  for (const event of depositEvents) {
    if (event.args) {
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
    if (event.args) {
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

  console.log(`✅ Processed ${depositEvents.length} deposits and ${withdrawEvents.length} withdrawals`);
}

