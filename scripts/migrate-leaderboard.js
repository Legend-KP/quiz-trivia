// Migration script to add timeInSeconds field to existing leaderboard entries
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'quiz_trivia';
const collectionName = process.env.MONGODB_COLLECTION || 'leaderboard';

// Helper function to convert time string (MM:SS) to seconds
function timeStringToSeconds(timeString) {
  if (!timeString) return 0;
  const parts = timeString.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return minutes * 60 + seconds;
  }
  return 0;
}

async function migrateLeaderboard() {
  if (!uri) {
    console.error('MONGODB_URI environment variable is not set');
    return;
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Find all entries that don't have timeInSeconds field
    const entriesToUpdate = await collection.find({ 
      $or: [
        { timeInSeconds: { $exists: false } },
        { timeInSeconds: null }
      ]
    }).toArray();
    
    console.log(`Found ${entriesToUpdate.length} entries to update`);
    
    if (entriesToUpdate.length === 0) {
      console.log('No entries need migration');
      return;
    }
    
    // Update each entry
    for (const entry of entriesToUpdate) {
      const timeInSeconds = timeStringToSeconds(entry.time);
      
      await collection.updateOne(
        { _id: entry._id },
        { $set: { timeInSeconds } }
      );
      
      console.log(`Updated entry ${entry.fid}: ${entry.time} -> ${timeInSeconds} seconds`);
    }
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateLeaderboard();
}

module.exports = { migrateLeaderboard };
