"use client";

import { useState } from "react";
import { Zap, Lock, TrendingUp, X } from "lucide-react";
import sdk from "@farcaster/miniapp-sdk";

interface TokenomicsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const QTTokenomicsPanel = ({ isOpen, onClose }: TokenomicsPanelProps) => {
  const [isLoadingBuy, setIsLoadingBuy] = useState(false);

  // QT Token information
  const QT_TOKEN_ADDRESS = "0x541529ADB3f344128aa87917fd2926E7D240FB07";
  const CHAIN_ID = "8453"; // Base Mainnet
  const TOKEN_ASSET_ID = `eip155:${CHAIN_ID}/erc20:${QT_TOKEN_ADDRESS}`;

  // Token allocation data - Total must equal 100%
  const tokenData = [
    { label: 'Airdrop', percentage: 20, amount: '20B', color: '#FF4081' },
    { label: 'Community Rewards', percentage: 10, amount: '10B', color: '#2196F3' },
    { label: 'Development & Team', percentage: 15, amount: '15B', color: '#9C27B0' },
    { label: 'Liquidity', percentage: 55, amount: '55B', color: '#FF9800' }
  ];

  // Calculate cumulative percentages for the ring chart
  let cumulative = 0;
  const segments = tokenData.map(item => {
    const start = cumulative;
    cumulative += item.percentage;
    return { ...item, start, end: cumulative };
  });

  // Create SVG path for each segment
  const createArc = (startAngle: number, endAngle: number, radius: number, thickness: number) => {
    const start = (startAngle * Math.PI) / 180;
    const end = (endAngle * Math.PI) / 180;
    const innerRadius = radius - thickness;
    
    const x1 = 150 + radius * Math.cos(start);
    const y1 = 150 + radius * Math.sin(start);
    const x2 = 150 + radius * Math.cos(end);
    const y2 = 150 + radius * Math.sin(end);
    const x3 = 150 + innerRadius * Math.cos(end);
    const y3 = 150 + innerRadius * Math.sin(end);
    const x4 = 150 + innerRadius * Math.cos(start);
    const y4 = 150 + innerRadius * Math.sin(start);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  const handleBuyQT = async () => {
    setIsLoadingBuy(true);
    try {
      // Open swap interface to buy QT token directly
      await sdk.actions.swapToken({
        sellToken: `eip155:${CHAIN_ID}/native`, // Base ETH
        buyToken: TOKEN_ASSET_ID, // QT Token
      });
      console.log("Opening swap interface to buy QT token");
    } catch (err) {
      console.error("Failed to open swap interface:", err);
    } finally {
      setIsLoadingBuy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto pb-24">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="p-6 pt-8">
          <h1 className="text-3xl font-bold text-white mb-2">Quiz Trivia Token</h1>
        </div>

        {/* Ring Chart Section */}
        <div className="mx-4 mb-6 bg-black/20 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <div className="flex justify-center mb-6">
            <svg width="300" height="300" viewBox="0 0 300 300">
              {segments.map((segment, index) => (
                <path
                  key={index}
                  d={createArc(segment.start * 3.6 - 90, segment.end * 3.6 - 90, 120, 35)}
                  fill={segment.color}
                />
              ))}
              <circle cx="150" cy="150" r="75" fill="black" />
              <text x="150" y="140" textAnchor="middle" fill="white" fontSize="16" opacity="0.7">
                Total Supply
              </text>
              <text x="150" y="165" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">
                100B
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            {tokenData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-white text-sm">{item.label}</span>
                </div>
                <span className="text-white/80 text-sm font-medium">
                  {item.percentage}% ({item.amount})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Utility Section */}
        <div className="mx-4 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Token Utility</h2>
          <p className="text-white/80 text-sm mb-6">
            Core on-chain utility for Quiz Trivia ecosystem — used for game access, staking, rewards, and future features.
          </p>

          <div className="space-y-3">
            {/* Access Game Modes */}
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-1">Access Quiz Modes</h3>
                  <p className="text-white/70 text-sm">
                    Use $QT to unlock Weekly Quiz Challenge and Bet Mode for competitive gameplay and bigger rewards
                  </p>
                </div>
              </div>
            </div>

            {/* Staking Rewards */}
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-1">Stake & Earn Revenue</h3>
                  <p className="text-white/70 text-sm">
                    Future staking coming soon — earn a share of app revenue by staking your $QT tokens
                  </p>
                </div>
              </div>
            </div>

            {/* Liquidity */}
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-1">Deep Liquidity Pool</h3>
                  <p className="text-white/70 text-sm">
                    55% allocated to liquidity pools for stable trading and sustainable long-term growth
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buy Button */}
        <div className="mx-4 mb-6">
          <button
            onClick={handleBuyQT}
            disabled={isLoadingBuy}
            className={`w-full bg-white text-purple-600 font-bold text-lg py-4 rounded-2xl shadow-lg transition-all duration-200 ${
              isLoadingBuy
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-100 active:scale-95'
            }`}
          >
            {isLoadingBuy ? (
              <div className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Opening Wallet...</span>
              </div>
            ) : (
              'Buy $QT'
            )}
          </button>
        </div>

        {/* Token Info */}
        <div className="mx-4 mb-6 bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="text-center">
            <p className="text-white/60 text-xs mb-1">Contract Address</p>
            <p className="text-white text-xs font-mono break-all">
              {QT_TOKEN_ADDRESS}
            </p>
            <p className="text-white/60 text-xs mt-2">Base Network</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QTTokenomicsPanel;
