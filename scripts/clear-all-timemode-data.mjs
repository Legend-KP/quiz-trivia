/**
 * Script to clear ALL Time Mode data from MongoDB
 * Clears both:
 * 1. leaderboard (TIME_MODE entries)
 * 2. time_attempts (all game attempts)
 * 
 * Run: node scripts/clear-all-timemode-data.mjs
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function clearAllTimeModeData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected!\n');
    
    const db = client.db('quiz-trivia');
    
    // ========== Clear Leaderboard (TIME_MODE entries) ==========
    console.log('📋 LEADERBOARD COLLECTION:');
    const leaderboardCollection = db.collection('leaderboard');
    
    const leaderboardCount = await leaderboardCollection.countDocuments({ mode: 'TIME_MODE' });
    console.log(`  Current TIME_MODE entries: ${leaderboardCount}`);
    
    if (leaderboardCount > 0) {
      console.log('  🗑️  Deleting TIME_MODE entries from leaderboard...');
      const leaderboardResult = await leaderboardCollection.deleteMany({ 
        mode: 'TIME_MODE',
        $or: [
          { quizId: { $exists: false } },
          { quizId: null }
        ]
      });
      console.log(`  ✅ Deleted ${leaderboardResult.deletedCount} entries\n`);
    } else {
      console.log('  ✅ Already empty\n');
    }
    
    // ========== Clear time_attempts ==========
    console.log('⏱️  TIME_ATTEMPTS COLLECTION:');
    const timeAttemptsCollection = db.collection('time_attempts');
    
    const timeAttemptsCount = await timeAttemptsCollection.countDocuments();
    console.log(`  Current time_attempts entries: ${timeAttemptsCount}`);
    
    if (timeAttemptsCount > 0) {
      console.log('  🗑️  Deleting all time_attempts entries...');
      const timeAttemptsResult = await timeAttemptsCollection.deleteMany({});
      console.log(`  ✅ Deleted ${timeAttemptsResult.deletedCount} entries\n`);
    } else {
      console.log('  ✅ Already empty\n');
    }
    
    // ========== Final Verification ==========
    console.log('🔍 VERIFICATION:');
    const finalLeaderboard = await leaderboardCollection.countDocuments({ mode: 'TIME_MODE' });
    const finalTimeAttempts = await timeAttemptsCollection.countDocuments();
    
    console.log(`  Leaderboard (TIME_MODE): ${finalLeaderboard} entries`);
    console.log(`  time_attempts: ${finalTimeAttempts} entries\n`);
    
    if (finalLeaderboard === 0 && finalTimeAttempts === 0) {
      console.log('🎉 SUCCESS! All Time Mode data has been cleared!');
      console.log('💡 The contest can now start with a clean slate.');
    } else {
      console.log('⚠️  Warning: Some entries may still remain.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

clearAllTimeModeData();
