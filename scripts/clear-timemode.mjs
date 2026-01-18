/**
 * Script to clear Time Mode leaderboard entries from MongoDB
 * Run: node scripts/clear-timemode.mjs
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
  //console.error('❌ MONGODB_URI environment variable is not set');
  //console.log('💡 Add it to your .env.local file or run with:');
  //console.log('   MONGODB_URI="your-connection-string" node scripts/clear-timemode.mjs');
  //process.exit(1);
}

async function clearTimeModeLeaderboard() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    //console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    //console.log('✅ Connected!');
    
    const db = client.db('quiz-trivia');
    const collection = db.collection('leaderboard');
    
    // Delete all TIME_MODE entries (without quizId)
    //console.log('🗑️  Deleting Time Mode entries...');
    const result = await collection.deleteMany({ 
      mode: 'TIME_MODE',
      $or: [
        { quizId: { $exists: false } },
        { quizId: null }
      ]
    });
    
    console.log(`✅ Successfully deleted ${result.deletedCount} Time Mode entries`);
    
    // Verify
    const remaining = await collection.countDocuments({ mode: 'TIME_MODE' });
    //console.log(`📊 Remaining Time Mode entries: ${remaining}`);
    
  } catch (error) {
   // console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    //console.log('🔌 Connection closed');
  }
}

clearTimeModeLeaderboard();
