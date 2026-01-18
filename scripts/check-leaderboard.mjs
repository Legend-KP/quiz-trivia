/**
 * Script to inspect all leaderboard entries
 * Run: node scripts/check-leaderboard.mjs
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

async function checkLeaderboard() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected!\n');
    
    const db = client.db('quiz-trivia');
    const collection = db.collection('leaderboard');
    
    // Get all entries
    const allEntries = await collection.find({}).toArray();
    console.log(`📊 Total entries in database: ${allEntries.length}\n`);
    
    // Count by mode
    const modeCount = {};
    allEntries.forEach(entry => {
      const mode = entry.mode || 'NO_MODE';
      modeCount[mode] = (modeCount[mode] || 0) + 1;
    });
    
    console.log('📈 Entries by mode:');
    Object.entries(modeCount).forEach(([mode, count]) => {
      console.log(`  ${mode}: ${count} entries`);
    });
    console.log('');
    
    // Show TIME_MODE entries specifically
    const timeModeEntries = await collection.find({ mode: 'TIME_MODE' }).toArray();
    console.log(`⏱️  TIME_MODE entries: ${timeModeEntries.length}`);
    if (timeModeEntries.length > 0) {
      console.log('\nTIME_MODE Entries:');
      timeModeEntries.forEach((entry, i) => {
        console.log(`  ${i + 1}. ${entry.username} - Score: ${entry.score} - Has quizId: ${!!entry.quizId}`);
      });
    }
    console.log('');
    
    // Show all entries with details
    console.log('📋 All entries:');
    allEntries.forEach((entry, i) => {
      console.log(`${i + 1}. ${entry.username || 'N/A'}`);
      console.log(`   Mode: ${entry.mode || 'N/A'}`);
      console.log(`   Score: ${entry.score || 0}`);
      console.log(`   QuizId: ${entry.quizId || 'none'}`);
      console.log(`   FID: ${entry.fid || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

checkLeaderboard();
