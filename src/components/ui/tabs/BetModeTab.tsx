"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useMiniApp } from '@neynar/react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CheckCircle, XCircle } from 'lucide-react';
import { formatUnits, parseUnits } from 'viem';
import {
  formatQT,
  BET_MODE_MULTIPLIERS,
  MIN_BET,
  MAX_BET,
  calculatePayout,
} from '~/lib/betMode';

// ERC20 ABI for balanceOf and transfer
const ERC20_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

type BetModeScreen = 'entry' | 'game' | 'cash-out' | 'loss' | 'lottery' | 'closed';

interface BetModeStatus {
  window: {
    isOpen: boolean;
    timeUntilOpen?: string;
    timeUntilClose?: string;
    timeUntilSnapshot?: string;
    timeUntilDraw?: string;
  };
  balance: {
    qtBalance: number;
    qtLockedBalance: number;
    availableBalance: number;
    walletBalance?: number; // On-chain wallet balance
  };
  activeGame: {
    gameId: string;
    betAmount: number;
    currentQuestion: number;
  } | null;
  weeklyPool: {
    lotteryPool: number;
    toBurnAccumulated: number;
    totalLosses: number;
  } | null;
  lottery: {
    userTickets: number;
    totalTickets: number;
    userShare: string;
  };
}

interface BetModeTabProps {
  onExit?: () => void;
}

