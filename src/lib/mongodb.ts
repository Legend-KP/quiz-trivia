import { MongoClient, Db, Collection, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'quiz_trivia';
const collectionName = process.env.MONGODB_COLLECTION || 'leaderboard';

// Secure MongoDB connection options
const getMongoClientOptions = (): MongoClientOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    // Connection pool settings
    maxPoolSize: 10, // Maximum number of connections in the pool
    minPoolSize: 2, // Minimum number of connections in the pool
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    
    // Connection timeout settings
    connectTimeoutMS: 10000, // 10 seconds to establish connection
    socketTimeoutMS: 45000, // 45 seconds for socket operations
    
    // Security: Enforce SSL/TLS in production
    ...(isProduction && {
      tls: true,
      tlsAllowInvalidCertificates: false, // Reject invalid certificates
    }),
    
    // Retry settings
    retryWrites: true,
    retryReads: true,
    
    // Server selection timeout
    serverSelectionTimeoutMS: 10000, // 10 seconds to select a server
  };
};

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
let connectionPromise: Promise<MongoClient> | null = null;

/**
 * Get or create MongoDB client with secure connection options
 */
async function getClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // If client exists and is connected, return it
  if (client) {
    try {
      await client.db('admin').command({ ping: 1 });
      return client;
    } catch (error) {
      // Connection is dead, reset and reconnect
      client = null;
      db = null;
    }
  }

  // Create new connection
  connectionPromise = (async () => {
    try {
      const options = getMongoClientOptions();
      const newClient = new MongoClient(uri, options);
      await newClient.connect();
      
      // Verify connection
      await newClient.db('admin').command({ ping: 1 });
      
      client = newClient;
      db = client.db(dbName);
      connectionPromise = null;
      
      return client;
    } catch (error) {
      connectionPromise = null;
      client = null;
      db = null;
      throw error;
    }
  })();

  return connectionPromise;
}

export async function getLeaderboardCollection(): Promise<Collection<LeaderboardEntry>> {
  try {
    await getClient();

    if (!db) {
      throw new Error('Database connection failed - db is null');
    }

    const collection = db.collection<LeaderboardEntry>(collectionName);
    return collection;
  } catch (error) {
    // Reset the connection state so we can try again
    client = null;
    db = null;
    connectionPromise = null;
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
  walletAddress?: string; // User's wallet address (for event listener lookups)
  
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

export async function getDb(): Promise<Db> {
  await getClient();
  
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
    explanation?: string;
    userAnswer?: number;
    isCorrect?: boolean;
    answeredAt?: number;
  }>;
  startedAt: number;
  completedAt?: number;
  finalPayout?: number;
  lossDistribution?: {
    toBurn: number;
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

// ---------------- Master User Data for Airdrop ----------------

/**
 * Master User Data Collection
 * Purpose: Aggregate user information for token airdrop identification
 * This collection contains essential user data aggregated from multiple sources
 */
export interface MasterUserDataDocument {
  _id?: any;                      // MongoDB document ID
  fid: number;                    // Farcaster ID (primary key)
  username: string;               // Farcaster username
  displayName?: string;           // User's display name
  walletAddress?: string;         // User's wallet address (for airdrop)
  
  // Quiz Statistics
  totalQuizzesPlayed: number;     // Total quizzes completed (all modes)
  weeklyQuizzesPlayed: number;    // Weekly Quiz completions
  timeModeQuizzesPlayed: number;  // Time Mode completions
  challengeQuizzesPlayed: number; // Challenge Mode completions
  
  // Bet Mode Statistics
  totalQTWagered: number;         // Total QT tokens wagered in Bet Mode
  totalQTWon: number;             // Total QT tokens won in Bet Mode
  betModeGamesPlayed: number;     // Number of Bet Mode games played
  betModeGamesWon: number;        // Number of Bet Mode games won
  
  // Activity Statistics
  firstActivityAt: number;        // First activity timestamp
  lastActivityAt: number;         // Last activity timestamp
  daysActive: number;              // Number of unique days active
  
  // Airdrop Eligibility
  eligibleForAirdrop: boolean;    // Whether user is eligible for airdrop
  airdropTier?: number;           // Airdrop tier (1-5 based on activity)
  airdropAmount?: number;         // Calculated airdrop amount
  
  // Metadata
  createdAt?: number;             // Document creation timestamp (optional, set on insert)
  updatedAt: number;              // Last update timestamp
  lastSyncedAt?: number;          // Last time data was synced from source collections
}

export async function getMasterUserDataCollection(): Promise<Collection<MasterUserDataDocument>> {
  const database = await getDb();
  return database.collection<MasterUserDataDocument>('master_user_data');
}

// ---------------- Audit Logging ----------------

/**
 * Audit Log Collection
 * Purpose: Track all access and modifications to master user data for security
 */
export interface AuditLogDocument {
  _id?: any;                      // MongoDB document ID
  action: string;                 // Action performed (e.g., 'SYNC_COMPLETED', 'GET_USER_SUCCESS')
  ip: string;                     // Client IP address
  userAgent?: string;              // User agent string
  details: Record<string, any>;   // Action-specific details
  success: boolean;                // Whether action succeeded
  error?: string;                  // Error message if failed
  timestamp: number;              // Timestamp (ms epoch)
}

export async function getAuditLogsCollection(): Promise<Collection<AuditLogDocument>> {
  const database = await getDb();
  return database.collection<AuditLogDocument>('audit_logs');
}