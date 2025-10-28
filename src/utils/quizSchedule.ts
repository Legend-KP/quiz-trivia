// Quiz Schedule Utility Functions
// Handles weekly quiz timing, state calculation, and countdown formatting

export interface WeeklyQuizConfig {
  id: string;                    // Quiz identifier (e.g., "2025-11-05")
  topic: string;                 // Week's topic (e.g., "DeFi Protocols")
  startTime: string;             // ISO string (e.g., "2025-11-05T18:00:00Z")
  endTime: string;               // ISO string (e.g., "2025-11-06T06:00:00Z")
  questions: QuizQuestion[];     // 10 questions for this quiz
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  timeLimit: number;             // 45 seconds
  explanation: string;
}

export type QuizState = 'upcoming' | 'live' | 'ended';

/**
 * Calculate the current state of a quiz based on current time
 */
export function calculateQuizState(config: WeeklyQuizConfig): QuizState {
  const now = Date.now();
  const start = new Date(config.startTime).getTime();
  const end = new Date(config.endTime).getTime();
  
  if (now < start) {
    return 'upcoming';
  } else if (now >= start && now < end) {
    return 'live';
  } else {
    return 'ended';
  }
}

/**
 * Get the next quiz start time (Tuesday or Sunday at 6 PM UTC)
 */
export function getNextQuizStartTime(): Date {
  const now = new Date();
  const today = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days until next Tuesday (2) or Sunday (0)
  let daysUntilNext;
  if (today === 0) { // Sunday
    daysUntilNext = 2; // Next Tuesday
  } else if (today === 2) { // Tuesday
    daysUntilNext = 5; // Next Sunday
  } else if (today < 2) { // Monday
    daysUntilNext = 2 - today; // Days until Tuesday
  } else { // Wednesday-Saturday
    daysUntilNext = 7 - today; // Days until Sunday
  }
  
  const nextQuizDate = new Date(now);
  nextQuizDate.setUTCDate(now.getUTCDate() + daysUntilNext);
  nextQuizDate.setUTCHours(18, 0, 0, 0); // 6 PM UTC
  
  return nextQuizDate;
}

/**
 * Get the quiz end time (12 hours after start)
 */
export function getQuizEndTime(startTime: Date): Date {
  const endTime = new Date(startTime);
  endTime.setUTCHours(endTime.getUTCHours() + 12);
  return endTime;
}

/**
 * Generate quiz ID from date (YYYY-MM-DD format)
 */
export function getQuizIdFromDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format countdown timer with proper units
 */
export function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) return 'Starting...';
  
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Check if quiz is currently active
 */
export function isQuizActive(startTime: string, endTime: string): boolean {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return now >= start && now < end;
}

/**
 * Get token reward amount for a given rank
 */
export function getTokenReward(rank: number): number {
  const rewards = {
    1: 4000000,   // 4M QT
    2: 2500000,   // 2.5M QT
    3: 1500000,   // 1.5M QT
    4: 1000000,   // 1M QT
    5: 1000000,   // 1M QT
    6: 1000000,   // 1M QT
    7: 1000000,   // 1M QT
    8: 1000000,   // 1M QT
    9: 1000000,   // 1M QT
    10: 1000000,  // 1M QT
  };
  
  return rewards[rank as keyof typeof rewards] || 0;
}

/**
 * Format token amount for display
 */
export function formatTokens(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  } else {
    return amount.toString();
  }
}

/**
 * Validate quiz configuration
 */
export function validateQuizConfig(config: WeeklyQuizConfig): boolean {
  const now = Date.now();
  const quizDate = new Date(config.id).getTime();
  const daysDifference = (now - quizDate) / (1000 * 60 * 60 * 24);
  
  if (daysDifference > 7) {
    console.error('⚠️ Quiz config is more than 7 days old!');
    console.error('⚠️ Please update questions in HomeTab.tsx');
    return false;
  }
  
  if (config.questions.length !== 10) {
    console.error('⚠️ Quiz must have exactly 10 questions!');
    return false;
  }
  
  if (config.questions.some(q => q.timeLimit !== 45)) {
    console.error('⚠️ All questions must have 45 second time limit!');
    return false;
  }
  
  return true;
}
