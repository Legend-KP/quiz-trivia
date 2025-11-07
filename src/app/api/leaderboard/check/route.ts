import { NextResponse } from 'next/server';
import { getLeaderboardCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

// GET /api/leaderboard/check?fid=123&quizId=2025-11-05
// Check if user has already completed a specific quiz
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');
  const quizId = searchParams.get('quizId');
  
  if (!fid || !quizId) {
    return NextResponse.json({ error: 'fid and quizId are required' }, { status: 400 });
  }

  try {
    const collection = await getLeaderboardCollection();
    const nfid = Number(fid);
    
    if (Number.isNaN(nfid)) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
    }

    // Check if user has already submitted for this quiz
    const existing = await collection.findOne({ 
      fid: nfid, 
      mode: 'CLASSIC', 
      quizId: quizId 
    });

    return NextResponse.json({
      completed: !!existing,
      exists: !!existing,
      entry: existing || null
    });
  } catch (error) {
    console.error('Failed to check completion status:', error);
    return NextResponse.json({ 
      error: 'Failed to check completion status',
      completed: false 
    }, { status: 500 });
  }
}

