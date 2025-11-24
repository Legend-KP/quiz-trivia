import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  getCurrencyAccountsCollection,
  getQTTransactionsCollection,
  getDb,
} from '~/lib/mongodb';
import { BET_MODE_VAULT_ABI, getBetModeVaultAddress } from '~/lib/betModeVault';

export const runtime = 'nodejs';

/**
 * Manually sync deposit from contract
 * This endpoint reads the user's balance directly from the contract
 * and updates the database if there's a mismatch
 */
export async function POST(req: NextRequest) {
  try {
    const { fid, walletAddress } = await req.json();

    if (!fid || !walletAddress) {
      return NextResponse.json({ error: 'Missing fid or walletAddress' }, { status: 400 });
    }

    const numFid = Number(fid);
    if (!Number.isFinite(numFid)) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
    }

    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const contractAddress = getBetModeVaultAddress();
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, BET_MODE_VAULT_ABI, provider);

    // Get user's balance from contract
    const contractBalance = await contract.userBalances(walletAddress);
    const contractBalanceQT = parseFloat(ethers.formatEther(contractBalance));

    // Get user's balance from database
    const accounts = await getCurrencyAccountsCollection();
    const account = await accounts.findOne({ fid: numFid });
    const dbBalance = account?.qtBalance || 0;

    // If contract balance is higher, update database
    if (contractBalanceQT > dbBalance) {
      const difference = contractBalanceQT - dbBalance;

      // Update database
      await accounts.updateOne(
        { fid: numFid },
        {
          $inc: {
            qtBalance: difference,
            qtTotalDeposited: difference,
          },
          $setOnInsert: {
            fid: numFid,
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
          },
        },
        { upsert: true }
      );

      // Log sync transaction
      const transactions = await getQTTransactionsCollection();
      await transactions.insertOne({
        fid: numFid,
        type: 'deposit',
        amount: difference,
        fromAddress: walletAddress,
        toAddress: contractAddress,
        txHash: `sync-${Date.now()}`, // Mark as sync transaction
        blockNumber: 0,
        status: 'completed',
        createdAt: Date.now(),
      });

      return NextResponse.json({
        success: true,
        synced: true,
        contractBalance: contractBalanceQT,
        previousDbBalance: dbBalance,
        newDbBalance: contractBalanceQT,
        difference,
      });
    }

    return NextResponse.json({
      success: true,
      synced: false,
      contractBalance: contractBalanceQT,
      dbBalance,
      message: 'Database is up to date',
    });
  } catch (error: any) {
    console.error('Deposit sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync deposit' },
      { status: 500 }
    );
  }
}

