"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useMiniApp } from '@neynar/react';
import SpinWheel from '~/components/SpinWheel';
import { useQTClaim } from '~/hooks/useQTClaim';
import { useSecureSpinWheelQTClaim } from '~/hooks/useSecureSpinWheelQTClaim';

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
    lastClaimDate,
    refetchCanClaim 
  } = useQTClaim();
  
  // Spin wheel QT claim hook (secure version with signature verification)
  const {
    claimSpinReward: claimSpinWheelReward,
    isPending: isSpinWheelPending,
    isConfirming: isSpinWheelConfirming,
    isSuccess: isSpinWheelSuccess,
    isError: isSpinWheelError,
    error: spinWheelError,
    txHash: spinWheelTxHash
  } = useSecureSpinWheelQTClaim();
  
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
    
    // Check if wallet is connected
    if (!address) {
      return { success: false, error: 'Please connect your wallet to spin the wheel' };
    }
    
    try {
      const res = await fetch('/api/currency/claim-daily', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ fid, userAddress: address }) 
      });
      
      // Check if response is OK and is JSON
      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `API error: ${res.status} ${res.statusText}` };
      }
      
      // Check content type
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        return { success: false, error: 'Server returned non-JSON response' };
      }
      
      const data = await res.json();
      
      if (data?.balance !== undefined) {
        setBalance(data.balance);
      }
      
      return data;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to spin wheel' };
    }
  };

  const handleQTTokenWin = async (userAddress: string, qtAmount: number, claimData?: any) => {
    try {
      // If claimData (with signature) is provided, use it for secure claiming
      if (claimData && claimData.signature) {
        // Trigger the transaction
        claimSpinWheelReward(claimData);
        
        // Return success immediately - the transaction will be handled by wagmi hooks
        // The actual success/failure will be tracked via isSpinWheelSuccess/isSpinWheelError
        // The SpinWheel component will need to check these states or wait for user interaction
        return { 
          success: true, 
          txHash: spinWheelTxHash || undefined 
        };
      } else {
        // Fallback: if no signature data, return error
        return { 
          success: false, 
          error: 'Signature data missing. Please spin again to get a new signature.' 
        };
      }
    } catch (err: any) {
      // Provide user-friendly error messages
      let errorMsg = err?.message || 'Failed to claim QT tokens';
      
      if (errorMsg.toLowerCase().includes('insufficient contract balance') || 
          errorMsg.toLowerCase().includes('insufficient')) {
        errorMsg = 'The reward contract is temporarily out of tokens. Please contact support or try again later.';
      } else if (errorMsg.toLowerCase().includes('signature') || 
                 errorMsg.toLowerCase().includes('expired')) {
        errorMsg = 'The claim signature has expired. Please spin the wheel again to get a new signature.';
      } else if (errorMsg.toLowerCase().includes('cooldown')) {
        errorMsg = 'You need to wait before claiming again. Please check the cooldown timer.';
      } else if (errorMsg.toLowerCase().includes('user rejected') || 
                 errorMsg.toLowerCase().includes('user denied')) {
        errorMsg = 'Transaction was cancelled. Please try again if you want to claim your reward.';
      }
      
      return { 
        success: false, 
        error: errorMsg
      };
    }
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
    try {
      const result = await claimQTReward(address);
      
      if (result.success) {
        setClaimSuccess(true);
        // Refetch claim status after a delay
        setTimeout(() => {
          refetchCanClaim();
        }, 2000);
      } else {
        // Show error message if claim failed
        let errorMsg = result.error || 'Failed to claim daily reward';
        
        // Provide user-friendly error messages
        if (errorMsg.toLowerCase().includes('insufficient contract balance') || 
            errorMsg.toLowerCase().includes('insufficient')) {
          errorMsg = 'The daily reward contract is temporarily out of tokens. Please contact support or try again later.';
        } else if (errorMsg.toLowerCase().includes('already claimed')) {
          errorMsg = 'You have already claimed your daily reward today. Come back tomorrow!';
        } else if (errorMsg.toLowerCase().includes('user rejected') || 
                   errorMsg.toLowerCase().includes('user denied')) {
          errorMsg = 'Transaction was cancelled. Please try again if you want to claim your reward.';
        }
        
        alert(`⚠️ ${errorMsg}`);
      }
    } catch (err: any) {
      let errorMsg = err?.message || 'Failed to claim daily reward';
      
      if (errorMsg.toLowerCase().includes('insufficient')) {
        errorMsg = 'The daily reward contract is temporarily out of tokens. Please contact support or try again later.';
      }
      
      alert(`⚠️ ${errorMsg}`);
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
    <div className="relative h-screen overflow-y-auto bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500">
      {/* Background gradient - fixed */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 -z-10"></div>
      
      {/* Coins Panel - Top Left */}
      <div className="fixed top-4 left-4 z-50">
        <span className="px-3 py-1 rounded-full bg-black/30 border border-white/20 text-white text-sm">
          Coins: {balance ?? '—'}
        </span>
      </div>

      {/* Rewards Content */}
      <div className="relative z-10 w-full max-w-md mx-auto p-4 pt-20 pb-24 space-y-4 min-h-full flex flex-col items-center justify-center">
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
              ⚠️ {error.includes('insufficient') 
                ? 'The daily reward contract is temporarily out of tokens. Please contact support or try again later.'
                : error.includes('already claimed')
                ? 'You have already claimed your daily reward today. Come back tomorrow!'
                : 'Oops! Something went wrong. Don\'t worry, your reward is safe. Try again in a moment!'}
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
            <div className="space-y-2">
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 font-bold py-3 px-6 rounded-xl cursor-not-allowed"
              >
                ✅ You&apos;ve Already Claimed Today! See You Tomorrow! 🌟
              </button>
              {/* Debug info - only show in development */}
              {process.env.NODE_ENV === 'development' && lastClaimDate !== null && (
                <div className="text-xs text-gray-500 text-center">
                  Last claim date: {lastClaimDate} (days since epoch)
                  <br />
                  Today: {Math.floor(Date.now() / 1000 / 86400)}
                  <br />
                  Wallet: {address?.slice(0, 10)}...
                  <button
                    onClick={() => refetchCanClaim()}
                    className="ml-2 text-blue-500 underline"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
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
          
          {/* Manual refresh button for troubleshooting */}
          {address && (
            <button
              onClick={() => {
                refetchCanClaim();
                alert('Claim status refreshed! Check if you can claim now.');
              }}
              className="w-full mt-2 text-xs text-blue-500 underline hover:text-blue-700"
            >
              🔄 Refresh Claim Status
            </button>
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

