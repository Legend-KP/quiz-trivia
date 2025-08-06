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
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
  }
  return db!.collection<LeaderboardEntry>(collectionName);
}