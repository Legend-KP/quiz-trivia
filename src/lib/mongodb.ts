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
  
  // NEW: Bet Mode QT Token fields
  qtBalance?: number; // Internal QT balance (defaults to 0)
  qtLockedBalance?: number; // QT locked in active games (defaults to 0)
  qtTotalDeposited?: number; // Real QT deposited from blockchain (defaults to 0)
  qtTotalWithdrawn?: number; // Real QT withdrawn to blockchain (defaults to 0)
  qtTotalWagered?: number; // Total bet in Bet Mode (defaults to 0)
  qtTotalWon?: number; // Total won in Bet Mode (defaults to 0)
  
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

// ---------------- Bet Mode Schemas & Collections ----------------

export interface BetModeQuestionDocument {
  _id?: any;
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  explanation?: string;
  isActive: boolean;
  createdAt: number;
}

export type BetModeGameStatus = 'active' | 'won' | 'lost' | 'cashed_out';

export interface BetModeGameDocument {
  _id?: any;
  gameId: string;
  fid: number;
  betAmount: number;
  status: BetModeGameStatus;
  currentQuestion: number; // 1-10
  questions: Array<{
    questionId: string;
    questionText: string;
    options: string[];
    correctIndex: number;
    userAnswer?: number;
    isCorrect?: boolean;
    answeredAt?: number;
  }>;
  startedAt: number;
  completedAt?: number;
  finalPayout?: number;
  lossDistribution?: {
    toBurn: number;
    toLottery: number;
    toPlatform: number;
  };
  weekId: string; // e.g., "2025-W47"
}

export interface LotteryTicketDocument {
  _id?: any;
  weekId: string;
  fid: number;
  betBasedTickets: number;
  gameBasedTickets: number;
  bonusTickets: number;
  totalTickets: number;
  gamesPlayed: number;
  totalWagered: number;
  consecutiveDays: number;
  daysPlayed: string[]; // Array of date strings "YYYY-MM-DD"
  streakMultiplier: number;
  ticketRangeStart?: number; // Set during snapshot
  ticketRangeEnd?: number; // Set during snapshot
  snapshotAt?: number;
  won?: boolean;
  tier?: number;
  prizeAmount?: number;
  consolationAmount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface WeeklyPoolDocument {
  _id?: any;
  weekId: string; // e.g., "2025-W47"
  startDate: number; // ms epoch
  endDate: number; // ms epoch
  totalLosses: number;
  toBurnAccumulated: number;
  lotteryPool: number;
  platformRevenue: number;
  snapshotTaken: boolean;
  snapshotAt?: number;
  finalPool?: number;
  totalTickets?: number;
  totalParticipants?: number;
  drawCompleted: boolean;
  drawAt?: number;
  drawSeed?: string;
  drawBlockHash?: string;
  drawBlockNumber?: number;
  winners?: Array<{
    tier: number;
    fid: number;
    ticketNumber: number;
    prize: number;
  }>;
  consolationAmount?: number;
  totalDistributed?: number;
  burnCompleted: boolean;
  burnTxHash?: string;
  burnAt?: number;
  status: 'active' | 'snapshot_complete' | 'completed';
  createdAt: number;
  updatedAt: number;
}

export interface QTTransactionDocument {
  _id?: any;
  fid: number;
  type: 'deposit' | 'withdrawal' | 'game_win' | 'game_loss' | 'lottery_win' | 'burn';
  amount: number; // Positive for deposits/wins, negative for withdrawals/losses
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  blockNumber?: number;
  gameId?: string;
  weekId?: string;
  tier?: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: number;
}

export interface BurnRecordDocument {
  _id?: any;
  weekId: string;
  amount: number;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export async function getBetModeQuestionsCollection(): Promise<Collection<BetModeQuestionDocument>> {
  const database = await getDb();
  return database.collection<BetModeQuestionDocument>('bet_mode_questions');
}

export async function getBetModeGamesCollection(): Promise<Collection<BetModeGameDocument>> {
  const database = await getDb();
  return database.collection<BetModeGameDocument>('bet_mode_games');
}

export async function getLotteryTicketsCollection(): Promise<Collection<LotteryTicketDocument>> {
  const database = await getDb();
  return database.collection<LotteryTicketDocument>('lottery_tickets');
}

export async function getWeeklyPoolsCollection(): Promise<Collection<WeeklyPoolDocument>> {
  const database = await getDb();
  return database.collection<WeeklyPoolDocument>('weekly_pools');
}

export async function getQTTransactionsCollection(): Promise<Collection<QTTransactionDocument>> {
  const database = await getDb();
  return database.collection<QTTransactionDocument>('qt_transactions');
}

export async function getBurnRecordsCollection(): Promise<Collection<BurnRecordDocument>> {
  const database = await getDb();
  return database.collection<BurnRecordDocument>('burn_records');
}