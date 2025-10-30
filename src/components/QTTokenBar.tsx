"use client";

import { useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

/**
 * QT Token Bar Component
 * 
 * Displays a fixed bottom bar with Quiz Trivia Token information.
 * When clicked, it opens the token in the Farcaster wallet using viewToken action.
 */
export function QTTokenBar() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // QT Token information
  const QT_TOKEN_ADDRESS = "0x541529ADB3f344128aa87917fd2926E7D240FB07";
  const CHAIN_ID = "8453"; // Base Mainnet
  const TOKEN_SYMBOL = "$QT";
  const TOKEN_NAME = "Quiz Trivia Token";
  const TOKEN_LOGO_URL = "https://i.ibb.co/XZtWW7xP/Quiz-Trivia-Logo.png";
  
  // CAIP-19 format: eip155:8453/erc20:0x541529ADB3f344128aa87917fd2926E7D240FB07
  const TOKEN_ASSET_ID = `eip155:${CHAIN_ID}/erc20:${QT_TOKEN_ADDRESS}`;

  const handleTokenClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use Farcaster SDK viewToken action to open token in wallet
      await sdk.actions.viewToken({ token: TOKEN_ASSET_ID });
    } catch (err) {
      console.error("Failed to open token in wallet:", err);
      setError("Failed to open wallet. Please try again.");
      
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={handleTokenClick}
      className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-primary via-primary-light to-indigo-600 text-white shadow-lg cursor-pointer hover:from-primary-dark hover:via-primary hover:to-indigo-700 transition-all duration-200 active:scale-[0.98] select-none"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      role="button"
      aria-label={`View ${TOKEN_NAME} in wallet`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTokenClick();
        }
      }}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          {/* Left side: Logo and Token Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Token Logo */}
            <div className="flex-shrink-0">
              <img
                src={TOKEN_LOGO_URL}
                alt={`${TOKEN_NAME} logo`}
                className="w-8 h-8 rounded-full object-cover border-2 border-white/30 bg-white/10"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>

            {/* Token Details */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base truncate">{TOKEN_SYMBOL}</span>
                {isLoading && (
                  <span className="text-xs animate-pulse">Opening...</span>
                )}
              </div>
              <span className="text-xs text-white/80 truncate">{TOKEN_NAME}</span>
            </div>
          </div>

          {/* Right side: Buy/View Button */}
          <div className="flex-shrink-0">
            <div className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors duration-200 border border-white/30">
              {isLoading ? (
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Opening...</span>
                </span>
              ) : error ? (
                <span className="text-red-200 whitespace-nowrap">Error</span>
              ) : (
                <span className="whitespace-nowrap">View Token</span>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-2 text-xs text-red-200 text-center animate-fade-in">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

