import { NextResponse } from 'next/server';
import { getChallengesCollection, getCurrencyAccountsCollection, getCurrencyTxnsCollection, getLeaderboardCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { id, fid, correct, total, durationSec } = await request.json();
    const nfid = Number(fid);
    if (!id || !nfid) return NextResponse.json({ error: 'id and fid required' }, { status: 400 });

    const challenges = await getChallengesCollection();
    const ch = await challenges.findOne({ id });
    if (!ch) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    if (!['accepted', 'pending'].includes(ch.status)) return NextResponse.json({ error: 'Challenge not open' }, { status: 400 });

    const accuracy = total > 0 ? correct / total : 0;
    const setField = ch.challengerFid === nfid ? { challenger: { correct, total, durationSec, accuracy } } : { opponent: { correct, total, durationSec, accuracy } };
    await challenges.updateOne({ id }, { $set: setField });

    const fresh = await challenges.findOne({ id });
    if (fresh?.challenger && fresh?.opponent) {
      // decide winner
      const c = fresh.challenger; const o = fresh.opponent;
      let winner: 'challenger' | 'opponent' | 'tie' = 'tie';
      if (c.correct !== o.correct) winner = c.correct > o.correct ? 'challenger' : 'opponent';
      else if (c.accuracy !== o.accuracy) winner = c.accuracy > o.accuracy ? 'challenger' : 'opponent';
      else if (c.durationSec !== o.durationSec) winner = c.durationSec < o.durationSec ? 'challenger' : 'opponent';
      else winner = 'tie';

      const accounts = await getCurrencyAccountsCollection();
      const txns = await getCurrencyTxnsCollection();
      const now = Date.now();
      if (winner === 'challenger' || winner === 'opponent') {
        const winnerFid = winner === 'challenger' ? fresh.challengerFid : fresh.opponentFid!;
        await accounts.updateOne({ fid: winnerFid }, { $inc: { balance: 20 }, $set: { updatedAt: now } });
        await txns.insertOne({ fid: winnerFid, amount: 20, reason: 'win_reward', refId: id, createdAt: now });
        await challenges.updateOne({ id }, { $set: { status: 'completed' } });
      } else {
        await challenges.updateOne({ id }, { $set: { status: 'tied' } });
      }

      // Update leaderboard for both participants
      const leaderboard = await getLeaderboardCollection();
      const timeInSeconds = Number(durationSec) || 120;
      const timeString = `${Math.floor(timeInSeconds / 60)}:${(timeInSeconds % 60).toString().padStart(2, '0')}`;
      
      // Update challenger leaderboard entry
      const challengerEntry = {
        fid: fresh.challengerFid,
        username: fresh.challengerUsername || '',
        displayName: fresh.challengerDisplayName,
        pfpUrl: fresh.challengerPfpUrl,
        score: c.correct,
        time: timeString,
        timeInSeconds: timeInSeconds,
        completedAt: now,
        mode: 'CHALLENGE' as const,
      };
      await leaderboard.updateOne({ fid: fresh.challengerFid, mode: 'CHALLENGE' }, { $set: challengerEntry }, { upsert: true });

      // Update opponent leaderboard entry
      const opponentEntry = {
        fid: fresh.opponentFid!,
        username: fresh.opponentUsername || '',
        displayName: fresh.opponentDisplayName,
        pfpUrl: fresh.opponentPfpUrl,
        score: o.correct,
        time: timeString,
        timeInSeconds: timeInSeconds,
        completedAt: now,
        mode: 'CHALLENGE' as const,
      };
      await leaderboard.updateOne({ fid: fresh.opponentFid!, mode: 'CHALLENGE' }, { $set: opponentEntry }, { upsert: true });
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to submit challenge' }, { status: 500 });
  }
}


