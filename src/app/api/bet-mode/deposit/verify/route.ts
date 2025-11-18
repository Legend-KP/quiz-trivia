import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  getCurrencyAccountsCollection,
  getQTTransactionsCollection,
} from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { fid, txHash } = await req.json();

    if (!fid || !txHash) {
      return NextResponse.json({ error: 'Missing fid or txHash' }, { status: 400 });
    }

    const numFid = Number(fid);
    if (!Number.isFinite(numFid)) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
    }

    // Check if transaction already processed
    const transactions = await getQTTransactionsCollection();
    const existing = await transactions.findOne({ txHash, type: 'deposit' });

    if (existing) {
      return NextResponse.json({ error: 'Transaction already processed' }, { status: 400 });
    }

    // Verify transaction on Base L2
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const platformWallet = process.env.PLATFORM_WALLET_ADDRESS;

    if (!platformWallet) {
      return NextResponse.json({ error: 'Platform wallet not configured' }, { status: 500 });
    }

    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return NextResponse.json({ error: 'Transaction receipt not found' }, { status: 404 });
    }

    // Validate destination
    if (tx.to?.toLowerCase() !== platformWallet.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid destination address' }, { status: 400 });
    }

    // Check transaction status
    if (receipt.status !== 1) {
      return NextResponse.json({ error: 'Transaction failed' }, { status: 400 });
    }

    // Parse amount (QT token has 18 decimals)
    // Note: This assumes QT is an ERC20 token. If tx.value is used, it's native ETH.
    // For ERC20 transfers, we need to parse the transfer event logs.
    let amountQT = 0;

    // Try to parse ERC20 Transfer event
    const transferEventSignature = ethers.id('Transfer(address,address,uint256)');
    const transferLog = receipt.logs.find((log) => {
      if (log.topics[0] === transferEventSignature) {
        // Check if it's to platform wallet
        const toAddress = ethers.getAddress('0x' + log.topics[2].slice(-40));
        return toAddress.toLowerCase() === platformWallet.toLowerCase();
      }
      return false;
    });

    if (transferLog) {
      // Parse Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
      const iface = new ethers.Interface([
        'event Transfer(address indexed from, address indexed to, uint256 value)',
      ]);
      const decoded = iface.parseLog({
        topics: transferLog.topics as string[],
        data: transferLog.data,
      });
      if (decoded) {
        amountQT = parseFloat(ethers.formatUnits(decoded.args.value, 18));
      }
    } else if (tx.value) {
      // Fallback: if it's a native token transfer
      amountQT = parseFloat(ethers.formatEther(tx.value));
    }

    if (amountQT <= 0) {
      return NextResponse.json({ error: 'Could not parse transfer amount' }, { status: 400 });
    }

    const now = Date.now();
    const accounts = await getCurrencyAccountsCollection();

    // Credit user
    await accounts.updateOne(
      { fid: numFid },
      {
        $inc: {
          qtBalance: amountQT,
          qtTotalDeposited: amountQT,
        },
        $setOnInsert: {
          fid: numFid,
          balance: 0,
          dailyStreakDay: 0,
          qtLockedBalance: 0,
          qtTotalWithdrawn: 0,
          qtTotalWagered: 0,
          qtTotalWon: 0,
          createdAt: now,
          updatedAt: now,
        },
        $set: { updatedAt: now },
      },
      { upsert: true }
    );

    // Log transaction
    await transactions.insertOne({
      fid: numFid,
      type: 'deposit',
      amount: amountQT,
      txHash,
      fromAddress: tx.from,
      toAddress: tx.to,
      blockNumber: receipt.blockNumber,
      status: 'completed',
      createdAt: now,
    });

    const updatedAccount = await accounts.findOne({ fid: numFid });

    return NextResponse.json({
      success: true,
      amount: amountQT,
      newBalance: updatedAccount?.qtBalance || 0,
      txHash,
    });
  } catch (error: any) {
    console.error('Deposit verification error:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify deposit' }, { status: 500 });
  }
}

