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

// Minimum QT token requirement to participate in Weekly Quiz
// Set to 0 to allow everyone to participate (no QT requirement)
export const MIN_REQUIRED_QT = 0; // No QT requirement - everyone can participate

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
    topic: "Arbitrum Edition", // Update this topic for each quiz
    startTime: startDate.toISOString(), // Tuesday or Friday 6 PM UTC
    endTime: endDate.toISOString(), // Next day 6 AM UTC (12-hour window)
    questions: [
    {
      id: 1,
      question: "What primarily differentiates Arbitrum Nitro from earlier Arbitrum implementations?",
      options: ["New consensus mechanism", "Fraud-proof removal", "WASM-based execution", "Data availability change"],
      correct: 2,
      timeLimit: 30,
      explanation: "Nitro introduced a WASM-based prover/execution environment, making Arbitrum faster and more efficient."
    },
    {
      id: 2,
      question: "Why does Arbitrum rely on an optimistic execution model instead of validity proofs?",
      options: ["Lower gas fees", "Faster withdrawals", "EVM compatibility", "Reduced prover cost"],
      correct: 3,
      timeLimit: 30,
      explanation: "Optimistic rollups avoid expensive proving systems, reducing costs and improving scalability."
    },
    {
      id: 3,
      question: "What role do validators play in Arbitrum's security model?",
      options: ["Block production", "State finalization", "Challenge initiation", "Sequencer rotation"],
      correct: 2,
      timeLimit: 30,
      explanation: "Validators monitor for incorrect state claims and can initiate challenges to secure the rollup."
    },
    {
      id: 4,
      question: "Why is the Arbitrum sequencer currently centralized?",
      options: ["Consensus limitations", "Regulatory constraints", "Performance optimization", "Token economics"],
      correct: 2,
      timeLimit: 30,
      explanation: "A centralized sequencer allows faster tx ordering and improved UX while decentralization is being developed."
    },
    {
      id: 5,
      question: "What is the main purpose of Arbitrum Stylus?",
      options: ["Enable zk execution", "Support non-EVM chains", "Allow multi-language smart contracts", "Improve L1 data compression"],
      correct: 2,
      timeLimit: 30,
      explanation: "Stylus lets developers write smart contracts in languages like Rust, C, and C++, expanding Arbitrum's capabilities."
    },
    {
      id: 6,
      question: "Which factor most limits Arbitrum's withdrawal finality today?",
      options: ["L1 congestion", "Fraud proof window", "Sequencer batching", "Oracle latency"],
      correct: 1,
      timeLimit: 30,
      explanation: "Withdrawals must wait through the fraud-proof challenge window, which delays finality."
    },
    {
      id: 7,
      question: "Why does Arbitrum post calldata to Ethereum L1?",
      options: ["Fee optimization", "State reconstruction", "Decentralized sequencing", "Liquidity bridging"],
      correct: 1,
      timeLimit: 30,
      explanation: "Posting calldata ensures Ethereum can always reconstruct the rollup state, even if Arbitrum goes offline."
    },
    {
      id: 8,
      question: "What recent improvement most reduced gas costs for Arbitrum users?",
      options: ["Native account abstraction", "Nitro compression", "Stylus deployment", "Token incentives"],
      correct: 1,
      timeLimit: 30,
      explanation: "Nitro introduced major calldata compression improvements, lowering transaction fees significantly."
    },
    {
      id: 9,
      question: "How does Arbitrum Orbit primarily extend the ecosystem?",
      options: ["Enables sovereign L2s", "Adds shared security", "Introduces zk rollups", "Replaces Ethereum DA"],
      correct: 0,
      timeLimit: 30,
      explanation: "Orbit enables developers to deploy their own customizable L2 or L3 chains using Arbitrum tech."
    },
    {
      id: 10,
      question: "What is the biggest long-term risk to Arbitrum's decentralization roadmap?",
      options: ["Validator cartelization", "MEV leakage", "Sequencer dependency", "Token inflation"],
      correct: 2,
      timeLimit: 30,
      explanation: "Arbitrum still depends on a centralized sequencer, which poses a decentralization bottleneck long term."
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

// Contract addresses for the 3 QT distributor contracts
export const QT_DISTRIBUTOR_CONTRACTS = [
  {
    name: 'SpinWheelQTDistributor',
    address: '0x3D59700B5EBb9bDdA7D5b16eD3A77315cF1B0e2B' as `0x${string}`,
  },
  {
    name: 'DailyRewardDistributor',
    address: '0xbC9e7dE46aA15eA26ba88aD87B76f6fa2EcCD4eD' as `0x${string}`,
  },
  {
    name: 'QTRewardDistributor',
    address: '0xB0EfA92d9Da5920905F69581bAC223C3bf7E44F5' as `0x${string}`,
  },
] as const;

// Interface for contract balance data
export interface ContractBalance {
  name: string;
  address: string;
  balance: number;
  balanceFormatted: string;
}

// Interface for all contract balances response
export interface ContractBalancesResponse {
  success: boolean;
  contracts: ContractBalance[];
  total: {
    balance: number;
    balanceFormatted: string;
  };
  timestamp?: string;
  error?: string;
}

/**
 * Fetch QT token balances from all 3 distributor contracts
 */
export async function fetchContractQTBalances(): Promise<ContractBalancesResponse> {
  try {
    const response = await fetch('/api/contracts/qt-balances', {
      cache: 'no-store', // Always fetch fresh data
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch balances: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    // console.error('Error fetching contract balances:', error);
    return {
      success: false,
      contracts: [],
      total: { balance: 0, balanceFormatted: '0' },
      error: error.message || 'Failed to fetch contract balances',
    };
  }
}