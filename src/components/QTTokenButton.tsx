"use client";

import React, { useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

export default function QTTokenButton() {
  const [isLoading, setIsLoading] = useState(false);
  const QT_TOKEN_ADDRESS = "0x541529ADB3f344128aa87917fd2926E7D240FB07";
  const TOKEN_ASSET_ID = `eip155:8453/erc20:${QT_TOKEN_ADDRESS}`; // Base mainnet

  const handleClick = async () => {
    try {
      setIsLoading(true);
      await sdk.actions.viewToken({ token: TOKEN_ASSET_ID });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-xl text-xl transform hover:scale-105 transition-all duration-200 shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none`}
      aria-label="View $QT token"
   >
      {isLoading ? 'Opening…' : '$QT • View Token'}
    </button>
  );
}


