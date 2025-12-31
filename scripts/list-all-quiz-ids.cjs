/**
 * List All Quiz IDs
 * 
 * This script lists all unique quizIds in the leaderboard collection
 * to help identify which quizzes have data
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'quiz_trivia';
const collectionName = process.env.MONGODB_COLLECTION || 'leaderboard';

async function listAllQuizIds() {
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    console.log('✅ Connected to database:', dbName);
    console.log('');

    // Get all unique quizIds
    const quizIds = await collection.distinct('quizId', { 
      quizId: { $exists: true, $ne: null },
      mode: 'CLASSIC'
    });

    if (quizIds.length === 0) {
      console.log('⚠️  No quizIds found in the database');
      console.log('   This could mean:');
      console.log('   - No weekly quizzes have been completed yet');
      console.log('   - All entries are from TIME_MODE or CHALLENGE mode');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📅 ALL QUIZ IDs IN DATABASE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Sort quizIds chronologically
    const sortedQuizIds = quizIds.sort();

    for (const quizId of sortedQuizIds) {
      const count = await collection.countDocuments({ 
        quizId: quizId,
        mode: 'CLASSIC'
      });
      
      // Get date info
      let dateInfo = '';
      try {
        const date = new Date(quizId + 'T00:00:00Z');
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        dateInfo = ` (${dayOfWeek})`;
      } catch (e) {
        // Ignore date parsing errors
      }

      console.log(`   ${quizId}${dateInfo} - ${count} participant(s)`);
    }

    console.log('');
    console.log(`   Total unique quizzes: ${quizIds.length}`);
    console.log('');

    // Show entries around December 30th
    const dec30 = '2024-12-30';
    const nearbyQuizzes = sortedQuizIds.filter(id => {
      const idDate = new Date(id + 'T00:00:00Z');
      const targetDate = new Date(dec30 + 'T00:00:00Z');
      const diffDays = Math.abs((idDate - targetDate) / (1000 * 60 * 60 * 24));
      return diffDays <= 7; // Within 7 days
    });

    if (nearbyQuizzes.length > 0) {
      console.log('🔍 Quizzes near December 30th, 2024:');
      console.log('───────────────────────────────────────────────────────────');
      for (const quizId of nearbyQuizzes) {
        const count = await collection.countDocuments({ 
          quizId: quizId,
          mode: 'CLASSIC'
        });
        console.log(`   ${quizId} - ${count} participant(s)`);
      }
      console.log('───────────────────────────────────────────────────────────');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error querying database:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

listAllQuizIds().catch(console.error);

