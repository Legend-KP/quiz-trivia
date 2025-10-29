import React, { useState, useEffect } from 'react';
import { QuizMode, TransactionState, startQuizTransactionWithWagmi, formatWalletError, WalletError } from '~/lib/wallet';
import { useConfig } from 'wagmi';
import TransactionModal from './TransactionModal';
import { QuizState, currentWeeklyQuiz, getNextQuizStartTime } from '~/lib/weeklyQuiz';
import { useCountdown } from '~/hooks/useWeeklyQuiz';

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
  className = ""
}) => {
  const [transactionState, setTransactionState] = useState<TransactionState>(TransactionState.IDLE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [transactionHash, setTransactionHash] = useState<string>('');
  const config = useConfig();
  
  // Get correct countdown based on quiz state
  const nextQuizTime = React.useMemo(() => {
    if (quizState === 'live') {
      // Show time until quiz ends
      return new Date(currentWeeklyQuiz.endTime);
    } else if (quizState === 'ended') {
      // Show time until next quiz starts (Tuesday or Friday)
      return getNextQuizStartTime();
    } else {
      // Upcoming: show time until this quiz starts
      return new Date(currentWeeklyQuiz.startTime);
    }
  }, [quizState]);
  
  const countdown = useCountdown(nextQuizTime);

  // Handle Farcaster frame transaction confirmations
  useEffect(() => {
    const handleFrameTransaction = (event: MessageEvent) => {
      const data = event.data;
      if (typeof data === "object" && data !== null && "type" in data && data.type === "farcaster:frame-transaction") {
        console.log("✅ Frame Wallet transaction confirmed");
        setTransactionState(TransactionState.SUCCESS);
        
        // Wait a moment to show success state
        setTimeout(() => {
          setIsModalOpen(false);
          setTransactionState(TransactionState.IDLE);
          // Start the actual quiz
          onQuizStart();
        }, 2000);
      }
    };

    window.addEventListener("message", handleFrameTransaction);
    return () => window.removeEventListener("message", handleFrameTransaction);
  }, [onQuizStart]);

  const handleStartQuiz = () => {
    // Always show details modal first
    setIsDetailsModalOpen(true);
  };

  const handleStartQuizConfirmed = async () => {
    if (quizState !== 'live' || userCompleted) {
      setIsDetailsModalOpen(false);
      return; // Don't start if not live or already completed
    }

    setIsDetailsModalOpen(false);

    try {
      setError('');
      setIsModalOpen(true);
      setTransactionState(TransactionState.CONNECTING);
      
      // Start the quiz with signature-based authentication (NO PAYMENT REQUIRED)
      const txHash = await startQuizTransactionWithWagmi(QuizMode.CLASSIC, config, (state) => {
        setTransactionState(state);
      });
      
      setTransactionHash(txHash);
      
      // Wait a moment to show success state
      setTimeout(() => {
        setIsModalOpen(false);
        setTransactionState(TransactionState.IDLE);
        // Start the actual quiz
        onQuizStart();
      }, 2000);
      
    } catch (err) {
      console.error('Quiz start error:', err);
      
      if (err instanceof WalletError) {
        setError(formatWalletError(err));
      } else {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
      
      setTransactionState(TransactionState.ERROR);
    }
  };

  const handleCloseModal = () => {
    if (transactionState === TransactionState.SUCCESS) {
      // Don't close on success, let the timeout handle it
      return;
    }
    
    setIsModalOpen(false);
    setTransactionState(TransactionState.IDLE);
    setError('');
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

  const isDisabled = isModalOpen;
  const canStartQuiz = quizState === 'live' && !userCompleted;
  const stateInfo = getStateInfo();

  return (
    <>
      {/* Smooth glow animation for live quiz state */}
      {quizState === 'live' && !userCompleted && (
        <style>{`
          @keyframes glow-pulse {
            0%, 100% {
              box-shadow: 0 0 30px rgba(135, 206, 250, 0.8), 0 0 60px rgba(135, 206, 250, 0.6), 0 0 90px rgba(135, 206, 250, 0.4), 0 0 120px rgba(255, 255, 255, 0.3), 0 0 150px rgba(255, 255, 255, 0.2);
            }
            50% {
              box-shadow: 0 0 40px rgba(135, 206, 250, 1), 0 0 80px rgba(135, 206, 250, 0.8), 0 0 120px rgba(135, 206, 250, 0.6), 0 0 160px rgba(255, 255, 255, 0.5), 0 0 200px rgba(255, 255, 255, 0.3);
            }
          }
        `}</style>
      )}
      <button
        onClick={handleStartQuiz}
        disabled={isDisabled}
        className={`w-full bg-gradient-to-r ${getButtonGradient()} text-white font-bold py-4 px-8 rounded-xl text-xl transform hover:scale-105 transition-all duration-200 shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none ${className}`}
        style={quizState === 'live' && !userCompleted ? {
          animation: 'glow-pulse 2s ease-in-out infinite'
        } : {}}
      >
        {getButtonText()}
        {isModalOpen && (
          <span className="ml-2">
            {transactionState === TransactionState.CONNECTING && '🔗'}
            {transactionState === TransactionState.CONFIRMING && '⏳'}
            {transactionState === TransactionState.SUCCESS && '✅'}
            {transactionState === TransactionState.ERROR && '❌'}
          </span>
        )}
        {quizState === 'live' && !userCompleted && (
          <span className="ml-2 animate-pulse">🚀</span>
        )}
      </button>

      {/* Details Modal - Simplified Design */}
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

            {/* Fixed Header */}
            <div className="flex-shrink-0 pb-3 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 pr-6">
                📅 Weekly Quiz Challenge
              </h3>
            </div>

            {/* Scrollable Content */}
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
                    • 10 questions and 45 seconds per question
                  </p>
                  <p className="text-xs text-blue-700">
                    • Runs every Tuesday & Friday, 6 PM – 6 AM UTC
                  </p>
                </div>

                {/* Rewards */}
                <div className="bg-yellow-50 rounded-lg p-3">
                  <div className="font-semibold text-yellow-800 mb-1.5 text-sm">
                    🔥 Rewards — 15M $QT Tokens
                  </div>
                  <p className="text-xs text-yellow-700 mb-1">🥇 1st Place: 4.0M QT</p>
                  <p className="text-xs text-yellow-700 mb-1">🥈 2nd Place: 2.5M QT</p>
                  <p className="text-xs text-yellow-700 mb-1">🥉 3rd Place: 1.5M QT</p>
                  <p className="text-xs text-yellow-700">4th-10th: 1.0M QT each</p>
                </div>

                {/* Scoring Rules */}
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="font-semibold text-green-800 mb-1.5 text-sm">
                    ✅ Scoring Rules
                  </div>
                  <p className="text-xs text-green-700 mb-1">
                    +1 for correct answers
                  </p>
                  <p className="text-xs text-green-700 mb-1">
                    -1 for wrong answers
                  </p>
                  <p className="text-xs text-green-700">
                    0 for missed/no answer
                  </p>
                </div>

                {/* State-specific Section */}
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
                    <p className={`text-xs ${stateInfo.textColor} mb-1.5`}>
                      You&apos;ve already completed this quiz!
                    </p>
                  )}
                  <p className={`text-xs font-medium ${stateInfo.textColor}`}>
                    {stateInfo.message}: {countdown}
                  </p>
                </div>
              </div>
            </div>

            {/* Fixed Footer with Buttons */}
            <div className="flex-shrink-0 pt-3 mt-3 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 font-semibold text-sm rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
                
                {quizState === 'ended' && (
                  <button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      window.location.href = '/leaderboard';
                    }}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-sm rounded-lg hover:from-blue-600 hover:to-purple-700 transition"
                  >
                    📊 View Leaderboard
                  </button>
                )}
                
                {canStartQuiz && (
                  <button
                    onClick={handleStartQuizConfirmed}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold text-sm rounded-lg hover:from-green-600 hover:to-blue-700 transition"
                  >
                    Start Quiz 🚀
                  </button>
                )}
              </div>
          </div>
        </div>
      )}

      <TransactionModal
        isOpen={isModalOpen}
        state={transactionState}
        error={error}
        onClose={handleCloseModal}
        transactionHash={transactionHash}
      />
    </>
  );
};

export default WeeklyQuizStartButton;