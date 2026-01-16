/**
 * Server Initialization
 * 
 * Initialize contract event listeners when server starts.
 * Import this file in your main server entry point.
 */

import { startEventListeners } from './contract-listeners';

/**
 * Initialize Bet Mode contract event listeners
 * Call this when your server starts
 */
export function initializeBetModeServices() {
  const contractAddress = process.env.BET_MODE_VAULT_ADDRESS || process.env.NEXT_PUBLIC_BET_MODE_VAULT_ADDRESS;
  
  if (contractAddress) {
    try {
      startEventListeners();
    } catch (error) {
    }
  } else {
  }
}

// Auto-initialize if this file is imported
if (typeof window === 'undefined') {
  // Only run on server
  initializeBetModeServices();
}

