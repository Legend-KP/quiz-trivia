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
    topic: "Zero Knowledge Proof", // Update this topic for each quiz
    startTime: startDate.toISOString(), // Tuesday or Friday 6 PM UTC
    endTime: endDate.toISOString(), // Next day 6 AM UTC (12-hour window)
    questions: [
    {
      id: 1,
      question: "What does a Zero-Knowledge Proof allow a prover to demonstrate?",
      options: ["Knowledge of a value without revealing the value itself", "The speed of blockchain consensus", "The ownership of all private keys", "That the transaction fee is zero"],
      correct: 0,
      timeLimit: 45,
      explanation: "ZKPs let one party prove knowledge of a fact or value without revealing the underlying information."
    },
    {
      id: 2,
      question: "Which of the following is a key property of Zero-Knowledge Proofs?",
      options: ["Integrity, Decentralization, and Transparency", "Privacy, Speed, and Scalability", "Confidentiality, Accuracy, and Cost-efficiency", "Completeness, Soundness, and Zero-Knowledge"],
      correct: 3,
      timeLimit: 45,
      explanation: "ZKPs are defined by three core properties: completeness, soundness, and zero-knowledge."
    },
    {
      id: 3,
      question: "Which blockchain uses zk-SNARKs to provide private transactions?",
      options: ["Zcash", "Bitcoin", "Ethereum", "Polygon PoS"],
      correct: 0,
      timeLimit: 45,
      explanation: "Zcash pioneered zk-SNARKs to enable shielded transactions that hide sender, receiver, and amount."
    },
    {
      id: 4,
      question: "What does the term \"zero-knowledge\" specifically refer to in ZKPs?",
      options: ["That the prover has no private data", "That no computation occurs during verification", "That the verifier learns nothing beyond the validity of the claim", "That the proof is always probabilistic"],
      correct: 2,
      timeLimit: 45,
      explanation: "The \"zero-knowledge\" aspect ensures no information is leaked other than the fact that the statement is true."
    },
    {
      id: 5,
      question: "In zk-SNARK, what does the \"SNARK\" stand for?",
      options: ["Succinct Non-Interactive Argument of Knowledge", "Secure Non-Automated Reasoning Kernel", "Simple Non-Analytical Random Key", "Symmetric Non-Advanced Recursive Knowledge"],
      correct: 0,
      timeLimit: 45,
      explanation: "zk-SNARK means a succinct, non-interactive argument of knowledge — proofs are compact and verifiable quickly."
    },
    {
      id: 6,
      question: "What makes zk-STARKs different from zk-SNARKs?",
      options: ["They don't require a trusted setup and are post-quantum secure", "They are slower and less transparent", "They use elliptic curve pairings", "They require private keys from validators"],
      correct: 0,
      timeLimit: 45,
      explanation: "zk-STARKs remove the need for trusted setup and are quantum-resistant, using hash-based cryptography."
    },
    {
      id: 7,
      question: "Which statement best explains the \"soundness\" property in ZKPs?",
      options: ["Only the prover learns the verification result", "Proofs always execute faster than traditional verifications", "Dishonest prover cannot convince the verifier of a false statement", "Soundness ensures public verifiability of all proofs"],
      correct: 2,
      timeLimit: 45,
      explanation: "Soundness guarantees that false claims cannot be proven true, maintaining trust in the proof system."
    },
    {
      id: 8,
      question: "Which Zero-Knowledge proof system scales best for large computations?",
      options: ["zk-SNARK", "zk-STARK", "Bulletproofs", "zk-Rollups"],
      correct: 1,
      timeLimit: 45,
      explanation: "zk-STARKs are highly scalable due to transparent setup and proof sizes that grow logarithmically with computation size."
    },
    {
      id: 9,
      question: "Why are zk-STARKs considered post-quantum secure while zk-SNARKs are not?",
      options: ["zk-STARKs rely on lattice-based assumptions", "zk-STARKs require smaller keys", "zk-SNARKs use symmetric encryption", "zk-STARKs use hash-based security, resistant to Shor's algorithm"],
      correct: 3,
      timeLimit: 45,
      explanation: "zk-STARKs rely on collision-resistant hash functions, which are believed to be safe from quantum attacks."
    },
    {
      id: 10,
      question: "What role do ZKPs play in blockchain scalability solutions like zk-Rollups?",
      options: ["They replace consensus algorithms", "Compress many transactions into one proof", "They manage wallet private keys", "They remove the need for nodes"],
      correct: 1,
      timeLimit: 45,
      explanation: "zk-Rollups batch multiple off-chain transactions and post a ZKP on-chain to prove their validity efficiently."
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