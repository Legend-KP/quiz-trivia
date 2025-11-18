import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrencyAccountsCollection,
  getBetModeGamesCollection,
  getWeeklyPoolsCollection,
  getLotteryTicketsCollection,
} from '~/lib/mongodb';
import { getBetModeWindowState, getCurrentWeekId, formatTimeRemaining } from '~/lib/betMode';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fidParam = searchParams.get('fid');

    if (!fidParam) {
      return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
    }

    const fid = Number(fidParam);
    if (!Number.isFinite(fid)) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
    }

    const windowState = getBetModeWindowState();
    const weekId = getCurrentWeekId();

    // Get user account
    const accounts = await getCurrencyAccountsCollection();
    const account = await accounts.findOne({ fid });

    const qtBalance = account?.qtBalance || 0;
    const qtLockedBalance = account?.qtLockedBalance || 0;
    const availableBalance = qtBalance - qtLockedBalance;

    // Get active game
    const games = await getBetModeGamesCollection();
    const activeGame = await games.findOne({ fid, status: 'active' });

    // Get weekly pool
    const pools = await getWeeklyPoolsCollection();
    const weeklyPool = await pools.findOne({ weekId });

    // Get user tickets
    const tickets = await getLotteryTicketsCollection();
    const userTickets = await tickets.findOne({ weekId, fid });

    // Calculate total tickets for this week
    const allTickets = await tickets.find({ weekId }).toArray();
    const totalTickets = allTickets.reduce((sum, t) => sum + (t.totalTickets || 0), 0);

    const userTicketCount = userTickets?.totalTickets || 0;
    const userShare = totalTickets > 0 ? (userTicketCount / totalTickets) * 100 : 0;

    return NextResponse.json({
      window: {
        isOpen: windowState.isOpen,
        timeUntilOpen: windowState.timeUntilOpen ? formatTimeRemaining(windowState.timeUntilOpen) : null,
        timeUntilClose: windowState.timeUntilClose ? formatTimeRemaining(windowState.timeUntilClose) : null,
        timeUntilSnapshot: windowState.timeUntilSnapshot ? formatTimeRemaining(windowState.timeUntilSnapshot) : null,
        timeUntilDraw: windowState.timeUntilDraw ? formatTimeRemaining(windowState.timeUntilDraw) : null,
        windowStart: windowState.windowStart.toISOString(),
        windowEnd: windowState.windowEnd.toISOString(),
        snapshotTime: windowState.snapshotTime.toISOString(),
        drawTime: windowState.drawTime.toISOString(),
      },
      balance: {
        qtBalance,
        qtLockedBalance,
        availableBalance,
        totalDeposited: account?.qtTotalDeposited || 0,
        totalWithdrawn: account?.qtTotalWithdrawn || 0,
        totalWagered: account?.qtTotalWagered || 0,
        totalWon: account?.qtTotalWon || 0,
      },
      activeGame: activeGame
        ? {
            gameId: activeGame.gameId,
            betAmount: activeGame.betAmount,
            currentQuestion: activeGame.currentQuestion,
            startedAt: activeGame.startedAt,
          }
        : null,
      weeklyPool: weeklyPool
        ? {
            weekId: weeklyPool.weekId,
            lotteryPool: weeklyPool.lotteryPool,
            toBurnAccumulated: weeklyPool.toBurnAccumulated,
            totalLosses: weeklyPool.totalLosses,
            snapshotTaken: weeklyPool.snapshotTaken,
            drawCompleted: weeklyPool.drawCompleted,
            burnCompleted: weeklyPool.burnCompleted,
            totalParticipants: weeklyPool.totalParticipants || 0,
            totalTickets: weeklyPool.totalTickets || 0,
          }
        : null,
      lottery: {
        userTickets: userTicketCount,
        totalTickets,
        userShare: userShare.toFixed(2),
        weekId,
        betBasedTickets: userTickets?.betBasedTickets || 0,
        gameBasedTickets: userTickets?.gameBasedTickets || 0,
        bonusTickets: userTickets?.bonusTickets || 0,
        consecutiveDays: userTickets?.consecutiveDays || 0,
        gamesPlayed: userTickets?.gamesPlayed || 0,
        totalWagered: userTickets?.totalWagered || 0,
      },
    });
  } catch (error: any) {
    console.error('Bet Mode status error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get status' }, { status: 500 });
  }
}

