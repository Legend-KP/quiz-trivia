import { NextRequest } from 'next/server';
import { ethers } from 'ethers';

export const runtime = 'nodejs';

// QT Token Contract Configuration
const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || '';
const QT_TOKEN_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

// Your wallet configuration (you'll need to provide these)
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';
const RPC_URL = process.env.RPC_URL || 'https://mainnet.base.org';

const QT_TOKEN_AMOUNT = ethers.parseUnits('10000', 18); // 10,000 QT tokens

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
    const qtTokenContract = new ethers.Contract(QT_TOKEN_ADDRESS, QT_TOKEN_ABI, wallet);

    // Check if wallet has enough QT tokens
    const walletBalance = await qtTokenContract.balanceOf(wallet.address);
    if (walletBalance < QT_TOKEN_AMOUNT) {
      return new Response(JSON.stringify({ error: 'Insufficient QT token balance' }), { 
        status: 400, 
        headers: { 'content-type': 'application/json' } 
      });
    }

    // Transfer QT tokens to user
    const tx = await qtTokenContract.transfer(userAddress, QT_TOKEN_AMOUNT);
    await tx.wait(); // Wait for transaction confirmation

    return new Response(JSON.stringify({ 
      success: true, 
      txHash: tx.hash,
      amount: '10000',
      message: '10,000 QT tokens transferred successfully!'
    }), { 
      headers: { 'content-type': 'application/json' } 
    });

  } catch (err: any) {
    console.error('QT token transfer error:', err);
    return new Response(JSON.stringify({ 
      error: err?.message || 'Failed to transfer QT tokens' 
    }), { 
      status: 500, 
      headers: { 'content-type': 'application/json' } 
    });
  }
}
