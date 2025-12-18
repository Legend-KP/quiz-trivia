"use client";
import { useWriteContract, useReadContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';

// ⚠️ UPDATE THIS AFTER DEPLOYING CONTRACT
// This should be set to the deployed SpinWheelQTDistributor contract address
const SPIN_WHEEL_CONTRACT = process.env.NEXT_PUBLIC_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';

const QT_TOKEN_ADDRESS = '0x541529ADB3f344128aa87917fd2926E7D240FB07';

// Contract ABI (complete)
const SPIN_WHEEL_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "_qtTokenAddress", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "previousOwner", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "newOwner", "type": "address"}
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "QTRewardClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "QTTokensDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "QTTokensWithdrawn",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "COOLDOWN_PERIOD",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "REWARD_10000_QT",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "REWARD_1000_QT",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "REWARD_100_QT",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "REWARD_2000_QT",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "REWARD_200_QT",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "REWARD_500_QT",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "canClaim",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "rewardAmount", "type": "uint256"}],
    "name": "claimSpinReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "userAddress", "type": "address"},
      {"internalType": "uint256", "name": "rewardAmount", "type": "uint256"}
    ],
    "name": "claimSpinRewardForUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "depositQTTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getQTBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getQTBalanceReadable",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getRemainingCooldown",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserClaimStatus",
    "outputs": [
      {"internalType": "uint256", "name": "lastClaim", "type": "uint256"},
      {"internalType": "bool", "name": "canClaimNow", "type": "bool"},
      {"internalType": "uint256", "name": "remainingCooldown", "type": "uint256"},
      {"internalType": "uint256", "name": "totalUserClaims", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "isValidRewardAmount",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "lastClaimTimestamp",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "qtToken",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "totalClaims",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "newOwner", "type": "address"}],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "withdrawQTTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

interface UseSpinWheelQTClaimReturn {
  claimSpinReward: (qtAmount: number) => Promise<void>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  canClaim: boolean;
  remainingCooldown: number;
  contractBalance: number;
  refetchCanClaim: () => void;
  refetchCooldown: () => void;
  txHash: string | null;
}

export function useSpinWheelQTClaim(): UseSpinWheelQTClaimReturn {
  const { address } = useAccount();
  
  // Write contract for claiming
  const { 
    writeContract, 
    isPending, 
    isSuccess, 
    isError, 
    error,
    data: hash
  } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Claim QT tokens from spin wheel result
   */
  const claimSpinReward = async (qtAmount: number) => {
    try {
      // Validate amount
      const validAmounts = [100, 200, 500, 1000, 2000, 10000];
      if (!validAmounts.includes(qtAmount)) {
        throw new Error(`Invalid QT amount: ${qtAmount}. Must be one of: ${validAmounts.join(', ')}`);
      }

      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!SPIN_WHEEL_CONTRACT || SPIN_WHEEL_CONTRACT === '0x0000000000000000000000000000000000000000') {
        throw new Error('Spin wheel contract not configured. Please set NEXT_PUBLIC_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS');
      }

      console.log(`Claiming ${qtAmount} QT for user ${address}`);

      // Call smart contract
      writeContract({
        address: SPIN_WHEEL_CONTRACT,
        abi: SPIN_WHEEL_ABI,
        functionName: 'claimSpinReward',
        args: [BigInt(qtAmount)],
      });

    } catch (err) {
      console.error('Error claiming QT tokens:', err);
      throw err;
    }
  };

  /**
   * Check if user can claim (cooldown check)
   */
  const { data: canClaimData, refetch: refetchCanClaim } = useReadContract({
    address: SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000' ? SPIN_WHEEL_CONTRACT : undefined,
    abi: SPIN_WHEEL_ABI,
    functionName: 'canClaim',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 1000, // Refetch every second to update cooldown
    },
  });

  /**
   * Get remaining cooldown time
   */
  const { data: remainingCooldownData, refetch: refetchCooldown } = useReadContract({
    address: SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000' ? SPIN_WHEEL_CONTRACT : undefined,
    abi: SPIN_WHEEL_ABI,
    functionName: 'getRemainingCooldown',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 1000, // Refetch every second
    },
  });

  /**
   * Get contract's QT balance
   */
  const { data: contractBalanceData } = useReadContract({
    address: SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000' ? SPIN_WHEEL_CONTRACT : undefined,
    abi: SPIN_WHEEL_ABI,
    functionName: 'getQTBalanceReadable',
    query: {
      enabled: SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  return {
    claimSpinReward,
    isPending: isPending || isConfirming,
    isSuccess,
    isError,
    error: error as Error | null,
    canClaim: canClaimData as boolean ?? false,
    remainingCooldown: remainingCooldownData ? Number(remainingCooldownData) : 0,
    contractBalance: contractBalanceData ? Number(contractBalanceData) : 0,
    refetchCanClaim,
    refetchCooldown,
    txHash: hash || null,
  };
}

export default useSpinWheelQTClaim;
