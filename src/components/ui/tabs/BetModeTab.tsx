"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useMiniApp } from '@neynar/react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import {
  formatQT,
  BET_MODE_MULTIPLIERS,
  MIN_BET,
  MAX_BET,
  calculatePayout,
} from '~/lib/betMode';

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

export function BetModeTab() {
  const { context } = useMiniApp();
  const [screen, setScreen] = useState<BetModeScreen>('entry');
  const [status, setStatus] = useState<BetModeStatus | null>(null);
  const [betAmount, setBetAmount] = useState<number>(MIN_BET);
  const [customBet, setCustomBet] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Game state
  const [currentGame, setCurrentGame] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
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
      const res = await fetch(`/api/bet-mode/status?fid=${fid}`);
      const data = await res.json();
      setStatus(data);

      // Determine screen based on status
      if (!data.window.isOpen) {
        setScreen('closed');
      } else if (data.activeGame) {
        setScreen('game');
        // Load game state
        await loadGameState(data.activeGame.gameId);
      } else {
        setScreen('entry');
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  }, [context?.user?.fid, loadGameState]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Timer for questions
  useEffect(() => {
    if (screen === 'game' && timeRemaining > 0 && !gameResult) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Timeout - auto-submit null answer
            handleAnswer(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [screen, timeRemaining, gameResult, handleAnswer]);

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
      setTimeRemaining(30);
      setScreen('game');
    } catch (err: any) {
      setError(err.message || 'Failed to start game');
    } finally {
      setLoading(false);
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
          setTimeRemaining(30);
          setSelectedAnswer(null);
          setCurrentGame((prev) => ({
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4">
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-white rounded-2xl p-6 shadow-2xl text-center">
            <div className="text-6xl mb-4">🎰</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Bet Mode</h2>
            <p className="text-gray-600 mb-6">⏸️ Currently Closed</p>

            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 mb-2">⏰ NEXT ROUND OPENS IN:</p>
              <p className="text-2xl font-bold text-gray-900">
                {status.window.timeUntilOpen || 'Calculating...'}
              </p>
            </div>

            <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">
                Opens: Wednesday 11:00 AM UTC
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Closes: Friday 11:00 AM UTC
              </p>
              <p className="text-sm text-gray-600">
                Draw: Friday 2:00 PM UTC
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Entry screen
  if (screen === 'entry') {
    const canBet = status.balance.availableBalance >= MIN_BET;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4">
        <div className="max-w-md mx-auto mt-10">
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">🎰</div>
              <h2 className="text-2xl font-bold text-gray-800">BET MODE</h2>
              <p className="text-sm text-green-600 font-semibold mt-1">🔴 LIVE NOW!</p>
              {status.window.timeUntilClose && (
                <p className="text-xs text-gray-600 mt-2">
                  Closes in: {status.window.timeUntilClose}
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

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">💰 Your Balance:</span>
                <span className="font-semibold">{formatQT(status.balance.qtBalance)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">🎟️ Your Tickets:</span>
                <span className="font-semibold">{status.lottery.userTickets.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">📊 Pool:</span>
                <span className="font-semibold">
                  {formatQT(status.weeklyPool?.lotteryPool || 0)}
                </span>
              </div>
            </div>

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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4">
        <div className="max-w-md mx-auto mt-10">
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-gray-700">
                Question {questionNum} of 10
              </span>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                {timeRemaining}s
              </div>
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

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{currentQuestion.text}</h3>
              <div className="space-y-3">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4">
        <div className="max-w-md mx-auto mt-20">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4">
        <div className="max-w-md mx-auto mt-20">
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4">
        <div className="max-w-md mx-auto mt-10">
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">🎰</div>
              <h2 className="text-2xl font-bold text-gray-800">THIS WEEK&apos;S LOTTERY</h2>
              {status.window.timeUntilSnapshot && (
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
                  <span className="font-semibold">{status.lottery.userTickets.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">📊 Your Share:</span>
                  <span className="font-semibold">{status.lottery.userShare}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">🎯 Win Probability:</span>
                  <span className="font-semibold">
                    {((parseFloat(status.lottery.userShare) / 100) * 31).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">🏆 PRIZE STRUCTURE:</h3>
              <div className="text-xs text-gray-700 space-y-1">
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

