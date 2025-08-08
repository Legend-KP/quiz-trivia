import { MongoClient, Db, Collection } from 'mongodb';

const uri = 'mongodb+srv://kushal5paliwal:YctdHl3XZoCEMLwg@cluster0.alffzye.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = 'quiz_trivia';
const collectionName = 'leaderboard';

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
    console.log('🔌 Attempting MongoDB connection...');
    
    if (!client) {
      console.log('📡 Creating new MongoDB client...');
      client = new MongoClient(uri);
      await client.connect();
      console.log('✅ MongoDB client connected successfully');
      db = client.db(dbName);
      console.log(`📊 Connected to database: ${dbName}`);
    } else {
      console.log('♻️ Reusing existing MongoDB client');
    }
    
    if (!db) {
      throw new Error('Database connection failed - db is null');
    }
    
    const collection = db.collection<LeaderboardEntry>(collectionName);
    console.log(`📋 Using collection: ${collectionName}`);
    
    // Test the connection by counting documents
    const count = await collection.countDocuments();
    console.log(`📊 Collection has ${count} documents`);
    
    return collection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    // Reset the connection state so we can try again
    client = null;
    db = null;
    throw error;
  }
}