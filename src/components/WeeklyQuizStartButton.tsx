import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { base } from 'wagmi/chains';
import { formatUnits } from 'viem';
import { QuizState, currentWeeklyQuiz, getNextQuizStartTime, MIN_REQUIRED_QT, formatTokens } from '~/lib/weeklyQuiz';
import { useCountdown } from '~/hooks/useWeeklyQuiz';

// ERC-20 ABI for reading balance
const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// QT Token Address on Base Network
const QT_TOKEN_ADDRESS = '0x361faAea711B20caF59726e5f478D745C187cB07' as `0x${string}`;

interface WeeklyQuizStartButtonProps {
  quizState: QuizState;
  onQuizStart: () => void;
  userCompleted?: boolean;
  className?: string;
}

const WeeklyQuizStartButton: React.FC<WeeklyQuizStartButtonProps> = ({
  quizState,
  onQuizStart,
  userCompleted = false,
  className = "",
}) => {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [_backendVerified, setBackendVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Get wallet connection info
  const { address, isConnected, chainId } = useAccount();
  const isOnBaseNetwork = chainId === base.id;

  // Read token decimals
  const { data: decimalsData } = useReadContract({
    address: QT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: base.id,
  });

  // Read token symbol
  const { data: symbolData } = useReadContract({
    address: QT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'symbol',
    chainId: base.id,
  });

  // Read wallet balance
  const { 
    data: walletBalanceRaw, 
    error: balanceError, 
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: QT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: base.id,
    query: {
      enabled: Boolean(
        address && 
        QT_TOKEN_ADDRESS && 
        isConnected && 
        isOnBaseNetwork
      ),
      refetchInterval: 10000, // Refetch every 10 seconds
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 5000,
    },
  });

  // Calculate balance
  const decimals = decimalsData || 18;
  const walletBalance = walletBalanceRaw 
    ? parseFloat(formatUnits(walletBalanceRaw, decimals))
    : 0;

  const hasEnoughQT = walletBalance >= MIN_REQUIRED_QT;

  // Log balance status for debugging
  useEffect(() => {
    if (address && isConnected) {
      console.log('🔍 QT Balance Check:', {
        address,
        chainId,
        isOnBaseNetwork,
        expectedChainId: base.id,
        tokenAddress: QT_TOKEN_ADDRESS,
        tokenSymbol: symbolData,
        rawBalance: walletBalanceRaw?.toString(),
        formattedBalance: walletBalance,
        minRequired: MIN_REQUIRED_QT,
        hasEnough: hasEnoughQT,
        isLoading: isBalanceLoading,
        hasError: !!balanceError,
      });

      if (balanceError) {
        console.error('❌ Balance Read Error:', balanceError);
      }
    }
  }, [address, isConnected, chainId, isOnBaseNetwork, walletBalanceRaw, walletBalance, hasEnoughQT, isBalanceLoading, balanceError, symbolData]);

  // Backend verification
  const verifyBalanceBackend = async () => {
    if (!address) return false;
    
    setIsVerifying(true);
    try {
      const response = await fetch(`/api/verify-qt-balance?address=${address}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Backend verification failed:', data.error);
        throw new Error(data.error || 'Backend verification failed');
      }

      console.log('✅ Backend verification:', data);
      setBackendVerified(data.hasEnoughTokens);
      return data.hasEnoughTokens;
    } catch (error: any) {
      console.error('❌ Backend verification error:', error);
      setError(`Backend verification failed: ${error.message}`);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Get correct countdown based on quiz state
  const nextQuizTime = React.useMemo(() => {
    if (quizState === 'live') {
      return new Date(currentWeeklyQuiz.endTime);
    } else if (quizState === 'ended') {
      return getNextQuizStartTime();
    } else {
      return new Date(currentWeeklyQuiz.startTime);
    }
  }, [quizState]);
  
  const countdown = useCountdown(nextQuizTime);

  const handleStartQuiz = () => {
    setError(null);
    setIsDetailsModalOpen(true);
  };

  const handleStartQuizConfirmed = async () => {
    if (quizState !== 'live' || userCompleted) {
      setIsDetailsModalOpen(false);
      return;
    }

    // Clear any previous errors
    setError(null);
    setIsStarting(true);

    try {
      // 1. Check wallet connection
      if (!isConnected || !address) {
        throw new Error('❌ Wallet Not Connected\n\nPlease connect your Farcaster wallet to participate in the Weekly Quiz.');
      }

      // 2. Check network
      if (!isOnBaseNetwork) {
        throw new Error(`❌ Wrong Network\n\nPlease switch to Base network (Chain ID: ${base.id}).\n\nCurrent chain: ${chainId}`);
      }

      // 3. Check if balance is still loading
      if (isBalanceLoading) {
        throw new Error('⏳ Loading Balance\n\nPlease wait while we verify your QT token balance...');
      }

      // 4. Check for balance read errors
      if (balanceError) {
        throw new Error(`❌ Balance Read Error\n\n${balanceError.message}\n\n💡 Try refreshing the page or reconnecting your wallet.`);
      }

      // 5. Check QT token balance
      if (!hasEnoughQT) {
        const shortfall = MIN_REQUIRED_QT - walletBalance;
        throw new Error(
          `❌ Insufficient QT Tokens\n\n` +
          `📊 Required: ${formatTokens(MIN_REQUIRED_QT)} QT\n` +
          `💰 Your Balance: ${formatTokens(walletBalance)} QT\n` +
          `📉 You Need: ${formatTokens(shortfall)} QT more\n\n` +
          `💡 Please add more QT tokens to your wallet to participate in the Weekly Quiz.`
        );
      }

      // 6. Backend verification (double-check)
      console.log('🔐 Performing backend verification...');
      const backendOK = await verifyBalanceBackend();
      
      if (!backendOK) {
        throw new Error(
          `❌ Backend Verification Failed\n\n` +
          `Your balance could not be verified on the server. ` +
          `Please try refreshing the page or contact support.`
        );
      }

      console.log('✅ All checks passed - starting quiz');

      // 7. Call the onQuizStart callback
      await onQuizStart();
      
      // If successful, close modal
      setIsDetailsModalOpen(false);

    } catch (err: any) {
      console.error('❌ Quiz start error:', err);
      setError(err.message || 'Failed to start quiz. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const getButtonText = () => {
    if (userCompleted) {
      return 'Weekly Quiz Challenge ✓';
    }
    
    switch (quizState) {
      case 'upcoming':
        return 'Weekly Quiz Challenge 📅';
      case 'live':
        return 'Weekly Quiz Challenge 🔴 LIVE';
      case 'ended':
        return 'Weekly Quiz Challenge ⏹️';
      default:
        return 'Weekly Quiz Challenge';
    }
  };

  const getButtonGradient = () => {
    if (userCompleted) {
      return 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700';
    }
    
    switch (quizState) {
      case 'upcoming':
        return 'from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700';
      case 'live':
        return 'from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700';
      case 'ended':
        return 'from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600';
      default:
        return 'from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700';
    }
  };

  const getStateInfo = () => {
    if (userCompleted) {
      return {
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        icon: '✅',
        title: 'Completed',
        message: 'Next quiz in'
      };
    }

    switch (quizState) {
      case 'upcoming':
        return {
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-800',
          icon: '⏰',
          title: 'Next Quiz',
          message: 'Starts in'
        };
      case 'live':
        return {
          bgColor: 'bg-red-50',
          textColor: 'text-red-800',
          icon: '🔴',
          title: 'Live Now!',
          message: 'Ends in'
        };
      case 'ended':
        return {
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-800',
          icon: '⏹️',
          title: 'Quiz Ended',
          message: 'Next quiz in'
        };
      default:
        return {
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-800',
          icon: '⏰',
          title: 'Next Quiz',
          message: 'Starts in'
        };
    }
  };

  const canStartQuiz = quizState === 'live' && !userCompleted && isConnected && isOnBaseNetwork && hasEnoughQT;
  const stateInfo = getStateInfo();

  // Determine why user can't participate
  const getWhyCantParticipate = () => {
    if (userCompleted) {
      return {
        title: 'Already Completed',
        message: 'You have already completed this quiz. Each user can only take the quiz once per week.',
        icon: '✅',
      };
    }
    
    if (quizState !== 'live') {
      if (quizState === 'upcoming') {
        return {
          title: 'Quiz Not Started',
          message: 'This quiz hasn&apos;t started yet. Please wait for the quiz to go live.',
          icon: '⏰',
        };
      }
      if (quizState === 'ended') {
        return {
          title: 'Quiz Ended',
          message: 'This quiz has ended. Please wait for the next quiz to start.',
          icon: '⏹️',
        };
      }
    }

    if (quizState === 'live') {
      if (!isConnected) {
        return {
          title: 'Wallet Not Connected',
          message: 'Please connect your Farcaster wallet to participate in the Weekly Quiz.',
          icon: '🔗',
        };
      }

      if (!isOnBaseNetwork) {
        return {
          title: 'Wrong Network',
          message: `Please switch to Base network (Chain ID: ${base.id}). Current chain: ${chainId}`,
          icon: '🌐',
        };
      }

      if (isBalanceLoading) {
        return {
          title: 'Loading Balance',
          message: 'Please wait while we verify your QT token balance...',
          icon: '⏳',
        };
      }

      if (balanceError) {
        return {
          title: 'Balance Read Error',
          message: `Unable to read your QT token balance. ${balanceError.message}`,
          icon: '⚠️',
        };
      }

      if (!hasEnoughQT) {
        return {
          title: 'Insufficient QT Tokens',
          message: `You need ${formatTokens(MIN_REQUIRED_QT)} QT to participate.\n\nYour Balance: ${formatTokens(walletBalance)} QT\nYou Need: ${formatTokens(MIN_REQUIRED_QT - walletBalance)} QT more`,
          icon: '💰',
        };
      }
    }

    return null;
  };

  const whyCantParticipate = getWhyCantParticipate();

  return (
    <>
      {quizState === 'live' && !userCompleted && (
        <style>{`
          @keyframes glow-pulse {
            0%, 100% {
              box-shadow: 0 0 30px rgba(135, 206, 250, 0.8), 0 0 60px rgba(135, 206, 250, 0.6);
            }
            50% {
              box-shadow: 0 0 40px rgba(135, 206, 250, 1), 0 0 80px rgba(135, 206, 250, 0.8);
            }
          }
        `}</style>
      )}
      <button
        onClick={handleStartQuiz}
        className={`w-full bg-gradient-to-r ${getButtonGradient()} text-white font-bold py-6 px-10 rounded-xl text-2xl transition-all duration-200 shadow-2xl ${className} ${
          quizState === 'live' ? 'transform hover:scale-105' : ''
        }`}
        style={quizState === 'live' ? { animation: 'glow-pulse 2s ease-in-out infinite' } : {}}
      >
        {getButtonText()}
        {quizState === 'live' && <span className="ml-2 animate-pulse">🚀</span>}
      </button>

      {isDetailsModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsDetailsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl p-5 max-w-sm w-full mx-4 relative shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsDetailsModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl font-bold z-10"
            >
              ×
            </button>

            <div className="flex-shrink-0 pb-3 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 pr-6">
                📅 Weekly Quiz Challenge
              </h3>
            </div>

            <div 
              className="flex-1 overflow-y-auto mt-4 space-y-3"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 transparent'
              }}
            >
              <div className="space-y-3 pb-2">
                {/* Quiz Info */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="font-semibold text-blue-800 mb-1.5 text-sm">
                    🧩 Weekly Quiz Challenge
                  </div>
                  <p className="text-xs text-blue-700 mb-1">
                    • 10 questions with 45 seconds per question
                  </p>
                  <p className="text-xs text-blue-700">
                    • Runs every Tuesday & Friday, 6 PM – 6 AM UTC
                  </p>
                </div>

                {/* Rewards */}
                <div className="bg-yellow-50 rounded-lg p-3">
                  <div className="font-semibold text-yellow-800 mb-1.5 text-sm">
                    🏆 Rewards — 15M $QT Tokens
                  </div>
                  <p className="text-xs text-yellow-700 mb-1">🥇 1st Place: 4M $QT</p>
                  <p className="text-xs text-yellow-700 mb-1">🥈 2nd Place: 2.5M $QT</p>
                  <p className="text-xs text-yellow-700 mb-1">🥉 3rd Place: 1.5M $QT</p>
                  <p className="text-xs text-yellow-700">4th-10th: 1M $QT each</p>
                </div>

                {/* Balance Status - Show when connected */}
                {isConnected && (
                  <div className={`rounded-lg p-3 ${hasEnoughQT ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <div className={`font-semibold mb-1.5 text-sm ${hasEnoughQT ? 'text-green-800' : 'text-orange-800'}`}>
                      {hasEnoughQT ? '✅ QT Balance Verified' : '⚠️ QT Balance Check'}
                    </div>
                    {isBalanceLoading ? (
                      <p className="text-xs text-gray-600">⏳ Checking balance...</p>
                    ) : balanceError ? (
                      <p className="text-xs text-red-600">❌ Error reading balance: {balanceError.message}</p>
                    ) : (
                      <>
                        <p className="text-xs text-gray-700 mb-1">
                          Your Balance: <span className="font-bold">{formatTokens(walletBalance)} QT</span>
                        </p>
                        <p className="text-xs text-gray-700">
                          Required: <span className="font-bold">{formatTokens(MIN_REQUIRED_QT)} QT</span>
                        </p>
                        {!hasEnoughQT && (
                          <p className="text-xs text-orange-700 mt-1">
                            Need: <span className="font-bold">{formatTokens(MIN_REQUIRED_QT - walletBalance)} QT more</span>
                          </p>
                        )}
                      </>
                    )}
                    {symbolData && (
                      <p className="text-xs text-gray-500 mt-1">Token: {symbolData}</p>
                    )}
                    <button
                      onClick={() => refetchBalance()}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      🔄 Refresh Balance
                    </button>
                  </div>
                )}

                {/* State Info */}
                <div className={`${stateInfo.bgColor} rounded-lg p-3`}>
                  <div className={`font-semibold ${stateInfo.textColor} mb-1.5 text-sm`}>
                    {stateInfo.icon} {stateInfo.title}
                  </div>
                  {quizState === 'ended' && !userCompleted && (
                    <p className={`text-xs ${stateInfo.textColor} mb-1.5`}>
                      This quiz has ended. Check the leaderboard to see results!
                    </p>
                  )}
                  {userCompleted && (
                    <p className={`text-xs ${stateInfo.textColor}`}>
                      You&apos;ve already completed this quiz!
                    </p>
                  )}
                  {!userCompleted && quizState !== 'ended' && (
                    <p className={`text-xs font-medium ${stateInfo.textColor}`}>
                      {stateInfo.message}: {countdown}
                    </p>
                  )}
                </div>

                {/* Why Can't Participate */}
                {whyCantParticipate && !canStartQuiz && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="font-semibold text-red-800 mb-1.5 text-sm flex items-center justify-center gap-2">
                      <span>{whyCantParticipate.icon}</span>
                      <span>{whyCantParticipate.title}</span>
                    </div>
                    <p className="text-xs text-red-700 text-center whitespace-pre-line">
                      {whyCantParticipate.message}
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                    <div className="font-semibold text-red-800 mb-1.5 text-sm">
                      ⚠️ Error
                    </div>
                    <p className="text-xs text-red-700 whitespace-pre-line">
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 pt-3 mt-3 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 font-semibold text-sm rounded-lg hover:bg-gray-300 transition"
              >
                Close
              </button>
              
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  window.location.href = '/leaderboard?mode=CLASSIC';
                }}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-sm rounded-lg hover:from-blue-600 hover:to-purple-700 transition"
              >
                📊 Leaderboard
              </button>
              
              {canStartQuiz && (
                <button
                  onClick={handleStartQuizConfirmed}
                  disabled={isStarting || isVerifying}
                  className={`flex-1 px-3 py-2 text-white font-bold text-sm rounded-lg transition ${
                    isStarting || isVerifying
                      ? 'bg-gray-400 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700'
                  }`}
                >
                  {isStarting ? '🔄 Starting...' : isVerifying ? '🔐 Verifying...' : '🚀 Start Quiz'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WeeklyQuizStartButton;
