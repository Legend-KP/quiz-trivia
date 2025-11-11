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
  const quizId = searchParams.get('quizId') as string | null;
  
  try {
    // Try MongoDB first
    const collection = await getLeaderboardCollection();
    const query: any = {};
    
    if (quizId) {
      // Weekly Quiz (CLASSIC mode with quizId)
      query.quizId = quizId;
      query.mode = 'CLASSIC';
    } else if (mode) {
      // For TIME_MODE and CHALLENGE, ensure we exclude any entries with quizId
      // and strictly filter by mode
      query.mode = mode;
      // Exclude entries with quizId (those are CLASSIC Weekly Quiz entries)
      query.quizId = { $exists: false };
    }
    
    let leaderboard = await collection.find(query).toArray();

    // Filter out invalid entries for Weekly Quiz (quizId present)
    if (quizId) {
      leaderboard = leaderboard.filter((entry: LeaderboardEntry) => {
        // Remove entries with invalid scores (>10 or <-10)
        if (entry.score > 10 || entry.score < -10) return false;
        // Remove entries with invalid time (0:00 or missing)
        if (!entry.time || entry.time === '0:00' || (entry.timeInSeconds || 0) === 0) return false;
        // Remove entries without quizId (old entries)
        if (!entry.quizId) return false;
        // Ensure mode is CLASSIC
        if (entry.mode !== 'CLASSIC') return false;
        return true;
      });
    } else if (mode) {
      // For TIME_MODE and CHALLENGE, ensure strict filtering
      leaderboard = leaderboard.filter((entry: LeaderboardEntry) => {
        // Remove any entries with quizId (those belong to CLASSIC Weekly Quiz)
        if (entry.quizId) return false;
        // Ensure mode matches exactly
        if (entry.mode !== mode) return false;
        // Ensure mode field exists
        if (!entry.mode) return false;
        return true;
      });
    } else {
      // ALL mode - show all entries but still filter out invalid ones
      leaderboard = leaderboard.filter((entry: LeaderboardEntry) => {
        // Ensure mode field exists
        if (!entry.mode) return false;
        return true;
      });
    }

    const sortedLeaderboard = leaderboard.sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
      if (a.score !== b.score) return b.score - a.score;
      return (a.timeInSeconds || 0) - (b.timeInSeconds || 0);
    });

    // Show all participants for all modes - no limit
    // (Previously TIME_MODE was limited to top 100, but now showing all)
    const rankedLeaderboard = sortedLeaderboard.map((entry: LeaderboardEntry, index: number) => ({
      ...entry,
      rank: index + 1,
    }));

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      totalParticipants: rankedLeaderboard.length, // Total participants
      displayedParticipants: rankedLeaderboard.length, // All participants are displayed
      lastUpdated: new Date().toISOString(),
      storage: 'mongodb',
      mode: mode || 'ALL',
      quizId: quizId || null,
    });
      } catch (_mongodbError) {
      console.error('MongoDB GET failed:', _mongodbError);
      let filteredFallback = globalFallbackStorage;
      if (mode) filteredFallback = filteredFallback.filter(entry => entry.mode === mode);
      if (quizId) filteredFallback = filteredFallback.filter(entry => entry.quizId === quizId);
      
      return NextResponse.json({
        leaderboard: filteredFallback,
        totalParticipants: filteredFallback.length,
        lastUpdated: new Date().toISOString(),
        storage: 'fallback',
        error: 'MongoDB GET failed',
        mode: mode || 'ALL',
        quizId: quizId || null,
      }, { status: 200 });
    }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid, username, displayName, pfpUrl, score, time, mode, quizId } = body;

    if (!fid || !username || score === undefined || !mode) {
      return NextResponse.json({ error: 'Missing required fields: fid, username, score, mode' }, { status: 400 });
    }

    // Validation: If quizId is provided, mode MUST be CLASSIC (Weekly Quiz)
    if (quizId && mode !== 'CLASSIC') {
      return NextResponse.json({ error: 'Invalid mode: quizId can only be used with CLASSIC mode (Weekly Quiz)' }, { status: 400 });
    }

    // Validation: Weekly Quiz (CLASSIC with quizId) scores must be between -10 and +10
    if (quizId && mode === 'CLASSIC') {
      const numScore = Number(score);
      if (isNaN(numScore) || numScore < -10 || numScore > 10) {
        return NextResponse.json({ error: `Invalid score for Weekly Quiz: ${score}. Score must be between -10 and +10.` }, { status: 400 });
      }
    }

    // Validation: Time must be valid and not 0:00 for Weekly Quiz
    if (quizId && mode === 'CLASSIC') {
      const timeInSec = timeStringToSeconds(time);
      if (!time || time === '0:00' || timeInSec === 0) {
        return NextResponse.json({ error: 'Invalid completion time: time cannot be 0:00 for Weekly Quiz' }, { status: 400 });
      }
    }

    const newEntry: LeaderboardEntry = {
      fid,
      username,
      displayName,
      pfpUrl,
      score: Number(score), // Ensure score is a number
      time,
      timeInSeconds: timeStringToSeconds(time),
      completedAt: Date.now(),
      mode,
      quizId, // Include quizId if provided
    };

    const collection = await getLeaderboardCollection();
    if (quizId) {
      // Enforce single attempt per quizId: if an entry exists for this fid+mode+quizId, do not overwrite
      const existing = await collection.findOne({ fid, mode, quizId });
      if (existing) {
        return NextResponse.json({ success: false, error: 'already_submitted', message: 'User has already submitted for this quiz.' }, { status: 409 });
      }
      await collection.insertOne(newEntry);
    } else {
      // Fallback behavior when quizId is absent: upsert by fid+mode
      await collection.updateOne({ fid, mode }, { $set: newEntry }, { upsert: true });
    }

    // Get leaderboard for the specific mode (matching GET endpoint logic)
    const query: any = {};
    if (quizId) {
      query.quizId = quizId;
      query.mode = 'CLASSIC';
    } else {
      query.mode = mode;
      query.quizId = { $exists: false }; // Exclude entries with quizId
    }
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