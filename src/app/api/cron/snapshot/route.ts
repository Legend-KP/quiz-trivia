import { NextRequest, NextResponse } from 'next/server';
import {
  getWeeklyPoolsCollection,
  getLotteryTicketsCollection,
  getBetModeGamesCollection,
} from '~/lib/mongodb';
import { getCurrentWeekId } from '~/lib/betMode';

export const runtime = 'nodejs';

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

    if (pool.snapshotTaken) {
      return NextResponse.json({ message: 'Snapshot already taken', weekId }, { status: 200 });
    }

    // Get all active tickets
    const tickets = await getLotteryTicketsCollection();
    const allTickets = await tickets.find({ weekId }).toArray();

    // Assign ticket number ranges
    let currentTicketNumber = 0;
    const updates = [];

    for (const ticket of allTickets) {
      const ticketCount = Math.floor(ticket.totalTickets || 0);

      if (ticketCount > 0) {
        updates.push(
          tickets.updateOne(
            { _id: ticket._id },
            {
              $set: {
                ticketRangeStart: currentTicketNumber,
                ticketRangeEnd: currentTicketNumber + ticketCount - 1,
                snapshotAt: now,
              },
            }
          )
        );

        currentTicketNumber += ticketCount;
      }
    }

    await Promise.all(updates);

    // Lock the weekly pool
    await pools.updateOne(
      { weekId },
      {
        $set: {
          snapshotTaken: true,
          snapshotAt: now,
          finalPool: pool.lotteryPool,
          totalTickets: currentTicketNumber,
          totalParticipants: allTickets.length,
          status: 'snapshot_complete',
          updatedAt: now,
        },
      }
    );

    // Close any remaining active games (auto-lose)
    const games = await getBetModeGamesCollection();
    const activeGames = await games.find({ weekId, status: 'active' }).toArray();

    for (const game of activeGames) {
      // Mark as lost (disconnected during window)
      await games.updateOne(
        { gameId: game.gameId },
        {
          $set: {
            status: 'lost',
            completedAt: now,
            lossDistribution: {
              toBurn: Math.floor(game.betAmount * 0.6),
              toLottery: Math.floor(game.betAmount * 0.35),
              toPlatform: Math.floor(game.betAmount * 0.05),
            },
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      weekId,
      totalTickets: currentTicketNumber,
      totalParticipants: allTickets.length,
      finalPool: pool.lotteryPool,
      activeGamesClosed: activeGames.length,
    });
  } catch (error: any) {
    console.error('Snapshot cron error:', error);
    return NextResponse.json({ error: error.message || 'Snapshot failed' }, { status: 500 });
  }
}

