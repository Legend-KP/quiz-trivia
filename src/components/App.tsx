"use client";

import { useEffect } from "react";
import { useMiniApp } from "@neynar/react";
import { HomeTab } from "~/components/ui/tabs";

// --- Types ---
export enum Tab {
  Home = "home",
  Actions = "actions",
  Context = "context",
  Wallet = "wallet",
}

export interface AppProps {
  title?: string;
}

/**
 * App component serves as the main container for the mini app interface.
 * 
 * This component orchestrates the overall mini app experience by:
 * - Managing tab navigation and state
 * - Handling Farcaster mini app initialization
 * - Coordinating wallet and context state
 * - Providing error handling and loading states
 * - Rendering the appropriate tab content based on user selection
 * 
 * The component integrates with the Neynar SDK for Farcaster functionality
 * and Wagmi for wallet management. It provides a complete mini app
 * experience with multiple tabs for different functionality areas.
 * 
 * Features:
 * - Tab-based navigation (Home, Actions, Context, Wallet)
 * - Farcaster mini app integration
 * - Wallet connection management
 * - Error handling and display
 * - Loading states for async operations
 * 
 * @param props - Component props
 * @param props.title - Optional title for the mini app (defaults to "Neynar Starter Kit")
 * 
 * @example
 * ```tsx
 * <App title="My Mini App" />
 * ```
 */
export default function App(
  { title }: AppProps = { title: "Quiz Trivia" }
) {
  // --- Hooks ---
  const {
    isSDKLoaded,  // checks if the SDK is loaded
    context,
    setInitialTab,
  } = useMiniApp();

  // --- Effects ---
  /**
   * Sets the initial tab to "home" when the SDK is loaded.
   * 
   * This effect ensures that users start on the home tab when they first
   * load the mini app. It only runs when the SDK is fully loaded to
   * prevent errors during initialization.
   */
  useEffect(() => {
    if (isSDKLoaded) {
      setInitialTab(Tab.Home);
    }
  }, [isSDKLoaded, setInitialTab]);

  // --- Early Returns ---
  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center h-screen relative">
        <div
          className="fixed inset-0 -z-10"
          style={{
            backgroundImage: "url('https://i.ibb.co/Y4spLcxx/Untitled-design-1.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="text-center">
          <div className="animate-spin rounded-full border-2 border-white/30 border-t-white h-8 w-8 mx-auto mb-4"></div>
          <p className="text-white">Loading SDK...</p>
        </div>
      </div>
    );
  }

  // --- Render ---
  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "url('https://i.ibb.co/Y4spLcxx/Untitled-design-1.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* User Profile in Top Right Corner */}
{context?.user && (
  <div className="absolute top-4 right-4 z-50">
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-white">
        {context.user.displayName || context.user.username}
      </span>
      {context.user.pfpUrl && (
        <img 
          src={context.user.pfpUrl} 
          alt="Profile" 
          className="w-8 h-8 rounded-full border-2 border-primary"
        />
      )}
    </div>
  </div>
)}


      {/* Main content - full width to allow edge-to-edge backgrounds */}
      <div className="py-2">
        {/* Tab content rendering */}
        <HomeTab />
      </div>
    </div>
  );
}

