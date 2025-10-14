import { NextResponse } from 'next/server';
import { getTimeAttemptsCollection, getLeaderboardCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { fid, correctCount, totalAnswered, durationSec, avgAnswerTimeSec, username, displayName, pfpUrl } = await request.json();
    const nfid = Number(fid);
    if (!nfid || Number.isNaN(nfid)) {
      return NextResponse.json({ error: 'fid required' }, { status: 400 });
    }

    const attempts = await getTimeAttemptsCollection();
    const accuracy = totalAnswered > 0 ? correctCount / totalAnswered : 0;
    const createdAt = Date.now();

    await attempts.insertOne({
      fid: nfid,
      correctCount: Number(correctCount) || 0,
      totalAnswered: Number(totalAnswered) || 0,
      accuracy,
      durationSec: Number(durationSec) || 45,
      avgAnswerTimeSec: Number(avgAnswerTimeSec) || (durationSec && totalAnswered ? Number(durationSec) / Number(totalAnswered) : 0),
      createdAt,
    });

    // Update the main leaderboard with tiebreaker compatible fields
    const leaderboard = await getLeaderboardCollection();
    const timeInSeconds = Number(durationSec) || 45;
    const entry = {
      fid: nfid,
      username: String(username || ''),
      displayName: displayName ? String(displayName) : undefined,
      pfpUrl: pfpUrl ? String(pfpUrl) : undefined,
      score: Number(correctCount) || 0, // primary sort
      time: `${Math.floor(timeInSeconds / 60)}:${(timeInSeconds % 60).toString().padStart(2, '0')}`,
      timeInSeconds: timeInSeconds,
      completedAt: createdAt,
      mode: 'TIME_MODE' as const,
    };

    await leaderboard.updateOne({ fid: nfid, mode: 'TIME_MODE' }, { $set: entry }, { upsert: true });

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to submit time mode result' }, { status: 500 });
  }
}


