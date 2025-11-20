"use client";

import React, { useState, useEffect } from 'react';
import { useMiniApp } from '@neynar/react';
import SpinWheel from '~/components/SpinWheel';
import { useQTClaim } from '~/hooks/useQTClaim';

export function RewardsTab() {
  const { context } = useMiniApp();
  const [balance, setBalance] = useState<number | null>(null);
  const { 
    claimQTReward, 
    address, 
    canClaim, 
    rewardAmount, 
    isProcessing, 
    error, 
    isConfirmed,
    refetchCanClaim 
  } = useQTClaim();
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Fetch balance
  useEffect(() => {
    const fid = context?.user?.fid;
    if (!fid) return;
    fetch(`/api/currency/balance?fid=${fid}`)
      .then(r => r.json())
      .then(d => setBalance(typeof d.balance === 'number' ? d.balance : null))
      .catch(() => {});
  }, [context?.user?.fid]);

  const handleSpinWheelSpin = async () => {
    const fid = context?.user?.fid;
    if (!fid) return { success: false, error: 'No user ID' };
    
    try {
      const res = await fetch('/api/currency/claim-daily', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ fid }) 
      });
      const data = await res.json();
      
      if (data?.balance !== undefined) {
        setBalance(data.balance);
      }
      
      return data;
    } catch (error) {
      console.error('Spin wheel error:', error);
      return { success: false, error: 'Failed to spin wheel' };
    }
  };

  const handleQTTokenWin = async (userAddress: string) => {
    return await claimQTReward(userAddress);
  };

  const handleDailyClaim = async () => {
    if (!address) {
      alert('🔗 Connect your wallet first to unlock your daily treasure!');
      return;
    }

    if (!canClaim) {
      alert('🌟 You\'ve already claimed your reward today! Come back tomorrow for another surprise! 🎁');
      return;
    }

    setClaimSuccess(false);
    const result = await claimQTReward(address);
    
    if (result.success) {
      setClaimSuccess(true);
      // Refetch claim status after a delay
      setTimeout(() => {
        refetchCanClaim();
      }, 2000);
    }
  };

  // Reset success message when claim status changes
  useEffect(() => {
    if (isConfirmed) {
      setClaimSuccess(true);
      setTimeout(() => {
        refetchCanClaim();
        setClaimSuccess(false);
      }, 3000);
    }
  }, [isConfirmed, refetchCanClaim]);

  const formatRewardAmount = (amount: number) => {
    // For daily reward, always show as "1000 $QT" format
    if (amount === 1000) {
      return '1000 $QT';
    }
    // Fallback for other amounts
      if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M $QT`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K $QT`;
    }
    return `${amount.toLocaleString()} $QT`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 flex flex-col items-center justify-center">
      {/* Coins Panel - Top Left */}
      <div className="absolute top-4 left-4 z-50">
        <span className="px-3 py-1 rounded-full bg-black/30 border border-white/20 text-white text-sm">
          Coins: {balance ?? '—'}
        </span>
      </div>

      {/* Rewards Content */}
      <div className="w-full max-w-md mx-auto space-y-4">
        {/* Daily Claim Section */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
            🎁 Daily Treasure Chest
          </h2>
          <p className="text-center text-gray-600 mb-4 text-sm">
            Your daily dose of QT tokens is waiting! 🚀
          </p>
          
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-4 border-2 border-yellow-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-800 mb-1">
                {formatRewardAmount(rewardAmount)}
              </div>
              <div className="text-sm text-yellow-700 font-semibold">
                💰 Free Daily Bonus
              </div>
            </div>
          </div>

          {claimSuccess && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center text-sm animate-pulse">
              🎉 <span className="font-bold">Awesome!</span> Your QT tokens are on their way to your wallet! Check it out! 💰✨
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center text-sm">
              ⚠️ Oops! Something went wrong. Don't worry, your reward is safe. Try again in a moment!
            </div>
          )}

          {!address ? (
            <button
              disabled
              className="w-full bg-gray-300 text-gray-500 font-bold py-3 px-6 rounded-xl cursor-not-allowed"
            >
              🔗 Connect Your Wallet to Unlock Rewards
            </button>
          ) : !canClaim ? (
            <button
              disabled
              className="w-full bg-gray-300 text-gray-500 font-bold py-3 px-6 rounded-xl cursor-not-allowed"
            >
              ✅ You've Already Claimed Today! See You Tomorrow! 🌟
            </button>
          ) : (
            <button
              onClick={handleDailyClaim}
              disabled={isProcessing}
              className={`w-full font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg ${
                isProcessing
                  ? 'bg-gray-400 text-white cursor-wait'
                  : 'bg-gradient-to-r from-green-500 to-blue-600 text-white hover:from-green-600 hover:to-blue-700 transform hover:scale-105 hover:shadow-xl'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                  🎁 Claiming Your Reward...
                </span>
              ) : (
                '🎁 Claim My Daily Treasure!'
              )}
            </button>
          )}

          {canClaim && address && (
            <p className="text-center text-xs text-gray-500 mt-3">
              ⏰ One claim per day! Set a reminder and come back tomorrow for another surprise! 🎯
            </p>
          )}
        </div>

        {/* Spin Wheel Section */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
            🎰 Spin the Wheel
          </h2>
          <p className="text-center text-gray-600 mb-4 text-sm">
            Spin to win daily rewards and QT tokens!
          </p>
          
          <SpinWheel 
            onSpin={handleSpinWheelSpin} 
            onQTTokenWin={handleQTTokenWin}
            userAddress={address || "0x0000000000000000000000000000000000000000"}
          />
        </div>
      </div>
    </div>
  );
}

