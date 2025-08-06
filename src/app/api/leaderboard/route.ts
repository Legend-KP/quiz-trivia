import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getLeaderboardCollection, LeaderboardEntry } from '../../../lib/mongodb';

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

    const collection = await getLeaderboardCollection();
    const leaderboard = await collection.find({}).toArray();
    console.log(`📊 Retrieved ${leaderboard.length} entries from MongoDB`);

    // Sort by score (descending) and then by completion time (ascending)
    const sortedLeaderboard = leaderboard.sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.completedAt - b.completedAt;
    });

    // Add rank to each entry
    const rankedLeaderboard = sortedLeaderboard.map((entry: LeaderboardEntry, index: number) => ({
      ...entry,
      rank: index + 1
    }));

    console.log(`🏆 Returning ${rankedLeaderboard.length} ranked entries`);

    // Return all entries (not just top 10) for public viewing
    return NextResponse.json({ 
      leaderboard: rankedLeaderboard,
      totalParticipants: rankedLeaderboard.length,
      lastUpdated: new Date().toISOString(),
      storage: 'mongodb'
    });
  } catch (error) {
    console.error('❌ Failed to fetch leaderboard from MongoDB:', error);
    // Fallback to existing logic
    if (!kv) {
      console.warn('⚠️ KV not available, using fallback storage');
      return NextResponse.json({ 
        leaderboard: globalFallbackStorage,
        totalParticipants: globalFallbackStorage.length,
        lastUpdated: new Date().toISOString(),
        storage: 'fallback'
      });
    }
    const leaderboard = await kv.get<LeaderboardEntry[]>('quiz_leaderboard') || [];
    const sortedLeaderboard = leaderboard.sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.completedAt - b.completedAt;
    });
    const rankedLeaderboard = sortedLeaderboard.map((entry: LeaderboardEntry, index: number) => ({
      ...entry,
      rank: index + 1
    }));
    return NextResponse.json({ 
      leaderboard: rankedLeaderboard,
      totalParticipants: rankedLeaderboard.length,
      lastUpdated: new Date().toISOString(),
      storage: 'kv'
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

    const collection = await getLeaderboardCollection();
    // Upsert: update if fid exists, otherwise insert
    await collection.updateOne(
      { fid },
      { $set: newEntry },
      { upsert: true }
    );
    // Fetch updated leaderboard
    const leaderboard = await collection.find({}).toArray();
    const sortedLeaderboard = leaderboard.sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.completedAt - b.completedAt;
    });
    const rankedLeaderboard = sortedLeaderboard.map((entry: LeaderboardEntry, index: number) => ({
      ...entry,
      rank: index + 1
    }));
    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      totalParticipants: rankedLeaderboard.length,
      lastUpdated: new Date().toISOString(),
      storage: 'mongodb'
    });
  } catch (error) {
    console.error('❌ Failed to update leaderboard in MongoDB:', error);
    // Fallback to existing logic
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

      const existingIndex = globalFallbackStorage.findIndex((entry: LeaderboardEntry) => entry.fid === fid);
      
      if (existingIndex !== -1) {
        if (score > globalFallbackStorage[existingIndex].score) {
          globalFallbackStorage[existingIndex] = newEntry;
        }
      } else {
        globalFallbackStorage.push(newEntry);
      }

      globalFallbackStorage.sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        return a.completedAt - b.completedAt;
      });

      const rankedFallback = globalFallbackStorage.map((entry: LeaderboardEntry, index: number) => ({
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