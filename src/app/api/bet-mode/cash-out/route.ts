import { NextRequest, NextResponse } from 'next/server';
import {
  getBetModeGamesCollection,
  getCurrencyAccountsCollection,
  getLotteryTicketsCollection,
  getQTTransactionsCollection,
} from '~/lib/mongodb';
import { calculatePayout, calculateBaseTickets } from '~/lib/betMode';
import { creditWinnings } from '~/lib/betModeContract';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { gameId, fid, walletAddress } = await req.json();

    if (!gameId || !fid) {
      return NextResponse.json({ error: 'Missing gameId or fid' }, { status: 400 });
    }

    const numFid = Number(fid);
    if (!Number.isFinite(numFid)) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
    }

    const games = await getBetModeGamesCollection();
    const game = await games.findOne({ gameId, fid: numFid, status: 'active' });

    if (!game) {
      return NextResponse.json({ error: 'Game not found or not active' }, { status: 404 });
    }

    const currentQ = game.currentQuestion;

    // Can only cash out from Q5 onwards
    if (currentQ < 5) {
      return NextResponse.json(
        { error: 'You can only cash out from question 5 onwards' },
        { status: 400 }
      );
    }

    // Calculate payout (use previous question since we're cashing out before answering current)
    const payout = calculatePayout(game.betAmount, currentQ - 1);
    const profit = payout - game.betAmount; // Profit = payout - betAmount

    const now = Date.now();
    const accounts = await getCurrencyAccountsCollection();

    // Credit winnings
    await accounts.updateOne(
      { fid: numFid },
      {
        $inc: {
          qtBalance: payout,
          qtLockedBalance: -game.betAmount,
          qtTotalWon: payout,
        },
        $set: { updatedAt: now },
      }
    );

    // Sync winnings to contract (async - don't block response)
    // Only credit the profit, not the full payout (betAmount was already deducted)
    creditWinnings(walletAddress, profit).catch((error) => {
      console.error('❌ Failed to sync winnings to contract:', error);
    });

    // Award lottery tickets
    const tickets = await getLotteryTicketsCollection();
    const ticketDoc = await tickets.findOne({ weekId: game.weekId, fid: numFid });

    if (ticketDoc) {
      const baseTickets = calculateBaseTickets(game.betAmount, 1);
      await tickets.updateOne(
        { weekId: game.weekId, fid: numFid },
        {
          $inc: {
            betBasedTickets: baseTickets.betBasedTickets,
            gameBasedTickets: baseTickets.gameBasedTickets,
            gamesPlayed: 1,
            totalWagered: game.betAmount,
          },
          $set: { updatedAt: now },
        }
      );
    }

    // Log transaction
    const transactions = await getQTTransactionsCollection();
    await transactions.insertOne({
      fid: numFid,
      type: 'game_win',
      amount: payout,
      gameId,
      weekId: game.weekId,
      status: 'completed',
      createdAt: now,
    });

    // Update game status
    await games.updateOne(
      { gameId },
      {
        $set: {
          status: 'cashed_out',
          completedAt: now,
          finalPayout: payout,
        },
      }
    );

    const updatedAccount = await accounts.findOne({ fid: numFid });

    return NextResponse.json({
      success: true,
      payout,
      profit: payout - game.betAmount,
      newBalance: updatedAccount?.qtBalance || 0,
      ticketsEarned: calculateBaseTickets(game.betAmount, 1).totalTickets,
    });
  } catch (error: any) {
    console.error('Bet Mode cash out error:', error);
    return NextResponse.json({ error: error.message || 'Failed to cash out' }, { status: 500 });
  }
}

