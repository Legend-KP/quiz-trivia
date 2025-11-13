"use client";
import { useState, useEffect } from 'react';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';

// QT Reward Distributor Contract Configuration
const QT_DISTRIBUTOR_ADDRESS = process.env.NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS as `0x${string}` || '0xb8AD9216A88E2f9a24c7e2207dE4e69101031f02';
const QT_DISTRIBUTOR_ABI = [
  {
    "inputs": [],
    "name": "claimQTReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "canClaimToday",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
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
    "name": "REWARD_AMOUNT",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export function useQTClaim() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Check if user can claim today
  const { data: canClaim, refetch: refetchCanClaim } = useReadContract({
    address: address ? QT_DISTRIBUTOR_ADDRESS : undefined,
    abi: QT_DISTRIBUTOR_ABI,
    functionName: 'canClaimToday',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 60000, // Refetch every minute
    },
  });

  // Get reward amount
  const { data: rewardAmount } = useReadContract({
    address: QT_DISTRIBUTOR_ADDRESS,
    abi: QT_DISTRIBUTOR_ABI,
    functionName: 'REWARD_AMOUNT',
  });

  // Update processing state based on Wagmi states
  useEffect(() => {
    if (isPending || isConfirming) {
      setIsProcessing(true);
    } else if (isConfirmed || writeError) {
      setIsProcessing(false);
    }
  }, [isPending, isConfirming, isConfirmed, writeError]);

  // Update txHash when hash changes
  useEffect(() => {
    if (hash) {
      setTxHash(hash);
    }
  }, [hash]);

  // Update error when writeError changes
  useEffect(() => {
    if (writeError) {
      setError(writeError.message || 'Transaction failed');
    }
  }, [writeError]);

  // Refetch claim status after successful transaction
  useEffect(() => {
    if (isConfirmed) {
      refetchCanClaim();
      setError(null);
    }
  }, [isConfirmed, refetchCanClaim]);

  const claimQTReward = async (userAddress: string): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    try {
      setIsProcessing(true);
      setError(null);
      setTxHash(null);

      // Check if user is connected, if not, connect using Farcaster wallet
      if (!isConnected) {
        if (connectors.length === 0) {
          throw new Error('No Farcaster wallet connector available');
        }
        await connect({ connector: connectors[0] });
        // Wait a moment for connection to establish
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Verify the connected address matches the user address
      if (address && address.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Connected wallet does not match user address');
      }

      // Execute the claim transaction using Wagmi
      writeContract({
        address: QT_DISTRIBUTOR_ADDRESS,
        abi: QT_DISTRIBUTOR_ABI,
        functionName: 'claimQTReward',
      });

      // Return success immediately - the transaction will be handled by Wagmi hooks
      // The actual transaction hash will be available in the hash state
      return { success: true, txHash: hash || undefined };

    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || 'Failed to claim QT tokens');
      return { 
        success: false, 
        error: err.message || 'Failed to claim QT tokens' 
      };
    }
  };

  return {
    claimQTReward,
    isProcessing: isProcessing || isPending || isConfirming,
    error,
    isConnected,
    address,
    txHash: hash || txHash,
    isConfirmed,
    canClaim: canClaim ?? false,
    rewardAmount: rewardAmount ? Number(rewardAmount) / 1e18 : 1000, // Default to 1,000 QT if not available
    refetchCanClaim
  };
}