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
  timeInSeconds: number;
  completedAt: number;
  rank?: number;
  mode: 'CLASSIC' | 'TIME_MODE' | 'CHALLENGE';
  quizId?: string; // NEW: Weekly quiz identifier (e.g., "2025-11-05")
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

// ---------------- New Schemas & Collections for new modes ----------------

export type QuestionType = 'mcq' | 'text' | 'media';

export interface QuestionDocument {
  _id?: any;
  id?: string; // optional external id
  topicKey: string;
  type: QuestionType;
  text: string;
  options?: string[]; // for mcq
  correctIndex?: number; // for mcq
  mediaUrl?: string; // for media/image/audio if any
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isActive: boolean;
  createdAt: number;
}

export interface TimeAttemptDocument {
  _id?: any;
  fid: number;
  correctCount: number;
  totalAnswered: number;
  accuracy: number; // 0..1
  durationSec: number; // should be 45 typically
  avgAnswerTimeSec: number; // tiebreaker
  createdAt: number;
}

export interface CurrencyAccountDocument {
  _id?: any;
  fid: number;
  balance: number;
  dailyStreakDay: number; // 0..7, resets after claim beyond 7
  lastClaimAt?: number; // ms epoch
  lastDailyBaseAt?: number; // ms epoch, last time the daily base grant was applied
  lastSpinAt?: number; // ms epoch, last time the user spun the wheel
  createdAt: number;
  updatedAt: number;
}

export interface CurrencyTxnDocument {
  _id?: any;
  fid: number;
  amount: number; // positive or negative
  reason: 'time_entry' | 'challenge_entry' | 'win_reward' | 'daily_claim' | 'spin_wheel' | 'admin_adjust' | 'other';
  refId?: string; // relates to attempt/challenge id
  createdAt: number;
}

export type ChallengeStatus = 'pending' | 'accepted' | 'expired' | 'completed' | 'tied';

export interface ChallengeDocument {
  _id?: any;
  id: string; // public id
  challengerFid: number;
  opponentFid?: number;
  status: ChallengeStatus;
  topicKey?: string; // currently random
  createdAt: number;
  expiresAt: number;
  durationSec: number; // 120
  questions: QuestionDocument[]; // fixed at create
  // results
  challenger?: { correct: number; total: number; durationSec: number; accuracy: number };
  opponent?: { correct: number; total: number; durationSec: number; accuracy: number };
}

async function getDb(): Promise<Db> {
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
  return db;
}

export async function getQuestionsCollection(): Promise<Collection<QuestionDocument>> {
  const database = await getDb();
  return database.collection<QuestionDocument>('questions');
}

export async function getTimeAttemptsCollection(): Promise<Collection<TimeAttemptDocument>> {
  const database = await getDb();
  return database.collection<TimeAttemptDocument>('time_attempts');
}

export async function getCurrencyAccountsCollection(): Promise<Collection<CurrencyAccountDocument>> {
  const database = await getDb();
  return database.collection<CurrencyAccountDocument>('currency_accounts');
}

export async function getCurrencyTxnsCollection(): Promise<Collection<CurrencyTxnDocument>> {
  const database = await getDb();
  return database.collection<CurrencyTxnDocument>('currency_txns');
}

export async function getChallengesCollection(): Promise<Collection<ChallengeDocument>> {
  const database = await getDb();
  return database.collection<ChallengeDocument>('challenges');
}