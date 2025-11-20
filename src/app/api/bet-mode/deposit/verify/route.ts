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

    // Check transaction status
    if (receipt.status !== 1) {
      return NextResponse.json({ error: 'Transaction failed' }, { status: 400 });
    }

    // Parse amount (QT token has 18 decimals)
    // Note: For ERC20 token transfers, tx.to is the token contract address, not the recipient.
    // The recipient is in the Transfer event log, so we need to parse that.
    let amountQT = 0;
    let transferFound = false;

    // Get QT token address from environment
    const qtTokenAddress = process.env.QT_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_QT_TOKEN_ADDRESS;
    
    // For ERC20 transfers, tx.to should be the token contract address
    // If it's not, this might be a native ETH transfer (which we don't support for deposits)
    if (qtTokenAddress && tx.to?.toLowerCase() !== qtTokenAddress.toLowerCase()) {
      // This is not a QT token transfer - might be native ETH or wrong token
      // We'll check Transfer events anyway, but log a warning
      console.warn('Transaction to address does not match QT token contract:', {
        txTo: tx.to,
        expectedToken: qtTokenAddress,
      });
    }

    // Try to parse ERC20 Transfer event
    const transferEventSignature = ethers.id('Transfer(address,address,uint256)');
    const transferLog = receipt.logs.find((log) => {
      if (log.topics[0] === transferEventSignature) {
        // Check if it's to platform wallet
        // Transfer event: topics[0] = event signature, topics[1] = from, topics[2] = to
        const toAddress = ethers.getAddress('0x' + log.topics[2].slice(-40));
        if (toAddress.toLowerCase() === platformWallet.toLowerCase()) {
          transferFound = true;
          return true;
        }
      }
      return false;
    });

    if (transferLog && transferFound) {
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
    } else {
      // No valid Transfer event found to platform wallet
      if (tx.value && tx.value > 0) {
        // This is a native ETH transfer, not a token transfer
        return NextResponse.json({ 
          error: 'This appears to be a native ETH transfer. Please send QT tokens instead.' 
        }, { status: 400 });
      }
      return NextResponse.json({ 
        error: 'Invalid destination address. No QT token transfer to platform wallet found in transaction.' 
      }, { status: 400 });
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

