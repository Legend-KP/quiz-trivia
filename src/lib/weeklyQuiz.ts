// Weekly Quiz Challenge Configuration and Utilities
// Schedule: Tuesday & Friday, 6 PM - 6 AM UTC (12-hour windows)

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  timeLimit: number;
  explanation: string;
}

export interface WeeklyQuizConfig {
  id: string; // Format: "2025-11-05" (YYYY-MM-DD)
  topic: string; // Week's topic theme
  startTime: string; // ISO string: "2025-11-05T18:00:00Z"
  endTime: string; // ISO string: "2025-11-06T06:00:00Z"
  questions: QuizQuestion[];
}

export type QuizState = 'upcoming' | 'live' | 'ended';

// Get current or next Tuesday/Friday at 6 PM UTC
// Returns the quiz that is currently live, or the next upcoming quiz
// Quiz windows: Tuesday 6PM-6AM (Wed), Friday 6PM-6AM (Sat)
function getCurrentOrNextQuizDate(): Date {
  const now = new Date();
  const currentDay = now.getUTCDay(); // 0 = Sunday, 2 = Tuesday, 3 = Wednesday, 5 = Friday, 6 = Saturday
  const currentHour = now.getUTCHours();
  
  // Check if we're in an active quiz window
  // Tuesday 6PM - Wednesday 6AM: Tuesday quiz is live
  // Friday 6PM - Saturday 6AM: Friday quiz is live
  
  if (currentDay === 2 && currentHour >= 18) {
    // Tuesday after 6 PM - quiz starts now
    const quizDate = new Date(now);
    quizDate.setUTCHours(18, 0, 0, 0);
    return quizDate;
  }
  
  if (currentDay === 3 && currentHour < 6) {
    // Wednesday before 6 AM - Tuesday quiz is still live
    const quizDate = new Date(now);
    quizDate.setUTCDate(now.getUTCDate() - 1); // Yesterday (Tuesday)
    quizDate.setUTCHours(18, 0, 0, 0);
    return quizDate;
  }
  
  if (currentDay === 5 && currentHour >= 18) {
    // Friday after 6 PM - quiz starts now
    const quizDate = new Date(now);
    quizDate.setUTCHours(18, 0, 0, 0);
    return quizDate;
  }
  
  if (currentDay === 6 && currentHour < 6) {
    // Saturday before 6 AM - Friday quiz is still live
    const quizDate = new Date(now);
    quizDate.setUTCDate(now.getUTCDate() - 1); // Yesterday (Friday)
    quizDate.setUTCHours(18, 0, 0, 0);
    return quizDate;
  }
  
  // Quiz is not live - find next quiz
  let daysToAdd = 0;
  
  if (currentDay === 2 && currentHour < 18) {
    // Tuesday before 6 PM - quiz is today
    daysToAdd = 0;
  } else if (currentDay === 5 && currentHour < 18) {
    // Friday before 6 PM - quiz is today
    daysToAdd = 0;
  } else if (currentDay === 0 || currentDay === 1) {
    // Sunday or Monday → next is Tuesday
    daysToAdd = (2 - currentDay + 7) % 7;
  } else if (currentDay === 3 || currentDay === 4) {
    // Wednesday or Thursday → next is Friday
    daysToAdd = (5 - currentDay + 7) % 7;
  } else if (currentDay === 6 && currentHour >= 6) {
    // Saturday after 6 AM → next is Tuesday (3 days)
    daysToAdd = 3;
  } else if (currentDay === 3 && currentHour >= 6) {
    // Wednesday after 6 AM → next is Friday (2 days)
    daysToAdd = 2;
  }
  
  const quizDate = new Date(now);
  quizDate.setUTCDate(now.getUTCDate() + daysToAdd);
  quizDate.setUTCHours(18, 0, 0, 0); // 6 PM UTC
  
  return quizDate;
}