export function BetModeTab({ onExit }: BetModeTabProps = {}) {
  const { context } = useMiniApp();
  const { address, isConnected } = useAccount();
  
  // Get QT token address from environment (client-side safe)
  // Fallback to hardcoded address if env var not set
  const QT_TOKEN_ADDRESS = "0x541529ADB3f344128aa87917fd2926E7D240FB07";
  const qtTokenAddress = (process.env.NEXT_PUBLIC_QT_TOKEN_ADDRESS || QT_TOKEN_ADDRESS) as `0x${string}`;
  
  // Read QT token balance from wallet
  // Only enable if we have a valid address and token address
  const { data: walletBalanceRaw, error: balanceError } = useReadContract({
    address: qtTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!qtTokenAddress && isConnected && typeof address === 'string',
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });
  
  // Convert balance from wei to QT (18 decimals)
  // Handle errors gracefully
  let walletBalance = 0;
  try {
    if (walletBalanceRaw) {
      walletBalance = parseFloat(formatUnits(walletBalanceRaw, 18));
    }
  } catch (err) {
    console.warn('Error parsing wallet balance:', err);
    walletBalance = 0;
  }
  
  // Log balance errors for debugging (but don't crash)
  if (balanceError) {
    console.warn('Error reading wallet balance:', balanceError);
  }
  
  const [screen, setScreen] = useState<BetModeScreen>('entry');
  const [status, setStatus] = useState<BetModeStatus | null>(null);
  const [betAmount, setBetAmount] = useState<number>(MIN_BET);
  const [customBet, setCustomBet] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Deposit state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositing, setDepositing] = useState(false);
  const [platformWallet, setPlatformWallet] = useState<string | null>(null);
  
  // Wagmi hooks for deposit transaction
  const { writeContract, data: depositTxHash, isPending: isDepositPending } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  });

  // Game state
  const [currentGame, setCurrentGame] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  // const [timeRemaining, setTimeRemaining] = useState<number>(30); // Timer removed for testing
  const [gameResult, setGameResult] = useState<any>(null);

  const loadGameState = useCallback(async (_gameId: string) => {
    // In a real implementation, you'd fetch the current question
    // For now, we'll handle it through the answer flow
  }, []);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    const fid = context?.user?.fid;
    if (!fid) return;

    try {
      // Build status URL - wallet balance is now fetched client-side via Wagmi
      const res = await fetch(`/api/bet-mode/status?fid=${fid}`);
      const data = await res.json();
      
      // Merge wallet balance from Wagmi into status
      if (isConnected && address) {
        data.balance = {
          ...data.balance,
          walletBalance, // Add wallet balance from Wagmi
        };
      }
      
      setStatus(data);

      // Determine screen based on status
      // Bet Mode is always open (24/7), so skip closed check
      if (data.activeGame) {
        setScreen('game');
        // Load game state
        await loadGameState(data.activeGame.gameId);
      } else {
        setScreen('entry');
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  }, [
    context?.user?.fid,
    loadGameState,
    isConnected,
    address,
    walletBalance,
  ]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchStatus]);
  
  // Fetch platform wallet address
  useEffect(() => {
    fetch('/api/bet-mode/platform-wallet')
      .then(res => res.json())
      .then(data => {
        if (data.address) {
          setPlatformWallet(data.address);
        }
      })
      .catch(err => console.warn('Failed to fetch platform wallet:', err));
  }, []);
  
  // Handle deposit transaction confirmation
  useEffect(() => {
    if (isDepositConfirmed && depositTxHash) {
      handleDepositVerification(depositTxHash);
    }
  }, [isDepositConfirmed, depositTxHash]);
  
  const handleDepositVerification = async (txHash: string) => {
    const fid = context?.user?.fid;
    if (!fid) return;
    
    try {
      setDepositing(true);
      const res = await fetch('/api/bet-mode/deposit/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, txHash }),
      });
      
      const data = await res.json();
      if (data.success) {
        setError(null);
        setShowDepositModal(false);
        setDepositAmount('');
        await fetchStatus(); // Refresh balance
      } else {
        setError(data.error || 'Failed to verify deposit');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify deposit');
    } finally {
      setDepositing(false);
    }
  };
  
  const handleDeposit = async () => {
    if (!platformWallet || !address || !depositAmount) {
      setError('Please enter deposit amount');
      return;
    }
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Invalid deposit amount');
      return;
    }
    
    if (amount > walletBalance) {
      setError('Insufficient wallet balance');
      return;
    }
    
    try {
      setDepositing(true);
      setError(null);
      
      // Convert to wei (18 decimals)
      const amountWei = parseUnits(depositAmount, 18);
      
      // Send QT tokens to platform wallet
      writeContract({
        address: qtTokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [platformWallet as `0x${string}`, amountWei],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to initiate deposit');
      setDepositing(false);
    }
  };

  const handleAnswer = useCallback(async (answerIndex: number | null) => {
    if (!currentGame) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bet-mode/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGame.gameId,
          fid: context?.user?.fid,
          answerIndex: answerIndex ?? -1, // -1 for timeout
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process answer');
      }

      if (data.result === 'lost') {
        setGameResult({ type: 'loss', ...data });
        setScreen('loss');
      } else if (data.result === 'won') {
        setGameResult({ type: 'win', ...data });
        setScreen('cash-out');
      } else if (data.result === 'correct') {
        // Continue to next question
        if (data.nextQuestion) {
          setCurrentQuestion(data.nextQuestion);
          // setTimeRemaining(30); // Timer removed for testing
          setSelectedAnswer(null);
          setCurrentGame((prev: any) => ({
            ...prev,
            currentQuestion: data.nextQuestion.questionNumber,
          }));
        } else {
          // No next question - game complete (shouldn't happen, but handle it)
          setGameResult({ type: 'win', ...data });
          setScreen('cash-out');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process answer');
    } finally {
      setLoading(false);
    }
  }, [currentGame, context?.user?.fid]);

  // Timer removed for testing - can be re-enabled later
  // useEffect(() => {
  //   if (screen === 'game' && timeRemaining > 0 && !gameResult) {
  //     const timer = setInterval(() => {
  //       setTimeRemaining((prev) => {
  //         if (prev <= 1) {
  //           // Timeout - auto-submit null answer
  //           handleAnswer(null);
  //           return 0;
  //         }
  //         return prev - 1;
  //       }, 1000);
  //       return () => clearInterval(timer);
  //     }
  //   }
  // }, [screen, timeRemaining, gameResult, handleAnswer]);

  const handleStartGame = async () => {
    const fid = context?.user?.fid;
    if (!fid) {
      setError('Please connect your wallet');
      return;
    }

    const amount = customBet ? Number(customBet) : betAmount;

    if (amount < MIN_BET || amount > MAX_BET) {
      setError(`Bet must be between ${formatQT(MIN_BET)} and ${formatQT(MAX_BET)}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bet-mode/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, betAmount: amount }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start game');
      }

      setCurrentGame(data);
      setCurrentQuestion(data.question);
      // setTimeRemaining(30); // Timer removed for testing
      setScreen('game');
    } catch (err: any) {
      setError(err.message || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const handleCashOut = async () => {
    if (!currentGame) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bet-mode/cash-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGame.gameId,
          fid: context?.user?.fid,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cash out');
      }

      setGameResult({ type: 'cash-out', ...data });
      setScreen('cash-out');
    } catch (err: any) {
      setError(err.message || 'Failed to cash out');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // Continue to next question (already handled in handleAnswer)
    setSelectedAnswer(null);
  };

  const handlePlayAgain = () => {
    setScreen('entry');
    setCurrentGame(null);
    setCurrentQuestion(null);
    setGameResult(null);
    setSelectedAnswer(null);
    setError(null);
  };

  if (!status) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading Bet Mode...</p>
        </div>
      </div>
    );
  }

  // Closed screen
  if (screen === 'closed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto mt-20 mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-2xl text-center">
            {onExit && (
              <button
                onClick={onExit}
                className="mb-4 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium float-left"
              >
                ← Back
              </button>
            )}
            <div className="text-6xl mb-4">🎰</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Bet Mode</h2>
            <p className="text-gray-600 mb-6">🔴 Available 24/7</p>

            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 mb-2">⏰ NEXT LOTTERY DRAW:</p>
              <p className="text-2xl font-bold text-gray-900">
                {status.window.timeUntilDraw || 'Calculating...'}
              </p>
            </div>

            <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">
                🎮 Game Mode: Always Open (24/7)
              </p>
              <p className="text-sm text-gray-600 mb-2">
                🎰 Lottery Draw: Weekly (Friday 2:00 PM UTC)
              </p>
              <p className="text-sm text-gray-600">
                🔥 Token Burn: Weekly (Friday 2:30 PM UTC)
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Entry screen
  if (screen === 'entry') {
    // Show loading state if status hasn't loaded yet
    if (!status) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 flex items-center justify-center">
          <div className="text-white text-xl">Loading Bet Mode...</div>
        </div>
      );
    }
    
    // Check if user has enough balance: need 2x the bet amount (MIN_BALANCE_MULTIPLIER)
    const requiredBalance = betAmount * 2; // MIN_BALANCE_MULTIPLIER = 2
    const canBet = (status?.balance?.availableBalance || 0) >= requiredBalance;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto mt-10 mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            {onExit && (
              <button
                onClick={onExit}
                className="mb-4 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
              >
                ← Back
              </button>
            )}
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">🎰</div>
              <h2 className="text-2xl font-bold text-gray-800">BET MODE</h2>
              <p className="text-sm text-green-600 font-semibold mt-1">🔴 LIVE 24/7!</p>
              {status.window.timeUntilDraw && (
                <p className="text-xs text-gray-600 mt-2">
                  Next lottery draw: {status.window.timeUntilDraw}
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose your bet:
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[10000, 50000, 100000, 500000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      setBetAmount(amount);
                      setCustomBet('');
                    }}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      betAmount === amount && !customBet
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold">{formatQT(amount)}</div>
                    <div className="text-xs text-gray-600">
                      Win up to {formatQT(amount * BET_MODE_MULTIPLIERS[10])}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <input
                  type="number"
                  placeholder="Custom amount"
                  value={customBet}
                  onChange={(e) => {
                    setCustomBet(e.target.value);
                    if (e.target.value) setBetAmount(Number(e.target.value));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  min={MIN_BET}
                  max={MAX_BET}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Min: {formatQT(MIN_BET)} | Max: {formatQT(MAX_BET)}
                </p>
              </div>
            </div>

            {status && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">💰 Your Balance:</span>
                  <span className="font-semibold">{formatQT(status.balance?.availableBalance || 0)}</span>
                </div>
                {isConnected && address && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">💼 Wallet Balance:</span>
                    <span className="font-semibold">{formatQT(walletBalance)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">🎟️ Your Tickets:</span>
                  <span className="font-semibold">{(status.lottery?.userTickets || 0).toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">📊 Pool:</span>
                  <span className="font-semibold">
                    {formatQT(status.weeklyPool?.lotteryPool || 0)}
                  </span>
                </div>
              </div>
            )}

            {!canBet && walletBalance > 0 && isConnected && (
              <button
                onClick={() => setShowDepositModal(true)}
                className="w-full mb-3 py-3 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                💰 Deposit QT Tokens
              </button>
            )}
            
            {!canBet && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 text-center">
                  ⚠️ Minimum requirement: {formatQT(requiredBalance)} (2x your bet amount)
                </p>
                <p className="text-xs text-yellow-700 text-center mt-1">
                  Your balance: {formatQT(status?.balance?.availableBalance || 0)}
                </p>
              </div>
            )}
            
            <button
              onClick={handleStartGame}
              disabled={loading || !canBet}
              className={`w-full py-3 px-6 rounded-xl font-bold text-white transition-all ${
                loading || !canBet
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700'
              }`}
            >
              {loading ? 'Starting...' : canBet ? 'START GAME' : 'INSUFFICIENT BALANCE'}
            </button>

            <button
              onClick={() => setScreen('lottery')}
              className="w-full mt-3 py-2 px-4 rounded-lg bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition-all"
            >
              View Lottery Info
            </button>
            
            {/* Deposit Modal */}
            {showDepositModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full my-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4">Deposit QT Tokens</h3>
                  
                  {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount to Deposit:
                    </label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      disabled={depositing || isDepositPending || isDepositConfirming}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Wallet Balance: {formatQT(walletBalance)}
                    </p>
                  </div>
                  
                  {platformWallet && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Platform Wallet:</p>
                      <p className="text-xs font-mono break-all">{platformWallet}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowDepositModal(false);
                        setDepositAmount('');
                        setError(null);
                      }}
                      className="flex-1 py-2 px-4 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-all"
                      disabled={depositing || isDepositPending || isDepositConfirming}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeposit}
                      disabled={depositing || isDepositPending || isDepositConfirming || !depositAmount}
                      className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {depositing || isDepositPending || isDepositConfirming
                        ? 'Processing...'
                        : 'Deposit'}
                    </button>
                  </div>
                  
                  {(isDepositPending || isDepositConfirming) && depositTxHash && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700">
                        Transaction: {depositTxHash.slice(0, 10)}...{depositTxHash.slice(-8)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {isDepositPending ? 'Waiting for confirmation...' : 'Verifying deposit...'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  if (screen === 'game' && currentQuestion) {
    const questionNum = currentQuestion.questionNumber || 1;
    const currentPayout = currentGame ? calculatePayout(currentGame.betAmount, questionNum) : 0;
    const nextPayout =
      questionNum < 10
        ? currentGame
          ? calculatePayout(currentGame.betAmount, questionNum + 1)
          : 0
        : 0;
    const canCashOut = questionNum >= 5;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto mt-10 mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-gray-700">
                Question {questionNum} of 10
              </span>
              {/* Timer removed for testing */}
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-6 border-2 border-yellow-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-800 mb-1">
                  💰 {formatQT(currentPayout)}
                </div>
                <div className="text-sm text-yellow-700">Current Value</div>
                {nextPayout > 0 && (
                  <div className="text-xs text-yellow-600 mt-1">
                    Next: {formatQT(nextPayout)}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6 max-h-[400px] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{currentQuestion.text}</h3>
              <div className="space-y-3 pr-2">
                {currentQuestion.options.map((option: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedAnswer(index);
                      handleAnswer(index);
                    }}
                    disabled={loading || selectedAnswer !== null}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedAnswer === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${loading || selectedAnswer !== null ? 'opacity-50' : ''}`}
                  >
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + index)})</span>
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {canCashOut && (
              <div className="flex gap-3">
                <button
                  onClick={handleCashOut}
                  disabled={loading}
                  className="flex-1 py-3 px-6 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-all disabled:opacity-50"
                >
                  💰 CASH OUT {formatQT(currentPayout)}
                </button>
                {questionNum < 10 && (
                  <button
                    onClick={handleContinue}
                    disabled={loading || selectedAnswer === null}
                    className="flex-1 py-3 px-6 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    CONTINUE →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Cash out screen
  if (screen === 'cash-out' && gameResult) {
    const betAmount = currentGame?.betAmount || gameResult.betAmount || 0;
    const profit = gameResult.profit || (gameResult.payout - betAmount);
    const profitPercent = betAmount > 0 ? ((profit / betAmount) * 100).toFixed(0) : '0';

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto mt-20 mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-2xl text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-gray-800">
              {gameResult.type === 'cash-out' ? '✅ CASHED OUT!' : '🎉 YOU WON!'}
            </h2>
            <p className="text-gray-600 mb-6">Smart move! You secured:</p>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-6 border-2 border-green-200">
              <div className="text-3xl font-bold text-green-800 mb-2">
                💰 {formatQT(gameResult.payout)}
              </div>
              <div className="text-lg text-green-700">
                Profit: +{formatQT(profit)} ({profitPercent}%)
              </div>
              <div className="text-sm text-gray-600 mt-2">
                🎟️ Tickets earned: {gameResult.ticketsEarned || 0}
              </div>
            </div>

            <button
              onClick={handlePlayAgain}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold hover:from-green-600 hover:to-blue-700 transition-all"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loss screen
  if (screen === 'loss' && gameResult) {
    const betAmount = currentGame?.betAmount || 0;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto mt-20 mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-2xl text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-gray-800">❌ WRONG ANSWER</h2>

            {gameResult.explanation && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                <p className="text-sm text-blue-800">{gameResult.explanation}</p>
              </div>
            )}

            <div className="bg-red-50 rounded-lg p-4 mb-6 border-2 border-red-200">
              <div className="text-xl font-bold text-red-800 mb-2">
                Lost: {formatQT(betAmount)}
              </div>
              <div className="text-sm text-red-700">
                But your loss contributes to:
                <div className="mt-2 text-left">
                  <div>• {formatQT(gameResult.lossDistribution?.toBurn || 0)} burned 🔥</div>
                  <div>• {formatQT(gameResult.lossDistribution?.toLottery || 0)} to lottery 🎰</div>
                  <div>• {formatQT(gameResult.lossDistribution?.toPlatform || 0)} to platform 💼</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-gray-700">
                🎟️ You earned {gameResult.ticketsEarned || 0} lottery tickets!
              </div>
            </div>

            <button
              onClick={handlePlayAgain}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-white font-bold hover:from-red-600 hover:to-orange-700 transition-all"
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lottery screen
  if (screen === 'lottery') {
    // Show loading state if status hasn't loaded yet
    if (!status) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 flex items-center justify-center">
          <div className="text-white text-xl">Loading Bet Mode...</div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto mt-10 mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">🎰</div>
              <h2 className="text-2xl font-bold text-gray-800">THIS WEEK&apos;S LOTTERY</h2>
              {status?.window?.timeUntilSnapshot && (
                <p className="text-sm text-gray-600 mt-2">
                  Snapshot in: {status.window.timeUntilSnapshot}
                </p>
              )}
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6 border-2 border-purple-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-800 mb-1">
                  💰 {formatQT(status.weeklyPool?.lotteryPool || 0)}
                </div>
                <div className="text-sm text-purple-700">Current Pool</div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">YOUR STATUS:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">🎟️ Your Tickets:</span>
                  <span className="font-semibold">{(status.lottery?.userTickets || 0).toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">📊 Your Share:</span>
                  <span className="font-semibold">{status.lottery?.userShare || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">🎯 Win Probability:</span>
                  <span className="font-semibold">
                    {((parseFloat(String(status.lottery?.userShare || 0)) / 100) * 31).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-[300px] overflow-y-auto">
              <h3 className="font-semibold text-gray-800 mb-2">🏆 PRIZE STRUCTURE:</h3>
              <div className="text-xs text-gray-700 space-y-1 pr-2">
                <div>Tier 1: ~{formatQT((status.weeklyPool?.lotteryPool || 0) * 0.25)} (25%)</div>
                <div>Tier 2: ~{formatQT((status.weeklyPool?.lotteryPool || 0) * 0.1)} each (10%)</div>
                <div>Tier 3: ~{formatQT((status.weeklyPool?.lotteryPool || 0) * 0.06)} each (6%)</div>
                <div>Tier 4: ~{formatQT((status.weeklyPool?.lotteryPool || 0) * 0.03)} each (3%)</div>
                <div>Tier 5: ~{formatQT((status.weeklyPool?.lotteryPool || 0) * 0.012)} each (1.2%)</div>
                <div>Tier 6: ~{formatQT((status.weeklyPool?.lotteryPool || 0) * 0.01)} each (1%)</div>
              </div>
            </div>

            <button
              onClick={() => setScreen('entry')}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold hover:from-purple-600 hover:to-pink-700 transition-all"
            >
              PLAY BET MODE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

