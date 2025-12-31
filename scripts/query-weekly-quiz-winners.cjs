/**
 * Query Weekly Quiz Winners
 * 
 * This script queries the database to show:
 * - Winners from a specific weekly quiz (by quizId/date)
 * - Top 10 winners with their scores and times
 * - All participants for the quiz
 * 
 * Usage:
 *   node scripts/query-weekly-quiz-winners.cjs [quizId]
 * 
 * Example:
 *   node scripts/query-weekly-quiz-winners.cjs 2024-12-30
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'quiz_trivia';
const collectionName = process.env.MONGODB_COLLECTION || 'leaderboard';

async function queryWeeklyQuizWinners(quizId) {
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  if (!quizId) {
    console.error('❌ Please provide a quizId (date in YYYY-MM-DD format)');
    console.error('   Example: node scripts/query-weekly-quiz-winners.cjs 2024-12-30');
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

    // Query for the specific quiz
    const query = {
      quizId: quizId,
      mode: 'CLASSIC'
    };

    console.log('🔍 Querying for quiz:', quizId);
    console.log('');

    const entries = await collection.find(query).toArray();

    if (entries.length === 0) {
      console.log('⚠️  No entries found for quiz:', quizId);
      console.log('   This could mean:');
      console.log('   - The quiz hasn\'t happened yet');
      console.log('   - No participants completed the quiz');
      console.log('   - The quizId format is incorrect (should be YYYY-MM-DD)');
      return;
    }

    // Filter out invalid entries
    const validEntries = entries.filter(entry => {
      // Remove entries with invalid scores (>10 or <-10)
      if (entry.score > 10 || entry.score < -10) return false;
      // Remove entries with invalid time (0:00 or missing)
      if (!entry.time || entry.time === '0:00' || (entry.timeInSeconds || 0) === 0) return false;
      // Ensure quizId exists
      if (!entry.quizId) return false;
      // Ensure mode is CLASSIC
      if (entry.mode !== 'CLASSIC') return false;
      return true;
    });

    // Sort by score (descending), then by time (ascending)
    const sortedEntries = validEntries.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return (a.timeInSeconds || 0) - (b.timeInSeconds || 0);
    });

    // Add ranks
    const rankedEntries = sortedEntries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🏆 WEEKLY QUIZ WINNERS - ${quizId}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total Participants: ${rankedEntries.length}`);
    console.log('');

    // Show top 10 winners
    const top10 = rankedEntries.slice(0, 10);
    console.log('🥇 TOP 10 WINNERS:');
    console.log('───────────────────────────────────────────────────────────');
    console.log('Rank | FID      | Username          | Score | Time  | Completed At');
    console.log('───────────────────────────────────────────────────────────');
    
    top10.forEach(entry => {
      const rank = String(entry.rank).padStart(4);
      const fid = String(entry.fid).padStart(9);
      const username = (entry.username || 'N/A').padEnd(17).substring(0, 17);
      const score = String(entry.score).padStart(5);
      const time = (entry.time || 'N/A').padEnd(5);
      const completedAt = entry.completedAt 
        ? new Date(entry.completedAt).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
        : 'N/A';
      
      console.log(`${rank} | ${fid} | ${username} | ${score} | ${time} | ${completedAt}`);
    });

    console.log('───────────────────────────────────────────────────────────');
    console.log('');

    // Show all participants if more than 10
    if (rankedEntries.length > 10) {
      console.log(`📊 ALL PARTICIPANTS (${rankedEntries.length} total):`);
      console.log('───────────────────────────────────────────────────────────');
      console.log('Rank | FID      | Username          | Score | Time  | Completed At');
      console.log('───────────────────────────────────────────────────────────');
      
      rankedEntries.forEach(entry => {
        const rank = String(entry.rank).padStart(4);
        const fid = String(entry.fid).padStart(9);
        const username = (entry.username || 'N/A').padEnd(17).substring(0, 17);
        const score = String(entry.score).padStart(5);
        const time = (entry.time || 'N/A').padEnd(5);
        const completedAt = entry.completedAt 
          ? new Date(entry.completedAt).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
          : 'N/A';
        
        console.log(`${rank} | ${fid} | ${username} | ${score} | ${time} | ${completedAt}`);
      });

      console.log('───────────────────────────────────────────────────────────');
      console.log('');
    }

    // Summary statistics
    const avgScore = rankedEntries.reduce((sum, e) => sum + e.score, 0) / rankedEntries.length;
    const avgTime = rankedEntries.reduce((sum, e) => sum + (e.timeInSeconds || 0), 0) / rankedEntries.length;
    const avgMinutes = Math.floor(avgTime / 60);
    const avgSeconds = Math.floor(avgTime % 60);

    console.log('📈 STATISTICS:');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`   Average Score:     ${avgScore.toFixed(2)}`);
    console.log(`   Average Time:     ${avgMinutes}:${String(avgSeconds).padStart(2, '0')}`);
    console.log(`   Highest Score:    ${rankedEntries[0]?.score || 'N/A'}`);
    console.log(`   Lowest Score:     ${rankedEntries[rankedEntries.length - 1]?.score || 'N/A'}`);
    console.log('───────────────────────────────────────────────────────────');
    console.log('');

    // Export to JSON file
    const fs = require('fs');
    const path = require('path');
    const outputFile = path.join(__dirname, `weekly-quiz-${quizId}-winners.json`);
    
    const exportData = {
      quizId: quizId,
      queryDate: new Date().toISOString(),
      totalParticipants: rankedEntries.length,
      top10: top10.map(e => ({
        rank: e.rank,
        fid: e.fid,
        username: e.username,
        displayName: e.displayName,
        score: e.score,
        time: e.time,
        timeInSeconds: e.timeInSeconds,
        completedAt: e.completedAt,
        pfpUrl: e.pfpUrl
      })),
      allParticipants: rankedEntries.map(e => ({
        rank: e.rank,
        fid: e.fid,
        username: e.username,
        displayName: e.displayName,
        score: e.score,
        time: e.time,
        timeInSeconds: e.timeInSeconds,
        completedAt: e.completedAt,
        pfpUrl: e.pfpUrl
      })),
      statistics: {
        averageScore: avgScore,
        averageTime: avgTime,
        averageTimeFormatted: `${avgMinutes}:${String(avgSeconds).padStart(2, '0')}`,
        highestScore: rankedEntries[0]?.score || null,
        lowestScore: rankedEntries[rankedEntries.length - 1]?.score || null
      }
    };

    fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
    console.log(`💾 Results exported to: ${outputFile}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error querying database:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Get quizId from command line arguments
const quizId = process.argv[2];

// If no quizId provided, default to December 30th, 2024
const defaultQuizId = '2024-12-30';

queryWeeklyQuizWinners(quizId || defaultQuizId).catch(console.error);