// Current Weekly Quiz Configuration
// PRODUCTION MODE: Runs on Tuesday & Friday at 6 PM - 6 AM UTC (12-hour windows)
function getCurrentWeeklyQuiz(): WeeklyQuizConfig {
  const startDate = getCurrentOrNextQuizDate();
  const endDate = new Date(startDate);
  endDate.setUTCHours(6, 0, 0, 0); // 6 AM UTC (next day)
  endDate.setUTCDate(endDate.getUTCDate() + 1); // Next day
  
  return {
    id: getQuizIdFromDate(startDate),
    topic: "Zero-Knowledge Proofs", // Update this topic for each quiz
    startTime: startDate.toISOString(), // Tuesday or Friday 6 PM UTC
    endTime: endDate.toISOString(), // Next day 6 AM UTC (12-hour window)
    questions: [
    {
      id: 1,
      question: "Which component primarily ensures succinct verification in zk-SNARKs?",
      options: ["Trusted setup parameters", "Elliptic curve signatures", "Recursive hashing functions", "Polynomial commitment schemes"],
      correct: 3,
      timeLimit: 45,
      explanation: "Polynomial commitments allow large computations to be verified with very small proofs."
    },
    {
      id: 2,
      question: "What is the main reason zk-STARKs are considered quantum-resistant?",
      options: ["They rely on lattice-based cryptography", "They avoid elliptic curve assumptions", "They use hash-based cryptographic primitives", "They depend on symmetric encryption"],
      correct: 2,
      timeLimit: 45,
      explanation: "zk-STARKs rely mainly on hash functions, which are more resistant to quantum attacks."
    },
    {
      id: 3,
      question: "Which trade-off distinguishes zk-STARKs from zk-SNARKs most clearly?",
      options: ["Faster proof generation but slower verification", "Larger proof sizes but no trusted setup", "Higher gas fees but better composability", "Lower security assumptions but weaker privacy"],
      correct: 1,
      timeLimit: 45,
      explanation: "zk-STARKs avoid trusted setup but produce larger proofs than zk-SNARKs."
    },
    {
      id: 4,
      question: "Which Ethereum upgrade significantly improved ZK rollup scalability?",
      options: ["Byzantium hard fork", "EIP-1559 fee market change", "EIP-4844 proto-danksharding", "The Merge to Proof of Stake"],
      correct: 2,
      timeLimit: 45,
      explanation: "EIP-4844 introduced blobs, lowering data costs for rollups and improving scalability."
    },
    {
      id: 5,
      question: "In ZK rollups, what is posted to Layer 1 for verification?",
      options: ["Encrypted user balances", "Compressed execution traces", "Full transaction calldata", "Validity proofs and state roots"],
      correct: 3,
      timeLimit: 45,
      explanation: "ZK rollups submit proofs and state roots to L1 to verify correctness without re-execution."
    },
    {
      id: 6,
      question: "Why are ZK proofs important for private DeFi applications?",
      options: ["They eliminate the need for liquidity", "They hide transaction logic and balances", "They remove gas costs entirely", "They replace smart contracts"],
      correct: 1,
      timeLimit: 45,
      explanation: "ZK proofs enable privacy while still allowing on-chain verification."
    },
    {
      id: 7,
      question: "What is the biggest scalability challenge for ZK rollups today?",
      options: ["High Layer 1 gas costs for proofs", "Slow block finality times", "Limited smart contract expressiveness", "Validator hardware requirements"],
      correct: 0,
      timeLimit: 45,
      explanation: "Posting proofs and data to L1 is still costly, limiting scalability."
    },
    {
      id: 8,
      question: "What is the main purpose of a Zero-Knowledge Proof?",
      options: ["To encrypt transaction data on-chain", "To prove a statement without revealing data", "To speed up block confirmation times", "To replace consensus mechanisms"],
      correct: 1,
      timeLimit: 45,
      explanation: "ZK proofs allow verification of truth without revealing the underlying secret."
    },
    {
      id: 9,
      question: "Why are Zero-Knowledge Proofs useful for privacy-focused applications?",
      options: ["They hide sensitive data while proving correctness", "They reduce transaction execution time", "They eliminate the need for validators", "They prevent smart contract execution"],
      correct: 0,
      timeLimit: 45,
      explanation: "ZK proofs protect user privacy while still allowing public verification."
    },
    {
      id: 10,
      question: "What is the \"witness\" in a Zero-Knowledge Proof system?",
      options: ["The private data proving the statement", "The public input for verification", "The final proof submitted on-chain", "The cryptographic verification key"],
      correct: 0,
      timeLimit: 45,
      explanation: "The witness is the private input that satisfies the proof's condition."
    }
  ]
  };
}

