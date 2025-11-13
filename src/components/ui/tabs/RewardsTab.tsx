"use client";

import React, { useState, useEffect } from 'react';
import { useMiniApp } from '@neynar/react';
import SpinWheel from '~/components/SpinWheel';
import { useQTClaim } from '~/hooks/useQTClaim';

export function RewardsTab() {
  const { context } = useMiniApp();
  const [balance, setBalance] = useState<number | null>(null);
  const { claimQTReward, address } = useQTClaim();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 flex flex-col items-center justify-center">
      {/* Coins Panel - Top Left */}
      <div className="absolute top-4 left-4 z-50">
        <span className="px-3 py-1 rounded-full bg-black/30 border border-white/20 text-white text-sm">
          Coins: {balance ?? '—'}
        </span>
      </div>

      {/* Rewards Content */}
      <div className="w-full max-w-md mx-auto">
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

