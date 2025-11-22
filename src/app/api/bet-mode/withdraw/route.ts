import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  getCurrencyAccountsCollection,
  getQTTransactionsCollection,
  getBetModeGamesCollection,
} from '~/lib/mongodb';

export const runtime = 'nodejs';

/**
 * Legacy withdrawal endpoint (kept for backward compatibility)
 * 
 * NOTE: With smart contract integration, withdrawals should go through:
 * 1. POST /api/bet-mode/withdraw/prepare (get signature)
 * 2. User calls contract.withdraw() on frontend
 * 3. Event listener updates database
 * 
 * This endpoint is kept as fallback but should not be used with contract integration.
 */
export async function POST(req: NextRequest) {
  try {
    const { fid, amount, toAddress } = await req.json();

    if (!fid || !amount || !toAddress) {
      return NextResponse.json({ error: 'Missing fid, amount, or toAddress' }, { status: 400 });
    }

    const numFid = Number(fid);
    const numAmount = Number(amount);

    if (!Number.isFinite(numFid) || !Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid fid or amount' }, { status: 400 });
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const accounts = await getCurrencyAccountsCollection();
    const account = await accounts.findOne({ fid: numFid });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const qtBalance = account.qtBalance || 0;
    const qtLockedBalance = account.qtLockedBalance || 0;
    const availableBalance = qtBalance - qtLockedBalance;

    if (availableBalance < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Check for active games
    const games = await getBetModeGamesCollection();
    const activeGame = await games.findOne({
      fid: numFid,
      status: 'active',
    });

    if (activeGame) {
      return NextResponse.json({ error: 'Cannot withdraw during active game' }, { status: 400 });
    }

    // Check if contract integration is enabled
    const contractAddress = process.env.BET_MODE_VAULT_ADDRESS || process.env.NEXT_PUBLIC_BET_MODE_VAULT_ADDRESS;
    
    if (contractAddress) {
      // Contract integration is enabled - redirect to prepare endpoint
      return NextResponse.json({
        error: 'Please use contract-based withdrawal. Call /api/bet-mode/withdraw/prepare first.',
        useContract: true,
      }, { status: 400 });
    }

    // Legacy withdrawal flow (only if contract not configured)
    const privateKey = process.env.WALLET_PRIVATE_KEY || process.env.PRIVATE_KEY;
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const qtTokenAddress = process.env.QT_TOKEN_ADDRESS;

    if (!privateKey || !qtTokenAddress) {
      return NextResponse.json({ error: 'Wallet or token not configured' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // ERC20 token contract ABI (minimal)
    const tokenAbi = ['function transfer(address to, uint256 amount) returns (bool)'];
    const tokenContract = new ethers.Contract(qtTokenAddress, tokenAbi, wallet);

    // Convert amount to token units (18 decimals)
    const amountWei = ethers.parseUnits(numAmount.toString(), 18);

    // Send transaction
    const tx = await tokenContract.transfer(toAddress, amountWei);
    const receipt = await tx.wait();

    if (!receipt.status) {
      return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
    }

    const now = Date.now();

    // Deduct from database
    await accounts.updateOne(
      { fid: numFid },
      {
        $inc: {
          qtBalance: -numAmount,
          qtTotalWithdrawn: numAmount,
        },
        $set: { updatedAt: now },
      }
    );

    // Log transaction
    await getQTTransactionsCollection().then((collection) =>
      collection.insertOne({
        fid: numFid,
        type: 'withdrawal',
        amount: -numAmount,
        txHash: receipt.hash,
        fromAddress: wallet.address,
        toAddress,
        blockNumber: receipt.blockNumber,
        status: 'completed',
        createdAt: now,
      })
    );

    const updatedAccount = await accounts.findOne({ fid: numFid });

    return NextResponse.json({
      success: true,
      amount: numAmount,
      txHash: receipt.hash,
      newBalance: updatedAccount?.qtBalance || 0,
    });
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process withdrawal' }, { status: 500 });
  }
}

