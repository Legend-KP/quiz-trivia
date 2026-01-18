/**
 * Script to clear time_attempts collection from MongoDB
 * This stores individual Time Mode game attempts
 * Run: node scripts/clear-time-attempts.mjs
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

async function clearTimeAttempts() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected!');
    
    const db = client.db('quiz-trivia');
    const collection = db.collection('time_attempts');
    
    // Check current entries first
    const currentCount = await collection.countDocuments();
    console.log(`📊 Current time_attempts entries: ${currentCount}`);
    
    // Delete ALL time_attempts entries
    console.log('🗑️  Deleting all time_attempts entries...');
    const result = await collection.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} time_attempts entries`);
    
    // Verify
    const remaining = await collection.countDocuments();
    console.log(`📊 Remaining time_attempts entries: ${remaining}`);
    
    if (remaining === 0) {
      console.log('🎉 time_attempts collection is now empty!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

clearTimeAttempts();
