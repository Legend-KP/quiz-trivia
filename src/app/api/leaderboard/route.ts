import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export interface LeaderboardEntry {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  score: number;
  time: string;
  completedAt: number;
}

export async function GET() {
  try {
    // Check if KV is available
    if (!kv) {
      console.warn('KV not available, returning empty leaderboard');
      return NextResponse.json({ leaderboard: [] });
    }

    // Get leaderboard from KV store
    const leaderboard = await kv.get<LeaderboardEntry[]>('quiz_leaderboard') || [];
    
    // Sort by score (descending) and then by completion time (ascending)
    const sortedLeaderboard = leaderboard.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.completedAt - b.completedAt;
    });

    return NextResponse.json({ leaderboard: sortedLeaderboard.slice(0, 10) });
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    // Return empty leaderboard instead of error to prevent app crashes
    return NextResponse.json({ leaderboard: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid, username, displayName, pfpUrl, score, time } = body;

    if (!fid || !username || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: fid, username, score' },
        { status: 400 }
      );
    }

    // Check if KV is available
    if (!kv) {
      console.warn('KV not available, score submission skipped');
      return NextResponse.json({ 
        success: false, 
        error: 'Storage not available',
        leaderboard: [] 
      });
    }

    const newEntry: LeaderboardEntry = {
      fid,
      username,
      displayName,
      pfpUrl,
      score,
      time,
      completedAt: Date.now()
    };

    // Get current leaderboard
    const leaderboard = await kv.get<LeaderboardEntry[]>('quiz_leaderboard') || [];
    
    // Check if user already has an entry
    const existingIndex = leaderboard.findIndex(entry => entry.fid === fid);
    
    if (existingIndex !== -1) {
      // Update existing entry if new score is higher
      if (score > leaderboard[existingIndex].score) {
        leaderboard[existingIndex] = newEntry;
      }
    } else {
      // Add new entry
      leaderboard.push(newEntry);
    }

    // Sort by score (descending) and then by completion time (ascending)
    const sortedLeaderboard = leaderboard.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.completedAt - b.completedAt;
    });

    // Store updated leaderboard
    await kv.set('quiz_leaderboard', sortedLeaderboard);

    return NextResponse.json({ 
      success: true, 
      leaderboard: sortedLeaderboard.slice(0, 10) 
    });
  } catch (error) {
    console.error('Failed to update leaderboard:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update leaderboard',
        leaderboard: [] 
      },
      { status: 500 }
    );
  }
} 