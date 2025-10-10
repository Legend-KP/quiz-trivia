import { createConfig, http, WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { useEffect, useState } from "react";
import { useConnect, useAccount } from "wagmi";
import React from "react";


// Custom hook for Farcaster Mini App auto-connection
function useFarcasterMiniAppAutoConnect() {
  const [isFarcasterMiniApp, setIsFarcasterMiniApp] = useState(false);
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    // Check if we're running in Farcaster Mini App
    const checkFarcasterMiniApp = () => {
      // Check for Farcaster Mini App context
      const isInFarcasterMiniApp = typeof window !== 'undefined' && 
        (window as any).farcaster?.miniApp || 
        (window as any).farcaster?.context ||
        // Check for Farcaster-specific user agent or other indicators
        navigator.userAgent.includes('Farcaster') ||
        // Check for Farcaster SDK availability
        typeof (window as any).farcaster !== 'undefined';
      setIsFarcasterMiniApp(!!isInFarcasterMiniApp);
    };
    
    checkFarcasterMiniApp();
    window.addEventListener('farcaster#initialized', checkFarcasterMiniApp);
    
    return () => {
      window.removeEventListener('farcaster#initialized', checkFarcasterMiniApp);
    };
  }, []);

  useEffect(() => {
    // Auto-connect if in Farcaster Mini App and not already connected
    if (isFarcasterMiniApp && !isConnected && connectors.length > 0) {
      // Try Farcaster Mini App connector first (index 0)
      connect({ connector: connectors[0] });
    }
  }, [isFarcasterMiniApp, isConnected, connect, connectors]);

  return isFarcasterMiniApp;
}

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    farcasterMiniApp(),
  ],
});

const queryClient = new QueryClient();

// Wrapper component that provides Farcaster Mini App auto-connection
function FarcasterMiniAppAutoConnect({ children }: { children: React.ReactNode }) {
  useFarcasterMiniAppAutoConnect();
  return <>{children}</>;
}

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <FarcasterMiniAppAutoConnect>
          {children}
        </FarcasterMiniAppAutoConnect>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
