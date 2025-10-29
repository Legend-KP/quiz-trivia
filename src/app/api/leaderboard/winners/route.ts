import { NextResponse } from 'next/server';
import { getLeaderboardCollection, LeaderboardEntry } from '../../../lib/mongodb';
import { getTokenReward } from '../../../lib/weeklyQuiz';

export const runtime = 'nodejs';

// GET /api/leaderboard/winners?quizId=2025-11-05
// Returns top 10 winners with wallet addresses for token distribution
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get('quizId');
  
  if (!quizId) {
    return NextResponse.json({ error: 'quizId parameter is required' }, { status: 400 });
  }
  
  try {
    const collection = await getLeaderboardCollection();
    
    // Get all entries for this specific quiz
    const leaderboard = await collection.find({ 
      quizId: quizId,
      mode: 'CLASSIC' // Weekly quiz uses CLASSIC mode
    }).toArray();

    // Sort by score (descending) then by time (ascending)
    const sortedLeaderboard = leaderboard.sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
      if (a.score !== b.score) return b.score - a.score;
      return (a.timeInSeconds || 0) - (b.timeInSeconds || 0);
    });

    // Get top 10 winners
    const top10 = sortedLeaderboard.slice(0, 10);
    
    // Format winners with token amounts
    const winners = top10.map((player, index) => ({
      rank: index + 1,
      fid: player.fid,
      username: player.username,
      displayName: player.displayName,
      verifiedAddress: null, // This would need to be fetched from user's verified wallet
      score: player.score,
      time: player.time,
      tokens: getTokenReward(index + 1),
      completedAt: player.completedAt
    }));

    return NextResponse.json({
      quizId,
      topic: "DeFi Protocols", // This should come from quiz config
      totalParticipants: leaderboard.length,
      winners,
      lastUpdated: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Failed to fetch winners:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch winners',
      quizId,
      winners: []
    }, { status: 500 });
  }
}

// POST /api/leaderboard/winners - For admin to update verified addresses
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quizId, winners } = body;
    
    if (!quizId || !Array.isArray(winners)) {
      return NextResponse.json({ error: 'quizId and winners array are required' }, { status: 400 });
    }
    
    // This endpoint would be used to update verified wallet addresses
    // For now, just return the formatted data for manual token distribution
    
    const formattedWinners = winners.map((winner: any) => ({
      rank: winner.rank,
      fid: winner.fid,
      username: winner.username,
      displayName: winner.displayName,
      verifiedAddress: winner.verifiedAddress || 'NOT_VERIFIED',
      score: winner.score,
      time: winner.time,
      tokens: winner.tokens,
      qtAmount: winner.tokens,
      usdValue: Math.round(winner.tokens * 0.0001 * 100) / 100, // Assuming $0.0001 per QT
    }));
    
    return NextResponse.json({
      success: true,
      quizId,
      winners: formattedWinners,
      csvData: generateCSV(formattedWinners),
      message: 'Winners data formatted for token distribution'
    });
    
  } catch (error) {
    console.error('Failed to process winners:', error);
    return NextResponse.json({ 
      error: 'Failed to process winners'
    }, { status: 500 });
  }
}

// Generate CSV data for manual token distribution
function generateCSV(winners: any[]): string {
  const headers = 'Rank,FID,Username,DisplayName,Verified_Address,QT_Tokens,USD_Value';
  const rows = winners.map(winner => 
    `${winner.rank},${winner.fid},${winner.username},${winner.displayName || ''},${winner.verifiedAddress},${winner.tokens},$${winner.usdValue}`
  );
  
  return [headers, ...rows].join('\n');
}
