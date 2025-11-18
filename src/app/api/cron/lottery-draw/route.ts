import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  getWeeklyPoolsCollection,
  getLotteryTicketsCollection,
  getCurrencyAccountsCollection,
  getQTTransactionsCollection,
} from '~/lib/mongodb';
import { getCurrentWeekId } from '~/lib/betMode';

export const runtime = 'nodejs';

// Prize tiers
const PRIZE_TIERS = [
  { tier: 1, percent: 0.25, count: 1 }, // 25%
  { tier: 2, percent: 0.10, count: 2 }, // 10% each
  { tier: 3, percent: 0.06, count: 3 }, // 6% each
  { tier: 4, percent: 0.03, count: 5 }, // 3% each
  { tier: 5, percent: 0.012, count: 10 }, // 1.2% each
  { tier: 6, percent: 0.01, count: 10 }, // 1% each
];

function getTierFromPosition(position: number): number {
  if (position === 0) return 1;
  if (position <= 2) return 2;
  if (position <= 5) return 3;
  if (position <= 10) return 4;
  if (position <= 20) return 5;
  return 6;
}

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

    // Get pool data
    const pools = await getWeeklyPoolsCollection();
    const pool = await pools.findOne({ weekId });

    if (!pool) {
      return NextResponse.json({ error: 'Weekly pool not found' }, { status: 404 });
    }

    if (!pool.snapshotTaken) {
      return NextResponse.json({ error: 'Snapshot not taken yet' }, { status: 400 });
    }

    if (pool.drawCompleted) {
      return NextResponse.json({ message: 'Draw already completed', weekId }, { status: 200 });
    }

    const { finalPool = 0, totalTickets = 0 } = pool;

    if (totalTickets === 0) {
      return NextResponse.json({ error: 'No tickets to draw from' }, { status: 400 });
    }

    // Generate provably fair random seed
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);

    if (!block) {
      return NextResponse.json({ error: 'Failed to get block' }, { status: 500 });
    }

    const blockHash = block.hash;
    const seedData = `${weekId}-${blockHash}-${now}`;
    const seed = ethers.keccak256(ethers.toUtf8Bytes(seedData));

    // Draw 31 unique winning ticket numbers
    const winningTickets: number[] = [];
    const used = new Set<string>();

    for (let i = 0; i < 31; i++) {
      let ticketNumber: number;
      let attempts = 0;

      do {
        const hash = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes32', 'uint256', 'uint256'],
            [seed, BigInt(i), BigInt(attempts)]
          )
        );

        ticketNumber = Number(BigInt(hash) % BigInt(totalTickets));
        attempts++;

        if (attempts > 1000) {
          return NextResponse.json({ error: 'Could not generate unique ticket numbers' }, { status: 500 });
        }
      } while (used.has(ticketNumber.toString()));

      used.add(ticketNumber.toString());
      winningTickets.push(ticketNumber);
    }

    // Find which users own these tickets
    const tickets = await getLotteryTicketsCollection();
    const allTickets = await tickets.find({ weekId }).toArray();

    const winners: Array<{
      position: number;
      tier: number;
      fid: number;
      ticketNumber: number;
    }> = [];

    for (let i = 0; i < winningTickets.length; i++) {
      const ticketNum = winningTickets[i];

      for (const ticket of allTickets) {
        if (
          ticket.ticketRangeStart !== undefined &&
          ticket.ticketRangeEnd !== undefined &&
          ticketNum >= ticket.ticketRangeStart &&
          ticketNum <= ticket.ticketRangeEnd
        ) {
          winners.push({
            position: i,
            tier: getTierFromPosition(i),
            fid: ticket.fid,
            ticketNumber: ticketNum,
          });
          break;
        }
      }
    }

    // Calculate and distribute prizes
    const accounts = await getCurrencyAccountsCollection();
    const transactions = await getQTTransactionsCollection();
    const distributions: Array<{
      tier: number;
      fid: number;
      ticketNumber: number;
      prize: number;
    }> = [];

    let distributedTotal = 0;

    for (const prize of PRIZE_TIERS) {
      const prizePerWinner = Math.floor((finalPool * prize.percent) / prize.count);
      const tierWinners = winners.filter((w) => w.tier === prize.tier);

      for (const winner of tierWinners) {
        // Credit winner's balance
        await accounts.updateOne(
          { fid: winner.fid },
          {
            $inc: { qtBalance: prizePerWinner },
            $set: { updatedAt: now },
          }
        );

        // Log transaction
        await transactions.insertOne({
          fid: winner.fid,
          type: 'lottery_win',
          amount: prizePerWinner,
          tier: prize.tier,
          weekId,
          status: 'completed',
          createdAt: now,
        });

        // Update ticket record
        await tickets.updateOne(
          { weekId, fid: winner.fid },
          {
            $set: {
              won: true,
              tier: prize.tier,
              prizeAmount: prizePerWinner,
            },
          }
        );

        distributions.push({
          tier: prize.tier,
          fid: winner.fid,
          ticketNumber: winner.ticketNumber,
          prize: prizePerWinner,
        });

        distributedTotal += prizePerWinner;
      }
    }

    // Consolation prizes (remaining ~5% of pool)
    const consolationPool = finalPool - distributedTotal;
    const winnerFids = new Set(winners.map((w) => w.fid));
    const nonWinners = allTickets.filter((t) => !winnerFids.has(t.fid));

    const consolationPerPerson =
      nonWinners.length > 0 ? Math.floor(consolationPool / nonWinners.length) : 0;

    for (const ticket of nonWinners) {
      if (consolationPerPerson > 0) {
        await accounts.updateOne(
          { fid: ticket.fid },
          {
            $inc: { qtBalance: consolationPerPerson },
            $set: { updatedAt: now },
          }
        );

        await tickets.updateOne(
          { weekId, fid: ticket.fid },
          {
            $set: {
              won: false,
              consolationAmount: consolationPerPerson,
            },
          }
        );
      }
    }

    // Save draw results
    await pools.updateOne(
      { weekId },
      {
        $set: {
          drawCompleted: true,
          drawAt: now,
          drawSeed: seed,
          drawBlockHash: blockHash,
          drawBlockNumber: blockNumber,
          winners: distributions,
          consolationAmount: consolationPerPerson,
          totalDistributed: distributedTotal + consolationPerPerson * nonWinners.length,
          status: 'completed',
          updatedAt: now,
        },
      }
    );

    return NextResponse.json({
      success: true,
      weekId,
      winners: distributions,
      consolation: {
        perPerson: consolationPerPerson,
        recipients: nonWinners.length,
      },
      verification: {
        seed,
        blockHash,
        blockNumber,
      },
    });
  } catch (error: any) {
    console.error('Lottery draw cron error:', error);
    return NextResponse.json({ error: error.message || 'Lottery draw failed' }, { status: 500 });
  }
}

