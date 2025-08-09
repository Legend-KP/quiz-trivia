import { MongoClient, Db, Collection } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'quiz_trivia';
const collectionName = process.env.MONGODB_COLLECTION || 'leaderboard';

export interface LeaderboardEntry {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  score: number;
  time: string;
  completedAt: number;
  rank?: number;
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getLeaderboardCollection(): Promise<Collection<LeaderboardEntry>> {
  try {
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
      db = client.db(dbName);
    }

    if (!db) {
      throw new Error('Database connection failed - db is null');
    }

    const collection = db.collection<LeaderboardEntry>(collectionName);
    return collection;
  } catch (error) {
    // Reset the connection state so we can try again
    client = null;
    db = null;
    throw error;
  }
}