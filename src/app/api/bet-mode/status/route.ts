import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  getCurrencyAccountsCollection,
  getBetModeGamesCollection,
  getWeeklyPoolsCollection,
  getLotteryTicketsCollection,
} from '~/lib/mongodb';
import { getBetModeWindowState, getCurrentWeekId, formatTimeRemaining } from '~/lib/betMode';

export const runtime = 'nodejs';

/**
 * Check user's on-chain QT token balance
 */
async function getWalletQTBalance(walletAddress: string): Promise<number> {
  try {
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const qtTokenAddress = process.env.QT_TOKEN_ADDRESS;

    if (!qtTokenAddress) {
      console.warn('QT_TOKEN_ADDRESS not configured');
      return 0;
    }

    if (!ethers.isAddress(walletAddress)) {
      return 0;
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // ERC20 token contract ABI (minimal - just balanceOf)
    const tokenAbi = ['function balanceOf(address owner) view returns (uint256)'];
    const tokenContract = new ethers.Contract(qtTokenAddress, tokenAbi, provider);

    const balance = await tokenContract.balanceOf(walletAddress);
    // QT token has 18 decimals
    return parseFloat(ethers.formatUnits(balance, 18));
  } catch (error) {
    console.error('Error fetching wallet QT balance:', error);
    return 0;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fidParam = searchParams.get('fid');
    const walletAddressParam = searchParams.get('walletAddress'); // Optional wallet address

    if (!fidParam) {
      return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
    }

    const fid = Number(fidParam);
    if (!Number.isFinite(fid)) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
    }

    // Get window state with error handling
    let windowState;
    try {
      windowState = getBetModeWindowState();
    } catch (windowError: any) {
      console.error('Error getting window state:', windowError);
      // Return default window state if there's an error
      const now = new Date();
      windowState = {
        isOpen: true,
        windowStart: now,
        windowEnd: new Date('2099-12-31'),
        snapshotTime: now,
        drawTime: now,
      };
    }

    const weekId = getCurrentWeekId();

    // Get user account with error handling
    let account = null;
    let qtBalance = 0;
    let qtLockedBalance = 0;
    let availableBalance = 0;
    let activeGame = null;
    let weeklyPool = null;
    let userTickets = null;
    let totalTickets = 0;

    try {
      const accounts = await getCurrencyAccountsCollection();
      account = await accounts.findOne({ fid });
      qtBalance = account?.qtBalance || 0;
      qtLockedBalance = account?.qtLockedBalance || 0;
      availableBalance = qtBalance - qtLockedBalance;
    } catch (dbError: any) {
      console.error('Error fetching currency account:', dbError);
      // Continue with default values
    }

    // Check on-chain wallet balance if wallet address is provided
    let walletBalance = 0;
    if (walletAddressParam && ethers.isAddress(walletAddressParam)) {
      try {
        walletBalance = await getWalletQTBalance(walletAddressParam);
      } catch (balanceError: any) {
        console.error('Error fetching wallet balance:', balanceError);
        // Continue with 0 balance
      }
    }

    // Get active game with error handling
    try {
      const games = await getBetModeGamesCollection();
      activeGame = await games.findOne({ fid, status: 'active' });
    } catch (gameError: any) {
      console.error('Error fetching active game:', gameError);
      // Continue with null
    }

    // Get weekly pool with error handling
    try {
      const pools = await getWeeklyPoolsCollection();
      weeklyPool = await pools.findOne({ weekId });
    } catch (poolError: any) {
      console.error('Error fetching weekly pool:', poolError);
      // Continue with null
    }

    // Get user tickets with error handling
    try {
      const tickets = await getLotteryTicketsCollection();
      userTickets = await tickets.findOne({ weekId, fid });

      // Calculate total tickets for this week
      const allTickets = await tickets.find({ weekId }).toArray();
      totalTickets = allTickets.reduce((sum, t) => sum + (t.totalTickets || 0), 0);
    } catch (ticketError: any) {
      console.error('Error fetching lottery tickets:', ticketError);
      // Continue with default values
    }

    const userTicketCount = userTickets?.totalTickets || 0;
    const userShare = totalTickets > 0 ? (userTicketCount / totalTickets) * 100 : 0;

    // Safely format dates
    const formatDate = (date: Date): string => {
      try {
        return date.toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    const formatTime = (ms?: number): string | null => {
      if (!ms) return null;
      try {
        return formatTimeRemaining(ms);
      } catch {
        return null;
      }
    };

    return NextResponse.json({
      window: {
        isOpen: windowState.isOpen,
        timeUntilOpen: formatTime(windowState.timeUntilOpen),
        timeUntilClose: formatTime(windowState.timeUntilClose),
        timeUntilSnapshot: formatTime(windowState.timeUntilSnapshot),
        timeUntilDraw: formatTime(windowState.timeUntilDraw),
        windowStart: formatDate(windowState.windowStart),
        windowEnd: formatDate(windowState.windowEnd),
        snapshotTime: formatDate(windowState.snapshotTime),
        drawTime: formatDate(windowState.drawTime),
      },
      balance: {
        qtBalance, // Internal balance (deposited to platform)
        qtLockedBalance,
        availableBalance,
        walletBalance, // On-chain wallet balance (if walletAddress provided)
        totalDeposited: account?.qtTotalDeposited || 0,
        totalWithdrawn: account?.qtTotalWithdrawn || 0,
        totalWagered: account?.qtTotalWagered || 0,
        totalWon: account?.qtTotalWon || 0,
      },
      activeGame: activeGame
        ? {
            gameId: activeGame.gameId,
            betAmount: activeGame.betAmount,
            currentQuestion: activeGame.currentQuestion,
            startedAt: activeGame.startedAt,
          }
        : null,
      weeklyPool: weeklyPool
        ? {
            weekId: weeklyPool.weekId,
            lotteryPool: weeklyPool.lotteryPool,
            toBurnAccumulated: weeklyPool.toBurnAccumulated,
            totalLosses: weeklyPool.totalLosses,
            snapshotTaken: weeklyPool.snapshotTaken,
            drawCompleted: weeklyPool.drawCompleted,
            burnCompleted: weeklyPool.burnCompleted,
            totalParticipants: weeklyPool.totalParticipants || 0,
            totalTickets: weeklyPool.totalTickets || 0,
          }
        : null,
      lottery: {
        userTickets: userTicketCount,
        totalTickets,
        userShare: userShare.toFixed(2),
        weekId,
        betBasedTickets: userTickets?.betBasedTickets || 0,
        gameBasedTickets: userTickets?.gameBasedTickets || 0,
        bonusTickets: userTickets?.bonusTickets || 0,
        consecutiveDays: userTickets?.consecutiveDays || 0,
        gamesPlayed: userTickets?.gamesPlayed || 0,
        totalWagered: userTickets?.totalWagered || 0,
      },
    });
  } catch (error: any) {
    console.error('Bet Mode status error:', error);
    console.error('Error stack:', error.stack);
    // Return a more detailed error message for debugging
    const errorMessage = error.message || 'Failed to get status';
    const errorDetails = process.env.NODE_ENV === 'development' ? error.stack : undefined;
    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails,
    }, { status: 500 });
  }
}

