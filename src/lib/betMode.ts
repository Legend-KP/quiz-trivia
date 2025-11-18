/**
 * Bet Mode Utilities
 * Core functions for Bet Mode game logic, lottery, and window management
 */

// Multipliers for each question (Q1-Q10)
export const BET_MODE_MULTIPLIERS = [
  0,      // Q0 (not used)
  1.1,    // Q1
  1.3,    // Q2
  1.6,    // Q3
  2.2,    // Q4
  3.0,    // Q5
  4.2,    // Q6
  6.5,    // Q7
  7.2,    // Q8
  8.5,    // Q9
  10.0,   // Q10 (auto cash out)
] as const;

// Bet limits
export const MIN_BET = 10000; // 10K QT
export const MIN_BALANCE_MULTIPLIER = 2; // Must have 2x bet amount
export const MAX_BET = 500000; // 500K QT

// Time limits
export const QUESTION_TIME_LIMIT = 30; // 30 seconds per question

// Loss distribution percentages
export const LOSS_BURN_PERCENT = 0.60; // 60%
export const LOSS_LOTTERY_PERCENT = 0.35; // 35%
export const LOSS_PLATFORM_PERCENT = 0.05; // 5%

// Lottery ticket calculation
export const TICKETS_PER_10K_WAGERED = 1; // 1 ticket per 10K wagered
export const TICKETS_PER_GAME = 0.5; // 0.5 tickets per game played

// Streak bonuses
export const STREAK_3_DAY_MULTIPLIER = 1.1; // +10%
export const STREAK_7_DAY_MULTIPLIER = 1.5; // +50%

// Weekly window schedule
export const WINDOW_START_DAY = 3; // Wednesday (0 = Sunday, 3 = Wednesday)
export const WINDOW_START_HOUR = 11; // 11 AM UTC
export const WINDOW_DURATION_HOURS = 48; // 48 hours
export const SNAPSHOT_DELAY_HOURS = 3; // 3 hours after window closes
export const DRAW_DELAY_MINUTES = 30; // 30 minutes after snapshot

/**
 * Get current week ID (e.g., "2025-W47")
 */
export function getCurrentWeekId(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  
  // Get week number (ISO week)
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getUTCDay() + 1) / 7);
  
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Get the current Bet Mode window state
 */
export function getBetModeWindowState(): {
  isOpen: boolean;
  windowStart: Date;
  windowEnd: Date;
  snapshotTime: Date;
  drawTime: Date;
  timeUntilOpen?: number;
  timeUntilClose?: number;
  timeUntilSnapshot?: number;
  timeUntilDraw?: number;
} {
  const now = new Date();
  const nowUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  ));

  // Find next Wednesday 11 AM UTC
  const windowStart = new Date(nowUTC);
  windowStart.setUTCDate(windowStart.getUTCDate() + ((WINDOW_START_DAY + 7 - windowStart.getUTCDay()) % 7));
  windowStart.setUTCHours(WINDOW_START_HOUR, 0, 0, 0);

  // If we're past Wednesday 11 AM this week, move to next week
  if (nowUTC >= windowStart) {
    windowStart.setUTCDate(windowStart.getUTCDate() + 7);
  }

  // Window ends 48 hours later (Friday 11 AM UTC)
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCHours(windowEnd.getUTCHours() + WINDOW_DURATION_HOURS);

  // Snapshot is at window end (Friday 11 AM UTC)
  const snapshotTime = new Date(windowEnd);

  // Draw is 3 hours after snapshot (Friday 2 PM UTC)
  const drawTime = new Date(snapshotTime);
  drawTime.setUTCHours(drawTime.getUTCHours() + SNAPSHOT_DELAY_HOURS);

  const isOpen = nowUTC >= windowStart && nowUTC < windowEnd;

  return {
    isOpen,
    windowStart,
    windowEnd,
    snapshotTime,
    drawTime,
    timeUntilOpen: isOpen ? undefined : Math.max(0, windowStart.getTime() - nowUTC.getTime()),
    timeUntilClose: isOpen ? Math.max(0, windowEnd.getTime() - nowUTC.getTime()) : undefined,
    timeUntilSnapshot: nowUTC < snapshotTime ? Math.max(0, snapshotTime.getTime() - nowUTC.getTime()) : undefined,
    timeUntilDraw: nowUTC < drawTime ? Math.max(0, drawTime.getTime() - nowUTC.getTime()) : undefined,
  };
}

/**
 * Calculate payout for a given question number
 */
export function calculatePayout(betAmount: number, questionNumber: number): number {
  if (questionNumber < 1 || questionNumber > 10) {
    throw new Error('Question number must be between 1 and 10');
  }
  return Math.floor(betAmount * BET_MODE_MULTIPLIERS[questionNumber]);
}

/**
 * Calculate loss distribution
 */
export function calculateLossDistribution(lossAmount: number): {
  toBurn: number;
  toLottery: number;
  toPlatform: number;
} {
  return {
    toBurn: Math.floor(lossAmount * LOSS_BURN_PERCENT),
    toLottery: Math.floor(lossAmount * LOSS_LOTTERY_PERCENT),
    toPlatform: Math.floor(lossAmount * LOSS_PLATFORM_PERCENT),
  };
}

/**
 * Calculate lottery tickets from wagered amount and games played
 */
export function calculateBaseTickets(totalWagered: number, gamesPlayed: number): {
  betBasedTickets: number;
  gameBasedTickets: number;
  totalTickets: number;
} {
  const betBasedTickets = Math.floor(totalWagered / 10000);
  const gameBasedTickets = gamesPlayed * TICKETS_PER_GAME;
  const totalTickets = betBasedTickets + gameBasedTickets;

  return {
    betBasedTickets,
    gameBasedTickets,
    totalTickets,
  };
}

/**
 * Calculate streak multiplier based on consecutive days
 */
export function getStreakMultiplier(consecutiveDays: number): number {
  if (consecutiveDays >= 7) {
    return STREAK_7_DAY_MULTIPLIER;
  }
  if (consecutiveDays >= 3) {
    return STREAK_3_DAY_MULTIPLIER;
  }
  return 1.0;
}

/**
 * Calculate consecutive days from array of date strings
 */
export function calculateConsecutiveDays(daysPlayed: string[]): number {
  if (daysPlayed.length === 0) return 0;

  // Sort dates
  const sorted = [...daysPlayed].sort();
  
  let consecutive = 1;
  let maxConsecutive = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 1;
    }
  }

  return maxConsecutive;
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Format time remaining (milliseconds) to human-readable string
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format QT amount for display
 */
export function formatQT(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M QT`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(2)}K QT`;
  }
  return `${amount.toLocaleString()} QT`;
}

/**
 * Validate bet amount
 */
export function validateBetAmount(betAmount: number, userBalance: number): {
  valid: boolean;
  error?: string;
} {
  if (betAmount < MIN_BET) {
    return { valid: false, error: `Minimum bet is ${formatQT(MIN_BET)}` };
  }
  if (betAmount > MAX_BET) {
    return { valid: false, error: `Maximum bet is ${formatQT(MAX_BET)}` };
  }
  if (userBalance < betAmount * MIN_BALANCE_MULTIPLIER) {
    return {
      valid: false,
      error: `You need at least ${formatQT(betAmount * MIN_BALANCE_MULTIPLIER)} to bet ${formatQT(betAmount)}`,
    };
  }
  return { valid: true };
}

