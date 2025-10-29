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
  
  // Get next quiz countdown based on state
  // FOR TESTING: Set to 10 seconds from now
  const nextQuizTime = React.useMemo(() => {
    // TESTING MODE: Return 10 seconds from now
    return new Date(Date.now() + 10 * 1000);
    
    // PRODUCTION CODE (commented out for testing):
    // if (quizState === 'live') {
    //   // Show time until quiz ends
    //   return new Date(currentWeeklyQuiz.endTime);
    // } else if (quizState === 'ended') {
    //   // Show time until next quiz starts
    //   return getNextQuizStartTime();
    // } else {
    //   // Upcoming: show time until this quiz starts
    //   return new Date(currentWeeklyQuiz.startTime);
    // }
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
        return 'from-gray-400 to-gray-500 cursor-not-allowed';
      default:
        return 'from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700';
    }
  };

  const isDisabled = isModalOpen;

  return (
    <>
      <button
        onClick={handleStartQuiz}
        disabled={isDisabled}
        className={`w-full bg-gradient-to-r ${getButtonGradient()} text-white font-bold py-4 px-8 rounded-xl text-xl transform hover:scale-105 transition-all duration-200 shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none ${className}`}
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

      {/* Details Modal */}
      {isDetailsModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsDetailsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsDetailsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>

            <div className="mt-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                {quizState === 'upcoming' && '📅 Weekly Quiz Challenge'}
                {quizState === 'live' && '🔴 Weekly Quiz Challenge - LIVE NOW'}
                {quizState === 'ended' && '⏹️ Weekly Quiz Challenge Ended'}
              </h3>

              <div className="space-y-4 text-gray-700">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="font-semibold text-blue-800 mb-2">🧩 Weekly Quiz Challenge</div>
                  <p className="text-sm">• 10 questions and 45 seconds per question</p>
                  <p className="text-sm">• Runs every Tuesday & Friday, 6 PM – 6 AM UTC</p>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="font-semibold text-yellow-800 mb-2">💰 Rewards — 15M $QT Tokens</div>
                  <p className="text-sm">🥇 1st Place: 4.0M QT</p>
                  <p className="text-sm">🥈 2nd Place: 2.5M QT</p>
                  <p className="text-sm">🥉 3rd Place: 1.5M QT</p>
                  <p className="text-sm">4th-10th: 1.0M QT each</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="font-semibold text-green-800 mb-2">✅ Scoring Rules</div>
                  <p className="text-sm">+1 for correct answers</p>
                  <p className="text-sm">-1 for wrong answers</p>
                </div>

                {quizState === 'upcoming' && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="font-semibold text-purple-800 mb-2">⏰ Next Quiz</div>
                    <p className="text-sm font-medium text-purple-900">Starts in: {countdown}</p>
                  </div>
                )}

                {quizState === 'live' && !userCompleted && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="font-semibold text-red-800 mb-2">🔴 Live Now!</div>
                    <p className="text-sm mb-2">Quiz is currently active. Click Start below to participate.</p>
                    <p className="text-sm font-medium text-red-900">Ends in: {countdown}</p>
                  </div>
                )}

                {userCompleted && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="font-semibold text-green-800 mb-2">✅ Completed</div>
                    <p className="text-sm mb-2">You&apos;ve already completed this quiz!</p>
                    <p className="text-sm font-medium text-green-900">Next quiz in: {countdown}</p>
                  </div>
                )}

                {quizState === 'ended' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="font-semibold text-gray-800 mb-2">⏹️ Quiz Ended</div>
                    <p className="text-sm mb-2">This quiz has ended. Check the leaderboard to see results!</p>
                    <p className="text-sm font-medium text-gray-900">Next quiz in: {countdown}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
                
                {quizState === 'live' && !userCompleted && (
                  <button
                    onClick={handleStartQuizConfirmed}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-blue-700 transition"
                  >
                    Start Quiz 🚀
                  </button>
                )}
              </div>
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
