import { NextRequest, NextResponse } from 'next/server';
import { getBetModeGamesCollection, getCurrencyAccountsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { fid } = await req.json();

    if (!fid) {
      return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
    }

    const numFid = Number(fid);
    if (!Number.isFinite(numFid)) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
    }

    const games = await getBetModeGamesCollection();
    const activeGame = await games.findOne({
      fid: numFid,
      status: 'active',
    });

    if (!activeGame) {
      return NextResponse.json({ success: true, message: 'No active game to clear' });
    }

    // Unlock the locked balance
    const accounts = await getCurrencyAccountsCollection();
    await accounts.updateOne(
      { fid: numFid },
      {
        $inc: {
          qtBalance: activeGame.betAmount,
          qtLockedBalance: -activeGame.betAmount,
        },
        $set: { updatedAt: Date.now() },
      }
    );

    // Mark game as lost (or delete it - we'll mark as lost for record keeping)
    await games.updateOne(
      { gameId: activeGame.gameId, fid: numFid },
      {
        $set: {
          status: 'lost',
          completedAt: Date.now(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Active game cleared',
      unlockedAmount: activeGame.betAmount,
    });
  } catch (error: any) {
    console.error('Clear active game error:', error);
    return NextResponse.json({ error: error.message || 'Failed to clear active game' }, { status: 500 });
  }
}

