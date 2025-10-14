import { NextResponse } from 'next/server';
import { getLeaderboardCollection, LeaderboardEntry } from '../../../lib/mongodb';

export const runtime = 'nodejs';

// Helper function to convert time string (MM:SS) to seconds
function timeStringToSeconds(timeString: string): number {
  const parts = timeString.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return minutes * 60 + seconds;
  }
  return 0;
}

// Global fallback storage that persists across requests (only for local/dev emergency)
const globalFallbackStorage: LeaderboardEntry[] = [];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') as 'CLASSIC' | 'TIME_MODE' | 'CHALLENGE' | null;
  
  try {
    // Try MongoDB first
    const collection = await getLeaderboardCollection();
    const query = mode ? { mode } : {};
    const leaderboard = await collection.find(query).toArray();

    const sortedLeaderboard = leaderboard.sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
      if (a.score !== b.score) return b.score - a.score;
      return (a.timeInSeconds || 0) - (b.timeInSeconds || 0);
    });

    const rankedLeaderboard = sortedLeaderboard.map((entry: LeaderboardEntry, index: number) => ({
      ...entry,
      rank: index + 1,
    }));

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      totalParticipants: rankedLeaderboard.length,
      lastUpdated: new Date().toISOString(),
      storage: 'mongodb',
      mode: mode || 'ALL',
    });
      } catch (_mongodbError) {
      console.error('MongoDB GET failed:', _mongodbError);
      const filteredFallback = mode ? globalFallbackStorage.filter(entry => entry.mode === mode) : globalFallbackStorage;
      return NextResponse.json({
        leaderboard: filteredFallback,
        totalParticipants: filteredFallback.length,
        lastUpdated: new Date().toISOString(),
        storage: 'fallback',
        error: 'MongoDB GET failed',
        mode: mode || 'ALL',
      }, { status: 200 });
    }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid, username, displayName, pfpUrl, score, time, mode } = body;

    if (!fid || !username || score === undefined || !mode) {
      return NextResponse.json({ error: 'Missing required fields: fid, username, score, mode' }, { status: 400 });
    }

    const newEntry: LeaderboardEntry = {
      fid,
      username,
      displayName,
      pfpUrl,
      score,
      time,
      timeInSeconds: timeStringToSeconds(time),
      completedAt: Date.now(),
      mode,
    };

    const collection = await getLeaderboardCollection();
    await collection.updateOne({ fid, mode }, { $set: newEntry }, { upsert: true });

    // Get leaderboard for the specific mode
    const leaderboard = await collection.find({ mode }).toArray();
    const sortedLeaderboard = leaderboard.sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
      if (a.score !== b.score) return b.score - a.score;
      return (a.timeInSeconds || 0) - (b.timeInSeconds || 0);
    });
    const rankedLeaderboard = sortedLeaderboard.map((entry: LeaderboardEntry, index: number) => ({
      ...entry,
      rank: index + 1,
    }));

    return NextResponse.json({
      success: true,
      leaderboard: rankedLeaderboard,
      totalParticipants: rankedLeaderboard.length,
      lastUpdated: new Date().toISOString(),
      storage: 'mongodb',
      mode,
    });
      } catch (_mongodbError) {
      console.error('MongoDB POST failed:', _mongodbError);

      // Fallback to in-memory only as a last resort (non-persistent)
      try {
        const { fid, username, displayName, pfpUrl, score, time, mode } = await request.json();
        const newEntry: LeaderboardEntry = { fid, username, displayName, pfpUrl, score, time, timeInSeconds: timeStringToSeconds(time), completedAt: Date.now(), mode };

        const existingIndex = globalFallbackStorage.findIndex((entry) => entry.fid === fid && entry.mode === mode);
        if (existingIndex !== -1) {
          if (score > globalFallbackStorage[existingIndex].score) globalFallbackStorage[existingIndex] = newEntry;
        } else {
          globalFallbackStorage.push(newEntry);
        }

        // Filter by mode and sort
        const modeEntries = globalFallbackStorage.filter(entry => entry.mode === mode);
        modeEntries.sort((a, b) => (a.score !== b.score ? b.score - a.score : (a.timeInSeconds || 0) - (b.timeInSeconds || 0)));
        const rankedFallback = modeEntries.map((entry, index) => ({ ...entry, rank: index + 1 }));

        return NextResponse.json({
          success: true,
          leaderboard: rankedFallback,
          totalParticipants: rankedFallback.length,
          lastUpdated: new Date().toISOString(),
          storage: 'fallback',
          mode,
        });
      } catch (_fallbackError) {
        return NextResponse.json({ success: false, error: 'Failed to update leaderboard', leaderboard: [] }, { status: 500 });
      }
    }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'testMongoDB') {
      try {
        const collection = await getLeaderboardCollection();
        const testEntry: LeaderboardEntry = {
          fid: 99999,
          username: 'testuser',
          displayName: 'Test User',
          pfpUrl: 'https://picsum.photos/32/32?random=999',
          score: 5,
          time: '1:30',
          timeInSeconds: timeStringToSeconds('1:30'),
          completedAt: Date.now(),
          mode: 'CLASSIC',
        };
        await collection.updateOne({ fid: testEntry.fid }, { $set: testEntry }, { upsert: true });
        const count = await collection.countDocuments();
        return NextResponse.json({ success: true, message: 'MongoDB test OK', documentCount: count });
      } catch (_error) {
        return NextResponse.json({ success: false, error: 'MongoDB test failed' }, { status: 500 });
      }
    }

    if (action === 'addTestData') {
      const testEntries: LeaderboardEntry[] = [
        { fid: 12345, username: 'testuser1', displayName: 'Test User 1', pfpUrl: 'https://picsum.photos/32/32?random=1', score: 4, time: '2:15', timeInSeconds: timeStringToSeconds('2:15'), completedAt: Date.now() - 3600000, mode: 'CLASSIC' },
        { fid: 67890, username: 'testuser2', displayName: 'Test User 2', pfpUrl: 'https://picsum.photos/32/32?random=2', score: 3, time: '3:45', timeInSeconds: timeStringToSeconds('3:45'), completedAt: Date.now() - 7200000, mode: 'TIME_MODE' },
        { fid: 11111, username: 'testuser3', displayName: 'Test User 3', pfpUrl: 'https://picsum.photos/32/32?random=3', score: 2, time: '4:20', timeInSeconds: timeStringToSeconds('4:20'), completedAt: Date.now() - 10800000, mode: 'CHALLENGE' },
      ];
      try {
        const collection = await getLeaderboardCollection();
        for (const entry of testEntries) {
          await collection.updateOne({ fid: entry.fid }, { $set: entry }, { upsert: true });
        }
        return NextResponse.json({ success: true, message: 'Test data added to MongoDB', storage: 'mongodb' });
      } catch (_error) {
        return NextResponse.json({ success: false, error: 'Failed to add test data' }, { status: 500 });
      }
    }

    if (action === 'clearData') {
      try {
        const collection = await getLeaderboardCollection();
        await collection.deleteMany({});
        return NextResponse.json({ success: true, message: 'Data cleared from MongoDB', storage: 'mongodb' });
      } catch (_error) {
        globalFallbackStorage.length = 0;
        return NextResponse.json({ success: true, message: 'Data cleared from fallback', storage: 'fallback' });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to handle action' }, { status: 500 });
  }
} 