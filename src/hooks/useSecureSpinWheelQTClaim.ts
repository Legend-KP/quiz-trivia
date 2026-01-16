"use client";
import { useWriteContract, useReadContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useState, useCallback } from 'react';

// ⚠️ UPDATE THIS AFTER DEPLOYING SECURE CONTRACT
const SECURE_SPIN_WHEEL_CONTRACT = process.env.NEXT_PUBLIC_SECURE_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS as `0x${string}` || 
  process.env.NEXT_PUBLIC_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS as `0x${string}` || 
  '0x0000000000000000000000000000000000000000';

// Secure Contract ABI (with signature verification)
const SECURE_SPIN_WHEEL_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "rewardAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "nonce", "type": "uint256"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"},
      {"internalType": "bytes", "name": "signature", "type": "bytes"}
    ],
    "name": "claimSpinReward",
    "outputs": [],
    "stateMutability": "nonpayable",
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
      {"internalType": "uint256", "name": "totalUserClaims", "type": "uint256"},
      {"internalType": "uint256", "name": "totalRewards", "type": "uint256"},
      {"internalType": "uint256", "name": "remainingDailyLimit", "type": "uint256"}
    ],
    "stateMutability": "view",
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
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"},
      {"indexed": false, "internalType": "bytes32", "name": "signatureHash", "type": "bytes32"}
    ],
    "name": "QTRewardClaimed",
    "type": "event"
  }
] as const;

interface ClaimSignatureData {
  userAddress: string;
  rewardAmount: string; // In wei
  rewardAmountReadable: number; // Human-readable
  nonce: number;
  deadline: number;
  signature: string;
  expiresAt: string;
}

interface UseSecureSpinWheelQTClaimReturn {
  claimSpinReward: (claimData: ClaimSignatureData) => Promise<void>;
  canClaim: boolean | undefined;
  remainingCooldown: bigint | undefined;
  claimStatus: {
    lastClaim: bigint | undefined;
    canClaimNow: boolean | undefined;
    remainingCooldown: bigint | undefined;
    totalClaims: bigint | undefined;
    totalRewards: bigint | undefined;
    remainingDailyLimit: bigint | undefined;
  };
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  txHash: string | null;
  contractBalance: bigint | undefined;
  refetchCooldown: () => void;
}

export function useSecureSpinWheelQTClaim(): UseSecureSpinWheelQTClaimReturn {
  const { address } = useAccount();
  const [error, setError] = useState<Error | null>(null);

  // Write contract for claiming
  const {
    writeContract,
    isPending,
    isSuccess,
    isError,
    error: writeError,
    data: hash,
  } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Claim QT tokens using signature from backend
   */
  const claimSpinReward = useCallback(
    async (claimData: ClaimSignatureData) => {
      try {
        // Validate inputs
        if (!address) {
          throw new Error('Wallet not connected');
        }

        if (address.toLowerCase() !== claimData.userAddress.toLowerCase()) {
          throw new Error('User address mismatch');
        }

        if (!SECURE_SPIN_WHEEL_CONTRACT || SECURE_SPIN_WHEEL_CONTRACT === '0x0000000000000000000000000000000000000000') {
          throw new Error(
            'Secure spin wheel contract not configured. Please set NEXT_PUBLIC_SECURE_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS'
          );
        }

        // Check if signature expired
        const now = Math.floor(Date.now() / 1000);
        if (claimData.deadline < now) {
          throw new Error('Claim signature has expired. Please spin again.');
        }


        // Call smart contract with signature
        writeContract({
          address: SECURE_SPIN_WHEEL_CONTRACT,
          abi: SECURE_SPIN_WHEEL_ABI,
          functionName: 'claimSpinReward',
          args: [
            BigInt(claimData.rewardAmount), // rewardAmount in wei
            BigInt(claimData.nonce), // nonce
            BigInt(claimData.deadline), // deadline
            claimData.signature as `0x${string}`, // signature
          ],
        });
      } catch (err: any) {
        setError(err);
        throw err;
      }
    },
    [address, writeContract]
  );

  /**
   * Check if user can claim (cooldown check)
   */
  const { data: canClaimData, refetch: refetchCanClaim } = useReadContract({
    address:
      SECURE_SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000'
        ? SECURE_SPIN_WHEEL_CONTRACT
        : undefined,
    abi: SECURE_SPIN_WHEEL_ABI,
    functionName: 'canClaim',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && SECURE_SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 1000, // Refetch every second to update cooldown
    },
  });

  /**
   * Get remaining cooldown time
   */
  const { data: remainingCooldownData, refetch: refetchCooldown } = useReadContract({
    address:
      SECURE_SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000'
        ? SECURE_SPIN_WHEEL_CONTRACT
        : undefined,
    abi: SECURE_SPIN_WHEEL_ABI,
    functionName: 'getRemainingCooldown',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && SECURE_SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 1000,
    },
  });

  /**
   * Get user's full claim status
   */
  const { data: claimStatusData } = useReadContract({
    address:
      SECURE_SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000'
        ? SECURE_SPIN_WHEEL_CONTRACT
        : undefined,
    abi: SECURE_SPIN_WHEEL_ABI,
    functionName: 'getUserClaimStatus',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && SECURE_SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 5000,
    },
  });

  /**
   * Get contract balance
   */
  const { data: contractBalanceData } = useReadContract({
    address:
      SECURE_SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000'
        ? SECURE_SPIN_WHEEL_CONTRACT
        : undefined,
    abi: SECURE_SPIN_WHEEL_ABI,
    functionName: 'getQTBalanceReadable',
    query: {
      enabled: SECURE_SPIN_WHEEL_CONTRACT !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 10000,
    },
  });

  // Parse claim status
  const claimStatus = claimStatusData
    ? {
        lastClaim: claimStatusData[0],
        canClaimNow: claimStatusData[1],
        remainingCooldown: claimStatusData[2],
        totalClaims: claimStatusData[3],
        totalRewards: claimStatusData[4],
        remainingDailyLimit: claimStatusData[5],
      }
    : {
        lastClaim: undefined,
        canClaimNow: undefined,
        remainingCooldown: undefined,
        totalClaims: undefined,
        totalRewards: undefined,
        remainingDailyLimit: undefined,
      };

  // Update error state from writeContract
  if (writeError && !error) {
    setError(writeError as Error);
  }

  return {
    claimSpinReward,
    canClaim: canClaimData,
    remainingCooldown: remainingCooldownData,
    claimStatus,
    isPending,
    isConfirming,
    isSuccess,
    isError,
    error: error || (writeError as Error) || null,
    txHash: hash || null,
    contractBalance: contractBalanceData,
    refetchCooldown: () => {
      refetchCanClaim();
      refetchCooldown();
    },
  };
}