// Export current quiz (recalculated on each access for production schedule)
export const currentWeeklyQuiz: WeeklyQuizConfig = getCurrentWeeklyQuiz();

// Calculate quiz state based on current time
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

// Get next quiz start time
// Returns next Tuesday or Friday at 6 PM UTC
export function getNextQuizStartTime(): Date {
  const now = new Date();
  const currentDay = now.getUTCDay(); // 0 = Sunday, 2 = Tuesday, 5 = Friday
  const currentHour = now.getUTCHours();
  
  let daysToAdd = 0;
  
  if (currentDay === 2) {
    // Today is Tuesday
    if (currentHour >= 18) {
      // After 6 PM UTC, next quiz is Friday
      daysToAdd = 3;
    } else {
      // Before 6 PM UTC, quiz is today (already started or starting soon)
      // Next quiz is Friday
      daysToAdd = 3;
    }
  } else if (currentDay === 5) {
    // Today is Friday
    if (currentHour >= 18) {
      // After 6 PM UTC, next quiz is Tuesday (4 days)
      daysToAdd = 4;
    } else {
      // Before 6 PM UTC, quiz is today (already started or starting soon)
      // Next quiz is Tuesday
      daysToAdd = 4;
    }
  } else if (currentDay === 0 || currentDay === 1) {
    // Sunday (0) or Monday (1) → next is Tuesday
    daysToAdd = (2 - currentDay + 7) % 7;
  } else if (currentDay === 3 || currentDay === 4) {
    // Wednesday (3) or Thursday (4) → next is Friday
    daysToAdd = (5 - currentDay + 7) % 7;
  } else if (currentDay === 6) {
    // Saturday (6) → next is Tuesday (3 days)
    daysToAdd = 3;
  }
  
  const nextQuizDate = new Date(now);
  nextQuizDate.setUTCDate(now.getUTCDate() + daysToAdd);
  nextQuizDate.setUTCHours(18, 0, 0, 0); // 6 PM UTC
  
  return nextQuizDate;
}

// Format countdown timer
export function formatCountdown(targetTime: Date): string {
  const now = Date.now();
  const target = targetTime.getTime();
  const diff = target - now;
  
  if (diff <= 0) return 'Starting...';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
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

// Get quiz ID from date
export function getQuizIdFromDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Check if quiz is currently active
export function isQuizActive(startTime: string, endTime: string): boolean {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return now >= start && now < end;
}

// Token reward distribution for top 10
export function getTokenReward(rank: number): number {
  const rewards: Record<number, number> = {
    1: 4000000,  // 4M QT
    2: 2500000,  // 2.5M QT
    3: 1500000,  // 1.5M QT
    4: 1000000,  // 1M QT
    5: 1000000,  // 1M QT
    6: 1000000,  // 1M QT
    7: 1000000,  // 1M QT
    8: 1000000,  // 1M QT
    9: 1000000,  // 1M QT
    10: 1000000, // 1M QT
  };
  
  return rewards[rank] || 0;
}

// Format token amounts for display
export function formatTokens(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  } else {
    return amount.toString();
  }
}