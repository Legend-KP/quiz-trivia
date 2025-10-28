import { NextResponse } from 'next/server';
import { getLeaderboardCollection } from '@/lib/mongodb';
import { getTokenReward } from '@/utils/quizSchedule';

export const runtime = 'nodejs';

/**
 * GET /api/leaderboard/winners?quizId=2025-11-05
 * Returns top 10 winners with token amounts for distribution
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get('quizId');
  const mode = searchParams.get('mode') as 'CLASSIC' | 'TIME_MODE' | 'CHALLENGE' || 'CLASSIC';

  if (!quizId) {
    return NextResponse.json({ error: 'quizId parameter is required' }, { status: 400 });
  }

  try {
    const collection = await getLeaderboardCollection();
    const query: any = { mode, quizId };
    
    const leaderboard = await collection.find(query).toArray();
    
    // Sort by score (desc) then by time (asc)
    const sortedLeaderboard = leaderboard.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return (a.timeInSeconds || 0) - (b.timeInSeconds || 0);
    });

    // Get top 10 winners
    const top10 = sortedLeaderboard.slice(0, 10);
    
    // Format winners with token amounts
    const winners = top10.map((entry, index) => ({
      rank: index + 1,
      fid: entry.fid,
      username: entry.username,
      displayName: entry.displayName,
      score: entry.score,
      time: entry.time,
      timeInSeconds: entry.timeInSeconds,
      tokens: getTokenReward(index + 1),
      completedAt: entry.completedAt,
    }));

    return NextResponse.json({
      success: true,
      quizId,
      mode,
      topic: 'Weekly Quiz', // This could be passed as a parameter or fetched from config
      winners,
      totalParticipants: leaderboard.length,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to fetch winners:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch winners' 
    }, { status: 500 });
  }
}
