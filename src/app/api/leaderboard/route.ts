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
  rank?: number;
}

// Fallback in-memory storage for development/testing
let fallbackStorage: LeaderboardEntry[] = [];

export async function GET() {
  try {
    console.log('🔍 Fetching leaderboard...');
    
    // Check if KV is available
    if (!kv) {
      console.warn('⚠️ KV not available, using fallback storage');
      return NextResponse.json({ 
        leaderboard: fallbackStorage,
        totalParticipants: fallbackStorage.length,
        lastUpdated: new Date().toISOString(),
        storage: 'fallback'
      });
    }

    // Get leaderboard from KV store
    const leaderboard = await kv.get<LeaderboardEntry[]>('quiz_leaderboard') || [];
    console.log(`📊 Retrieved ${leaderboard.length} entries from KV`);
    
    // Sort by score (descending) and then by completion time (ascending)
    const sortedLeaderboard = leaderboard.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.completedAt - b.completedAt;
    });

    // Add rank to each entry
    const rankedLeaderboard = sortedLeaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

    console.log(`🏆 Returning ${rankedLeaderboard.length} ranked entries`);

    // Return all entries (not just top 10) for public viewing
    return NextResponse.json({ 
      leaderboard: rankedLeaderboard,
      totalParticipants: rankedLeaderboard.length,
      lastUpdated: new Date().toISOString(),
      storage: 'kv'
    });
  } catch (error) {
    console.error('❌ Failed to fetch leaderboard:', error);
    // Return fallback data instead of empty array
    return NextResponse.json({ 
      leaderboard: fallbackStorage,
      totalParticipants: fallbackStorage.length,
      lastUpdated: new Date().toISOString(),
      storage: 'fallback-error'
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid, username, displayName, pfpUrl, score, time } = body;

    console.log('📝 Submitting score:', { fid, username, score, time });

    if (!fid || !username || score === undefined) {
      console.error('❌ Missing required fields:', { fid, username, score });
      return NextResponse.json(
        { error: 'Missing required fields: fid, username, score' },
        { status: 400 }
      );
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

    // Check if KV is available
    if (!kv) {
      console.warn('⚠️ KV not available, using fallback storage');
      
      // Use fallback storage
      const existingIndex = fallbackStorage.findIndex(entry => entry.fid === fid);
      
      if (existingIndex !== -1) {
        if (score > fallbackStorage[existingIndex].score) {
          fallbackStorage[existingIndex] = newEntry;
          console.log('🔄 Updated existing entry in fallback storage');
        }
      } else {
        fallbackStorage.push(newEntry);
        console.log('➕ Added new entry to fallback storage');
      }

      // Sort fallback storage
      fallbackStorage.sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return a.completedAt - b.completedAt;
      });

      const rankedFallback = fallbackStorage.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      return NextResponse.json({ 
        success: true, 
        leaderboard: rankedFallback,
        totalParticipants: rankedFallback.length,
        lastUpdated: new Date().toISOString(),
        storage: 'fallback'
      });
    }

    // Get current leaderboard from KV
    const leaderboard = await kv.get<LeaderboardEntry[]>('quiz_leaderboard') || [];
    console.log(`📊 Current KV leaderboard has ${leaderboard.length} entries`);
    
    // Check if user already has an entry
    const existingIndex = leaderboard.findIndex(entry => entry.fid === fid);
    
    if (existingIndex !== -1) {
      // Update existing entry if new score is higher
      if (score > leaderboard[existingIndex].score) {
        leaderboard[existingIndex] = newEntry;
        console.log('🔄 Updated existing entry in KV');
      } else {
        console.log('⏭️ New score not higher, keeping existing entry');
      }
    } else {
      // Add new entry
      leaderboard.push(newEntry);
      console.log('➕ Added new entry to KV');
    }

    // Sort by score (descending) and then by completion time (ascending)
    const sortedLeaderboard = leaderboard.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.completedAt - b.completedAt;
    });

    // Add rank to each entry
    const rankedLeaderboard = sortedLeaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

    // Store updated leaderboard
    await kv.set('quiz_leaderboard', rankedLeaderboard);
    console.log(`💾 Stored ${rankedLeaderboard.length} entries to KV`);

    return NextResponse.json({ 
      success: true, 
      leaderboard: rankedLeaderboard,
      totalParticipants: rankedLeaderboard.length,
      lastUpdated: new Date().toISOString(),
      storage: 'kv'
    });
  } catch (error) {
    console.error('❌ Failed to update leaderboard:', error);
    
    // Try fallback storage as last resort
    try {
      const { fid, username, displayName, pfpUrl, score, time } = await request.json();
      const newEntry: LeaderboardEntry = {
        fid,
        username,
        displayName,
        pfpUrl,
        score,
        time,
        completedAt: Date.now()
      };

      const existingIndex = fallbackStorage.findIndex(entry => entry.fid === fid);
      
      if (existingIndex !== -1) {
        if (score > fallbackStorage[existingIndex].score) {
          fallbackStorage[existingIndex] = newEntry;
        }
      } else {
        fallbackStorage.push(newEntry);
      }

      fallbackStorage.sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return a.completedAt - b.completedAt;
      });

      const rankedFallback = fallbackStorage.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      return NextResponse.json({ 
        success: true, 
        leaderboard: rankedFallback,
        totalParticipants: rankedFallback.length,
        lastUpdated: new Date().toISOString(),
        storage: 'fallback-error'
      });
    } catch (fallbackError) {
      console.error('❌ Even fallback storage failed:', fallbackError);
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
} 