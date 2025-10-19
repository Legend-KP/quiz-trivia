"use client";
import { useState } from 'react';
import { ethers } from 'ethers';

// QT Reward Distributor Contract Configuration
const QT_DISTRIBUTOR_ADDRESS = process.env.NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS || '';
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
  }
];

export function useQTClaim() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimQTReward = async (userAddress: string): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    try {
      setIsProcessing(true);
      setError(null);

      // Check if window.ethereum exists (Farcaster wallet should inject this)
      if (!window.ethereum) {
        throw new Error('No wallet found. Please connect your Farcaster wallet.');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create provider from Farcaster wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Verify the connected address matches
      const connectedAddress = await signer.getAddress();
      if (connectedAddress.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Connected wallet does not match user address');
      }

      // Create contract instance
      const qtDistributor = new ethers.Contract(
        QT_DISTRIBUTOR_ADDRESS,
        QT_DISTRIBUTOR_ABI,
        signer
      );

      // Check if user can claim
      const canClaim = await qtDistributor.canClaimToday(userAddress);
      if (!canClaim) {
        throw new Error('You have already claimed your QT tokens today');
      }

      // Check contract balance
      const contractBalance = await qtDistributor.getQTBalance();
      const rewardAmount = ethers.parseUnits('10000', 18);
      
      if (contractBalance < rewardAmount) {
        throw new Error('Insufficient QT tokens in contract. Please contact support.');
      }

      // Call claimQTReward - this will trigger Farcaster wallet popup
      const tx = await qtDistributor.claimQTReward();
      
      console.log('Transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      console.log('Transaction confirmed:', receipt);

      setIsProcessing(false);
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (err: any) {
      console.error('QT claim error:', err);
      
      let errorMessage = 'Failed to claim QT tokens';
      
      // Handle specific errors
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsProcessing(false);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  return {
    claimQTReward,
    isProcessing,
    error
  };
}
