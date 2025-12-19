/**
 * Admin Authentication Utilities
 * Provides secure authentication and authorization for admin endpoints
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Verify admin authentication
 * Supports both Bearer token and x-admin-key header
 */
export function verifyAdminAuth(req: NextRequest): { valid: boolean; error?: string } {
  const adminSecret = process.env.ADMIN_SECRET;
  
  if (!adminSecret) {
    return { valid: false, error: 'Admin secret not configured' };
  }

  // Try Bearer token first
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === adminSecret) {
      return { valid: true };
    }
  }

  // Try x-admin-key header (for compatibility with other admin routes)
  const adminKey = req.headers.get('x-admin-key');
  if (adminKey && adminKey === adminSecret) {
    return { valid: true };
  }

  return { valid: false, error: 'Invalid or missing authentication' };
}

/**
 * Get client IP address from NextRequest
 * Handles various proxy headers and Next.js deployment scenarios
 * 
 * Note: NextRequest doesn't have a direct 'ip' property in Next.js 15+
 * IP addresses must be extracted from headers
 */
export function getClientIP(req: NextRequest): string {
  // Try various headers that proxies/load balancers use (in order of preference)
  
  // x-forwarded-for: Standard proxy header (most common)
  // Can contain multiple IPs, take the first one
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // x-real-ip: Nginx and other reverse proxies
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // x-vercel-forwarded-for: Vercel-specific header
  const vercelForwardedFor = req.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // Fallback if no IP can be determined
  return 'unknown';
}

/**
 * Validate FID input
 */
export function validateFID(fid: any): { valid: boolean; value?: number; error?: string } {
  if (fid === null || fid === undefined) {
    return { valid: false, error: 'FID is required' };
  }

  const numFid = Number(fid);
  if (Number.isNaN(numFid) || !Number.isFinite(numFid)) {
    return { valid: false, error: 'Invalid FID format' };
  }

  if (numFid <= 0 || numFid > Number.MAX_SAFE_INTEGER) {
    return { valid: false, error: 'FID out of valid range' };
  }

  return { valid: true, value: Math.floor(numFid) };
}

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized.trim();
}

/**
 * Validate wallet address format
 */
export function validateWalletAddress(address: string | undefined): boolean {
  if (!address) {
    return true; // Optional field
  }

  // Ethereum address format: 0x followed by 40 hex characters
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Rate limiting helper (simple in-memory store)
 * For production, use Redis or a proper rate limiting service
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    // Create new record
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimit(maxAge: number = 3600000): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt + maxAge) {
      rateLimitStore.delete(key);
    }
  }
}

