/**
 * RPC Provider Utility with Fallback Support
 * 
 * Handles RPC rate limiting by providing fallback endpoints
 */

import { ethers } from 'ethers';

// RPC endpoints with fallback options
const RPC_ENDPOINTS = [
  process.env.ALCHEMY_BASE_RPC_URL, // If you have Alchemy API key
  process.env.BASE_RPC_URL, // Custom RPC from env
  'https://base.llamarpc.com', // LlamaRPC (free, no rate limit)
  'https://base-rpc.publicnode.com', // PublicNode (free)
  'https://1rpc.io/base', // 1RPC (free)
  'https://base.meowrpc.com', // MeowRPC (free)
  'https://mainnet.base.org', // Base official (rate limited)
].filter(Boolean) as string[];

/**
 * Create an RPC provider with automatic fallback
 */
export function createRPCProvider(): ethers.JsonRpcProvider {
  // Use the first available RPC URL
  const rpcUrl = RPC_ENDPOINTS[0] || 'https://base.llamarpc.com';
  
  // console.log('🌐 Using RPC:', rpcUrl.replace(/\/v2\/[^/]+/, '/v2/***')); // Hide API key in logs
  
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Create RPC provider with retry logic
 */
export async function createRPCProviderWithRetry(): Promise<ethers.JsonRpcProvider> {
  for (const rpcUrl of RPC_ENDPOINTS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      // Test connection
      await provider.getBlockNumber();
      // console.log('✅ Connected to RPC:', rpcUrl.replace(/\/v2\/[^/]+/, '/v2/***'));
      return provider;
    } catch (error) {
      // console.warn(`⚠️ RPC failed (${rpcUrl}):`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }
  
  // Fallback to last option
  // console.warn('⚠️ All RPC endpoints failed, using fallback');
  return new ethers.JsonRpcProvider('https://base.llamarpc.com');
}

/**
 * Get RPC URL from environment or use fallback
 */
export function getRPCUrl(): string {
  return RPC_ENDPOINTS[0] || 'https://base.llamarpc.com';
}

