import { NextRequest } from 'next/server';
import { ethers } from 'ethers';

export const runtime = 'nodejs';

// QT Token Contract Configuration
const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || '';
const QT_TOKEN_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

// Your wallet configuration for sending tokens
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';
const RPC_URL = process.env.RPC_URL || 'https://mainnet.base.org';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userAddress, fid } = body;

    if (!userAddress || !fid) {
      return new Response(JSON.stringify({ error: 'User address and fid required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Validate the address
    if (!ethers.isAddress(userAddress)) {
      return new Response(JSON.stringify({ error: 'Invalid user address' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    if (!QT_TOKEN_ADDRESS || !WALLET_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'QT token configuration missing' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

    // Create contract instance
    const qtToken = new ethers.Contract(QT_TOKEN_ADDRESS, QT_TOKEN_ABI, wallet);

    // Check wallet balance
    const walletBalance = await qtToken.balanceOf(wallet.address);
    const rewardAmount = ethers.parseUnits('10000', 18); // 10,000 tokens with 18 decimals
   
    if (walletBalance < rewardAmount) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient QT tokens in wallet',
        balance: ethers.formatUnits(walletBalance, 18)
      }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Transfer tokens to user
    const tx = await qtToken.transfer(userAddress, rewardAmount);
    const receipt = await tx.wait(); // Wait for transaction confirmation

    return new Response(JSON.stringify({
      success: true,
      txHash: tx.hash,
      amount: '10000',
      message: '10,000 QT tokens sent successfully!',
      blockNumber: receipt.blockNumber
    }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (err: any) {
    console.error('QT token transfer error:', err);
    
    // More detailed error messages
    let errorMessage = 'Failed to transfer QT tokens';
    if (err.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient gas funds in wallet';
    } else if (err.code === 'NETWORK_ERROR') {
      errorMessage = 'Network error. Please try again';
    } else if (err.message) {
      errorMessage = err.message;
    }

    return new Response(JSON.stringify({
      error: errorMessage,
      details: err?.reason || err?.message
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}