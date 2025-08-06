import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getLeaderboardCollection, LeaderboardEntry } from '../../../lib/mongodb';

// Global fallback storage that persists across requests
const globalFallbackStorage: LeaderboardEntry[] = [];

export async function GET() {
  try {
    console.log('🔍 Fetching leaderboard...');
    
    // Try MongoDB first
    try {
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

      console.log(`🏆 Returning ${rankedLeaderboard.length} ranked entries from MongoDB`);

      return NextResponse.json({ 
        leaderboard: rankedLeaderboard,
        totalParticipants: rankedLeaderboard.length,
        lastUpdated: new Date().toISOString(),
        storage: 'mongodb'
      });
    } catch (mongodbError) {
      console.error('❌ MongoDB failed, trying fallback:', mongodbError);
      
      // Fallback to KV
      if (kv) {
        try {
          const leaderboard = await kv.get<LeaderboardEntry[]>('quiz_leaderboard') || [];
          console.log(`📊 Retrieved ${leaderboard.length} entries from KV`);
          
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
        } catch (kvError) {
          console.error('❌ KV also failed:', kvError);
        }
      }
      
      // Final fallback to global storage
      console.warn('⚠️ Using fallback storage');
      return NextResponse.json({ 
        leaderboard: globalFallbackStorage,
        totalParticipants: globalFallbackStorage.length,
        lastUpdated: new Date().toISOString(),
        storage: 'fallback'
      });
    }
  } catch (error) {
    console.error('❌ Complete failure in GET:', error);
    return NextResponse.json({ 
      leaderboard: [],
      totalParticipants: 0,
      lastUpdated: new Date().toISOString(),
      storage: 'error'
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

    // Try MongoDB first
    try {
      const collection = await getLeaderboardCollection();
      // Upsert: update if fid exists, otherwise insert
      await collection.updateOne(
        { fid },
        { $set: newEntry },
        { upsert: true }
      );
      console.log('✅ Successfully saved to MongoDB');
      
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
        success: true,
        leaderboard: rankedLeaderboard,
        totalParticipants: rankedLeaderboard.length,
        lastUpdated: new Date().toISOString(),
        storage: 'mongodb'
      });
    } catch (mongodbError) {
      console.error('❌ MongoDB failed, trying fallback:', mongodbError);
      
      // Fallback to KV
      if (kv) {
        try {
          const leaderboard = await kv.get<LeaderboardEntry[]>('quiz_leaderboard') || [];
          const existingIndex = leaderboard.findIndex(entry => entry.fid === fid);
          
          if (existingIndex !== -1) {
            if (score > leaderboard[existingIndex].score) {
              leaderboard[existingIndex] = newEntry;
            }
          } else {
            leaderboard.push(newEntry);
          }
          
          await kv.set('quiz_leaderboard', leaderboard);
          console.log('✅ Successfully saved to KV');
          
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
            success: true,
            leaderboard: rankedLeaderboard,
            totalParticipants: rankedLeaderboard.length,
            lastUpdated: new Date().toISOString(),
            storage: 'kv'
          });
        } catch (kvError) {
          console.error('❌ KV also failed:', kvError);
        }
      }
      
      // Final fallback to global storage
      const existingIndex = globalFallbackStorage.findIndex(entry => entry.fid === fid);
      
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
        storage: 'fallback'
      });
    }
  } catch (error) {
    console.error('❌ Complete failure in POST:', error);
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'testMongoDB') {
      try {
        const collection = await getLeaderboardCollection();
        console.log('✅ MongoDB connection successful');
        
        // Test inserting a document
        const testEntry: LeaderboardEntry = {
          fid: 99999,
          username: 'testuser',
          displayName: 'Test User',
          pfpUrl: 'https://picsum.photos/32/32?random=999',
          score: 5,
          time: '1:30',
          completedAt: Date.now()
        };
        
        await collection.updateOne(
          { fid: testEntry.fid },
          { $set: testEntry },
          { upsert: true }
        );
        
        const count = await collection.countDocuments();
        console.log(`✅ MongoDB test successful. Collection has ${count} documents`);
        
        return NextResponse.json({ 
          success: true, 
          message: 'MongoDB connection and write test successful',
          documentCount: count
        });
      } catch (error) {
        console.error('❌ MongoDB test failed:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'MongoDB test failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

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

      // Try MongoDB first
      try {
        const collection = await getLeaderboardCollection();
        for (const entry of testEntries) {
          await collection.updateOne(
            { fid: entry.fid },
            { $set: entry },
            { upsert: true }
          );
        }
        console.log('✅ Added test data to MongoDB');
        return NextResponse.json({ 
          success: true, 
          message: 'Test data added successfully to MongoDB',
          storage: 'mongodb'
        });
      } catch (error) {
        console.error('❌ Failed to add test data to MongoDB:', error);
        
        // Fallback to KV
        if (kv) {
          try {
            await kv.set('quiz_leaderboard', testEntries);
            console.log('✅ Added test data to KV');
            return NextResponse.json({ 
              success: true, 
              message: 'Test data added successfully to KV',
              storage: 'kv'
            });
          } catch (kvError) {
            console.error('❌ KV also failed:', kvError);
          }
        }
        
        // Final fallback
        globalFallbackStorage.push(...testEntries);
        console.log('✅ Added test data to fallback storage');
        return NextResponse.json({ 
          success: true, 
          message: 'Test data added successfully to fallback storage',
          storage: 'fallback'
        });
      }
    }

    if (action === 'clearData') {
      // Try MongoDB first
      try {
        const collection = await getLeaderboardCollection();
        await collection.deleteMany({});
        console.log('✅ Cleared MongoDB data');
        return NextResponse.json({ 
          success: true, 
          message: 'Data cleared successfully from MongoDB',
          storage: 'mongodb'
        });
      } catch (error) {
        console.error('❌ Failed to clear MongoDB data:', error);
        
        if (kv) {
          try {
            await kv.del('quiz_leaderboard');
            console.log('✅ Cleared KV data');
            return NextResponse.json({ 
              success: true, 
              message: 'Data cleared successfully from KV',
              storage: 'kv'
            });
          } catch (kvError) {
            console.error('❌ KV also failed:', kvError);
          }
        }
        
        globalFallbackStorage.length = 0;
        console.log('✅ Cleared fallback storage');
        return NextResponse.json({ 
          success: true, 
          message: 'Data cleared successfully from fallback storage',
          storage: 'fallback'
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('❌ Failed to handle test action:', error);
    return NextResponse.json({ error: 'Failed to handle test action' }, { status: 500 });
  }
} 