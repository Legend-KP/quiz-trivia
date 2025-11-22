import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  getCurrencyAccountsCollection,
} from '~/lib/mongodb';
import { BET_MODE_VAULT_ABI, getBetModeVaultAddress } from '~/lib/betModeVault';

export const runtime = 'nodejs';

/**
 * Balance Reconciliation Cron Job
 * 
 * Compares contract balances with database balances and logs mismatches.
 * Should run daily (e.g., via Vercel Cron or external scheduler).
 * 
 * POST /api/cron/reconcile-balances
 * Headers: x-cron-secret: YOUR_CRON_SECRET (optional, for security)
 */
export async function POST(req: NextRequest) {
  try {
    // Optional: Verify cron secret
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;
    
    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contractAddress = getBetModeVaultAddress();
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, BET_MODE_VAULT_ABI, provider);

    // Get all users with wallet addresses
    const accounts = await getCurrencyAccountsCollection();
    const users = await accounts.find({
      walletAddress: { $exists: true, $ne: null },
    }).toArray();

    let mismatches = 0;
    const mismatchLog: Array<{
      fid: number;
      walletAddress: string;
      contractBalance: number;
      dbBalance: number;
      difference: number;
    }> = [];

    for (const account of users) {
      try {
        const walletAddress = account.walletAddress;
        if (!walletAddress || !ethers.isAddress(walletAddress)) {
          continue;
        }

        // Get contract stats
        const stats = await contract.getUserStats(walletAddress);
        const contractBalance = parseFloat(ethers.formatEther(stats.currentBalance));
        const contractDeposits = parseFloat(ethers.formatEther(stats.deposited));
        const contractWithdrawals = parseFloat(ethers.formatEther(stats.withdrawn));

        // Get database balance
        const dbBalance = account.qtBalance || 0;
        const dbDeposits = account.qtTotalDeposited || 0;
        const dbWithdrawals = account.qtTotalWithdrawn || 0;

        // Check for mismatches (allow 0.01 QT tolerance for rounding)
        const balanceDifference = Math.abs(contractBalance - dbBalance);
        const depositDifference = Math.abs(contractDeposits - dbDeposits);
        const withdrawalDifference = Math.abs(contractWithdrawals - dbWithdrawals);

        if (balanceDifference > 0.01 || depositDifference > 0.01 || withdrawalDifference > 0.01) {
          mismatches++;

          mismatchLog.push({
            fid: account.fid,
            walletAddress,
            contractBalance,
            dbBalance,
            difference: balanceDifference,
          });

          console.error(`❌ Balance mismatch for user ${account.fid}:`, {
            contract: {
              balance: contractBalance,
              deposits: contractDeposits,
              withdrawals: contractWithdrawals,
            },
            database: {
              balance: dbBalance,
              deposits: dbDeposits,
              withdrawals: dbWithdrawals,
            },
          });

          // Log mismatch for investigation
          const { getDb } = await import('~/lib/mongodb');
          const db = await getDb();
          await db.collection('reconciliation_logs').insertOne({
            fid: account.fid,
            walletAddress,
            contractBalance,
            contractDeposits,
            contractWithdrawals,
            dbBalance,
            dbDeposits,
            dbWithdrawals,
            balanceDifference,
            depositDifference,
            withdrawalDifference,
            detectedAt: new Date(),
          });

          // Alert admin
          if (process.env.DISCORD_WEBHOOK_URL) {
            await fetch(process.env.DISCORD_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: `🚨 **Balance Mismatch Detected**\n` +
                  `User: ${account.fid}\n` +
                  `Contract Balance: ${contractBalance} QT\n` +
                  `Database Balance: ${dbBalance} QT\n` +
                  `Difference: ${balanceDifference} QT`,
              }),
            });
          }
        }
      } catch (error) {
        console.error(`Error reconciling user ${account.fid}:`, error);
      }
    }

    // Get contract total balance
    const contractTotalBalance = await contract.getContractBalance();
    const contractTotalBalanceQT = parseFloat(ethers.formatEther(contractTotalBalance));

    console.log(`✅ Reconciliation complete. Mismatches found: ${mismatches}/${users.length}`);
    console.log(`📊 Contract Total Balance: ${contractTotalBalanceQT} QT`);

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      mismatches,
      mismatchLog,
      contractTotalBalance: contractTotalBalanceQT,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Reconciliation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reconcile balances' },
      { status: 500 }
    );
  }
}

