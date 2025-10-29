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

// Current Weekly Quiz Configuration
// Update this manually before each quiz (Monday evening for Tuesday quiz, Thursday evening for Friday quiz)
export const currentWeeklyQuiz: WeeklyQuizConfig = {
  id: new Date().toISOString().split('T')[0], // Today's date (YYYY-MM-DD)
  topic: "DeFi Protocols", // Update this topic for each quiz
  startTime: new Date(Date.now() - 60000).toISOString(), // Started 1 minute ago (makes it LIVE now)
  endTime: new Date(Date.now() + 12 * 60 * 60 * 1000 - 60000).toISOString(), // Ends 12 hours from now
  questions: [
    {
      id: 1,
      question: "What does TVL stand for in DeFi?",
      options: ["Total Value Locked", "Token Value Limit", "Trading Volume Limit", "Transaction Value Lock"],
      correct: 0,
      timeLimit: 45,
      explanation: "TVL measures the total value of assets locked in DeFi protocols, indicating protocol usage and liquidity."
    },
    {
      id: 2,
      question: "Which DeFi protocol pioneered automated market making?",
      options: ["Compound", "Uniswap", "MakerDAO", "Aave"],
      correct: 1,
      timeLimit: 45,
      explanation: "Uniswap introduced the constant product formula (x*y=k) for automated market making in DeFi."
    },
    {
      id: 3,
      question: "What is impermanent loss in DeFi?",
      options: ["Loss from smart contract bugs", "Loss from providing liquidity to AMMs", "Loss from high gas fees", "Loss from token price volatility"],
      correct: 1,
      timeLimit: 45,
      explanation: "Impermanent loss occurs when providing liquidity to AMMs due to price divergence between paired assets."
    },
    {
      id: 4,
      question: "Which token is used for governance in Uniswap?",
      options: ["UNI", "USDC", "ETH", "WETH"],
      correct: 0,
      timeLimit: 45,
      explanation: "UNI is Uniswap's governance token, allowing holders to vote on protocol upgrades and parameters."
    },
    {
      id: 5,
      question: "What is a flash loan in DeFi?",
      options: ["A loan that must be repaid within one transaction", "A loan with no collateral", "A loan with instant approval", "A loan for emergency situations"],
      correct: 0,
      timeLimit: 45,
      explanation: "Flash loans allow borrowing assets without collateral, but must be repaid within the same transaction block."
    },
    {
      id: 6,
      question: "Which DeFi protocol focuses on lending and borrowing?",
      options: ["Uniswap", "Compound", "SushiSwap", "Balancer"],
      correct: 1,
      timeLimit: 45,
      explanation: "Compound is a lending protocol where users can supply assets to earn interest or borrow against collateral."
    },
    {
      id: 7,
      question: "What is yield farming in DeFi?",
      options: ["Growing crops on blockchain", "Earning rewards by providing liquidity", "Mining cryptocurrency", "Trading tokens for profit"],
      correct: 1,
      timeLimit: 45,
      explanation: "Yield farming involves providing liquidity to DeFi protocols to earn rewards, often in the form of additional tokens."
    },
    {
      id: 8,
      question: "Which stablecoin is backed by crypto collateral?",
      options: ["USDC", "USDT", "DAI", "BUSD"],
      correct: 2,
      timeLimit: 45,
      explanation: "DAI is a decentralized stablecoin backed by crypto collateral through MakerDAO's CDP system."
    },
    {
      id: 9,
      question: "What is MEV in DeFi context?",
      options: ["Maximum Extractable Value", "Minimum Exchange Value", "Market Efficiency Variable", "Maximum Expected Volatility"],
      correct: 0,
      timeLimit: 45,
      explanation: "MEV refers to profits that can be extracted by reordering, including, or excluding transactions in a block."
    },
    {
      id: 10,
      question: "Which DeFi protocol enables cross-chain asset transfers?",
      options: ["Uniswap", "Compound", "Chainlink", "Wormhole"],
      correct: 3,
      timeLimit: 45,
      explanation: "Wormhole is a cross-chain bridge protocol that enables asset transfers between different blockchain networks."
    }
  ]
};

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

// Get next quiz start time (Tuesday or Friday at 6 PM UTC)
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
      // Before 6 PM UTC, quiz is today
      daysToAdd = 0;
    }
  } else if (currentDay === 5) {
    // Today is Friday
    if (currentHour >= 18) {
      // After 6 PM UTC, next quiz is Tuesday (4 days)
      daysToAdd = 4;
    } else {
      // Before 6 PM UTC, quiz is today
      daysToAdd = 0;
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