import { NextRequest } from 'next/server';
import { ethers } from 'ethers';

export const runtime = 'nodejs';

// QT Reward Distributor Contract Configuration
const QT_DISTRIBUTOR_ADDRESS = process.env.QT_DISTRIBUTOR_ADDRESS || '';
const QT_DISTRIBUTOR_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "_qtTokenAddress", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "previousOwner", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "newOwner", "type": "address"}
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "QTRewardClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "QTTokensDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "QTTokensWithdrawn",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "REWARD_AMOUNT",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "canClaimToday",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimQTReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "userAddress", "type": "address"}],
    "name": "claimQTRewardForUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "depositQTTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getQTBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserClaimStatus",
    "outputs": [
      {"internalType": "uint256", "name": "lastClaim", "type": "uint256"},
      {"internalType": "bool", "name": "canClaim", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "lastClaimDate",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "qtToken",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "newOwner", "type": "address"}],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "withdrawQTTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Your wallet configuration for contract interactions
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

    if (!QT_DISTRIBUTOR_ADDRESS || !WALLET_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'QT distributor configuration missing' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

    // Create contract instance
    const qtDistributor = new ethers.Contract(QT_DISTRIBUTOR_ADDRESS, QT_DISTRIBUTOR_ABI, wallet);

    // Check if user can claim today
    const canClaim = await qtDistributor.canClaimToday(userAddress);
    if (!canClaim) {
      return new Response(JSON.stringify({ error: 'User has already claimed today' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Check contract balance
    const contractBalance = await qtDistributor.getQTBalance();
    const rewardAmount = ethers.parseUnits('10000', 18);
    
    if (contractBalance < rewardAmount) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient QT tokens in contract',
        balance: ethers.formatUnits(contractBalance, 18)
      }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Call claimQTRewardForUser function (this will transfer tokens to user)
    const tx = await qtDistributor.claimQTRewardForUser(userAddress);
    const receipt = await tx.wait(); // Wait for transaction confirmation

    return new Response(JSON.stringify({
      success: true,
      txHash: tx.hash,
      amount: '10000',
      message: '10,000 QT tokens claimed successfully!',
      blockNumber: receipt.blockNumber
    }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (err: any) {
    console.error('QT token transfer error:', err);
    
    // More detailed error messages
    let errorMessage = 'Failed to claim QT tokens';
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