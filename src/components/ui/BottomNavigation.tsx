"use client";

import { useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

/**
 * Bottom Navigation Component
 * 
 * Displays a fixed bottom navigation bar with three options:
 * - Left: $QT (Token view)
 * - Center: Home
 * - Right: Rewards
 */
interface BottomNavigationProps {
  activeTab?: "home" | "qt" | "rewards" | "bet-mode";
  onHomeClick?: () => void;
  onRewardsClick?: () => void;
  onBetModeClick?: () => void;
}

export function BottomNavigation({ 
  activeTab = "home",
  onHomeClick,
  onRewardsClick,
  onBetModeClick
}: BottomNavigationProps) {
  const [isLoadingQT, setIsLoadingQT] = useState(false);

  // QT Token information
  const QT_TOKEN_ADDRESS = "0x541529ADB3f344128aa87917fd2926E7D240FB07";
  const CHAIN_ID = "8453"; // Base Mainnet
  const TOKEN_ASSET_ID = `eip155:${CHAIN_ID}/erc20:${QT_TOKEN_ADDRESS}`;

  const handleQTClick = async () => {
    setIsLoadingQT(true);
    try {
      await sdk.actions.viewToken({ token: TOKEN_ASSET_ID });
    } catch (err) {
      console.error("Failed to open token in wallet:", err);
    } finally {
      setIsLoadingQT(false);
    }
  };

  const handleHomeClick = () => {
    if (onHomeClick) {
      onHomeClick();
    } else {
      // Default: scroll to top or reload home
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleRewardsClick = () => {
    if (onRewardsClick) {
      onRewardsClick();
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="bg-white backdrop-blur-md border-t-2 border-gray-200 shadow-xl">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Left: $QT */}
          <button
            onClick={handleQTClick}
            disabled={isLoadingQT}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 rounded-lg text-gray-800 ${
              activeTab === "qt"
                ? "bg-white shadow-md"
                : "bg-white hover:bg-gray-50"
            } ${isLoadingQT ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="relative">
              <span className="text-lg font-bold">$QT</span>
              {isLoadingQT && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="animate-spin h-4 w-4 text-gray-800"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              )}
            </div>
            <span className="text-[10px] mt-0.5 font-medium">Token</span>
          </button>

          {/* Home */}
          <button
            onClick={handleHomeClick}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 rounded-lg ${
              activeTab === "home"
                ? "text-primary bg-primary/10"
                : "text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-light"
            }`}
          >
            <span className="text-xl">🏠</span>
            <span className="text-[10px] mt-0.5 font-medium">Home</span>
          </button>

          {/* Bet Mode */}
          <button
            onClick={onBetModeClick}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 rounded-lg ${
              activeTab === "bet-mode"
                ? "text-primary bg-primary/10"
                : "text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-light"
            }`}
          >
            <span className="text-xl">🎰</span>
            <span className="text-[10px] mt-0.5 font-medium">Bet</span>
          </button>

          {/* Rewards */}
          <button
            onClick={handleRewardsClick}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 rounded-lg ${
              activeTab === "rewards"
                ? "text-primary bg-primary/10"
                : "text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-light"
            }`}
          >
            <span className="text-xl">🏆</span>
            <span className="text-[10px] mt-0.5 font-medium">Rewards</span>
          </button>
        </div>
      </div>
    </div>
  );
}

