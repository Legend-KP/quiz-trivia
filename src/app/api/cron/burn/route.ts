import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  getWeeklyPoolsCollection,
  getBurnRecordsCollection,
} from '~/lib/mongodb';
import { getCurrentWeekId } from '~/lib/betMode';

export const runtime = 'nodejs';

const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekId = getCurrentWeekId();
    const now = Date.now();

    // Get weekly pool
    const pools = await getWeeklyPoolsCollection();
    const pool = await pools.findOne({ weekId });

    if (!pool) {
      return NextResponse.json({ error: 'Weekly pool not found' }, { status: 404 });
    }

    if (!pool.drawCompleted) {
      return NextResponse.json({ error: 'Lottery draw not completed yet' }, { status: 400 });
    }

    if (pool.burnCompleted) {
      return NextResponse.json({ message: 'Burn already completed', weekId }, { status: 200 });
    }

    const { toBurnAccumulated = 0 } = pool;

    if (toBurnAccumulated === 0) {
      return NextResponse.json({ message: 'Nothing to burn', weekId }, { status: 200 });
    }

    // Send QT to burn address on blockchain
    // Support both WALLET_PRIVATE_KEY and PRIVATE_KEY for backward compatibility
    const privateKey = process.env.WALLET_PRIVATE_KEY || process.env.PRIVATE_KEY;
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const qtTokenAddress = process.env.QT_TOKEN_ADDRESS;

    if (!privateKey || !qtTokenAddress) {
      return NextResponse.json({ error: 'Wallet or token not configured' }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // ERC20 token contract ABI
    const tokenAbi = ['function transfer(address to, uint256 amount) returns (bool)'];
    const tokenContract = new ethers.Contract(qtTokenAddress, tokenAbi, wallet);

    // Convert amount to token units (18 decimals)
    const amountWei = ethers.parseUnits(toBurnAccumulated.toString(), 18);

    // Send transaction
    const tx = await tokenContract.transfer(BURN_ADDRESS, amountWei);
    const receipt = await tx.wait();

    if (!receipt.status) {
      return NextResponse.json({ error: 'Burn transaction failed' }, { status: 500 });
    }

    // Record burn
    const burnRecords = await getBurnRecordsCollection();
    await burnRecords.insertOne({
      weekId,
      amount: toBurnAccumulated,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      timestamp: now,
    });

    // Update weekly pool
    await pools.updateOne(
      { weekId },
      {
        $set: {
          burnCompleted: true,
          burnTxHash: receipt.hash,
          burnAt: now,
          updatedAt: now,
        },
      }
    );

    return NextResponse.json({
      success: true,
      weekId,
      burned: toBurnAccumulated,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      verifyLink: `https://basescan.org/tx/${receipt.hash}`,
    });
  } catch (error: any) {
    console.error('Burn cron error:', error);
    return NextResponse.json({ error: error.message || 'Burn failed' }, { status: 500 });
  }
}

