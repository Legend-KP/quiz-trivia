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

// Global fallback storage that persists across requests
const globalFallbackStorage: LeaderboardEntry[] = [];

export async function GET() {
  try {
    console.log('🔍 Fetching leaderboard...');
    console.log('📊 Global fallback storage has', globalFallbackStorage.length, 'entries');
    
    // Check if KV is available
    if (!kv) {
      console.warn('⚠️ KV not available, using fallback storage');
      return NextResponse.json({ 
        leaderboard: globalFallbackStorage,
        totalParticipants: globalFallbackStorage.length,
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
      leaderboard: globalFallbackStorage,
      totalParticipants: globalFallbackStorage.length,
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
    console.log('📊 Current global fallback storage has', globalFallbackStorage.length, 'entries');

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
      
      // Use fallback storage - we need to modify the array
      const existingIndex = globalFallbackStorage.findIndex(entry => entry.fid === fid);
      
      if (existingIndex !== -1) {
        if (score > globalFallbackStorage[existingIndex].score) {
          globalFallbackStorage[existingIndex] = newEntry;
          console.log('🔄 Updated existing entry in fallback storage');
        } else {
          console.log('⏭️ New score not higher, keeping existing entry');
        }
      } else {
        globalFallbackStorage.push(newEntry);
        console.log('➕ Added new entry to fallback storage');
      }

      // Sort fallback storage
      globalFallbackStorage.sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return a.completedAt - b.completedAt;
      });

      const rankedFallback = globalFallbackStorage.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      console.log('📊 Fallback storage now has', globalFallbackStorage.length, 'entries');

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

      const existingIndex = globalFallbackStorage.findIndex(entry => entry.fid === fid);
      
      if (existingIndex !== -1) {
        if (score > globalFallbackStorage[existingIndex].score) {
          globalFallbackStorage[existingIndex] = newEntry;
        }
      } else {
        globalFallbackStorage.push(newEntry);
      }

      globalFallbackStorage.sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return a.completedAt - b.completedAt;
      });

      const rankedFallback = globalFallbackStorage.map((entry, index) => ({
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'addTestData') {
      const testEntries: LeaderboardEntry[] = [
        {
          fid: 12345,
          username: 'testuser1',
          displayName: 'Test User 1',
          pfpUrl: 'https://picsum.photos/32/32?random=1',
          score: 4,
          time: '2:15',
          completedAt: Date.now() - 3600000 // 1 hour ago
        },
        {
          fid: 67890,
          username: 'testuser2',
          displayName: 'Test User 2',
          pfpUrl: 'https://picsum.photos/32/32?random=2',
          score: 3,
          time: '3:45',
          completedAt: Date.now() - 7200000 // 2 hours ago
        },
        {
          fid: 11111,
          username: 'testuser3',
          displayName: 'Test User 3',
          pfpUrl: 'https://picsum.photos/32/32?random=3',
          score: 2,
          time: '4:20',
          completedAt: Date.now() - 10800000 // 3 hours ago
        }
      ];

      if (kv) {
        // Add to KV
        await kv.set('quiz_leaderboard', testEntries);
        console.log('✅ Added test data to KV');
      } else {
        // Add to fallback storage
        globalFallbackStorage.push(...testEntries);
        console.log('✅ Added test data to fallback storage');
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Test data added successfully',
        storage: kv ? 'kv' : 'fallback'
      });
    }

    if (action === 'clearData') {
      if (kv) {
        await kv.del('quiz_leaderboard');
        console.log('✅ Cleared KV data');
      } else {
        globalFallbackStorage.length = 0;
        console.log('✅ Cleared fallback storage');
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Data cleared successfully',
        storage: kv ? 'kv' : 'fallback'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('❌ Failed to handle test action:', error);
    return NextResponse.json({ error: 'Failed to handle test action' }, { status: 500 });
  }
} 