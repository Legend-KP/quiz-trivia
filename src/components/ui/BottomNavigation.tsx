"use client";

import { useState } from "react";
import QTTokenomicsPanel from "./TokenomicsPanel";

/**
 * Bottom Navigation Component
 * 
 * Displays a fixed bottom navigation bar with three options:
 * - Left: Buy $QT (Opens Tokenomics panel)
 * - Center: Home
 * - Right: Rewards
 */
interface BottomNavigationProps {
  activeTab?: "home" | "qt" | "rewards";
  onHomeClick?: () => void;
  onRewardsClick?: () => void;
}

export function BottomNavigation({ 
  activeTab = "home",
  onHomeClick,
  onRewardsClick
}: BottomNavigationProps) {
  const [showTokenomicsPanel, setShowTokenomicsPanel] = useState(false);

  const handleQTClick = () => {
    setShowTokenomicsPanel(true);
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
          {/* Left: Buy $QT */}
          <button
            onClick={handleQTClick}
            className="flex flex-col items-center justify-center flex-1 h-full mx-1 transition-all duration-200 rounded-2xl bg-white text-purple-600 font-bold shadow-lg hover:bg-gray-100 active:scale-95"
          >
            <span className="text-lg font-bold">$QT</span>
            <span className="text-[10px] mt-0.5 font-medium">Buy</span>
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

      {/* Tokenomics Panel */}
      <QTTokenomicsPanel 
        isOpen={showTokenomicsPanel} 
        onClose={() => setShowTokenomicsPanel(false)} 
      />
    </div>
  );
}

