import React, { useState } from 'react';
import { QuizState, currentWeeklyQuiz, getNextQuizStartTime, MIN_REQUIRED_QT, formatTokens } from '~/lib/weeklyQuiz';
import { useCountdown } from '~/hooks/useWeeklyQuiz';

interface WeeklyQuizStartButtonProps {
  quizState: QuizState;
  onQuizStart: () => void;
  userCompleted?: boolean;
  className?: string;
  isWalletConnected?: boolean;
  walletBalance?: number;
  hasEnoughQT?: boolean;
}

const WeeklyQuizStartButton: React.FC<WeeklyQuizStartButtonProps> = ({
  quizState,
  onQuizStart,
  userCompleted = false,
  className = "",
  isWalletConnected = false,
  walletBalance = 0,
  hasEnoughQT = false,
}) => {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  
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

  const handleStartQuiz = () => {
    // Clear any previous errors when opening modal
    setError(null);
    // Always show details modal first
    setIsDetailsModalOpen(true);
  };

  const handleStartQuizConfirmed = async () => {
    if (quizState !== 'live' || userCompleted) {
      setIsDetailsModalOpen(false);
      return; // Don't start if not live or already completed
    }

    // Additional safety check before attempting to start
    if (!isWalletConnected) {
      setError('Please connect your Farcaster wallet to participate in the Weekly Quiz.');
      return;
    }

    if (!hasEnoughQT) {
      const requiredFormatted = formatTokens(MIN_REQUIRED_QT);
      const currentFormatted = formatTokens(walletBalance);
      const shortfall = MIN_REQUIRED_QT - walletBalance;
      const shortfallFormatted = formatTokens(shortfall);
      setError(`❌ Insufficient QT Tokens\n\n📊 Required: ${requiredFormatted} QT\n💰 Your Balance: ${currentFormatted} QT\n📉 You Need: ${shortfallFormatted} QT more\n\n💡 Please add more QT tokens to your wallet to participate.`);
      return;
    }

    // Clear any previous errors
    setError(null);
    setIsStarting(true);

    try {
      // Call the onQuizStart callback which handles all validation
      await onQuizStart();
      // If successful, close modal and quiz will start
      setIsDetailsModalOpen(false);
    } catch (err: any) {
      // Show error in the modal instead of alert
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

  const canStartQuiz = quizState === 'live' && !userCompleted && isWalletConnected && hasEnoughQT;
  const stateInfo = getStateInfo();

  // Determine why user can't participate
  const getWhyCantParticipate = () => {
    // If user already completed, show that message
    if (userCompleted) {
      return {
        title: 'Already Completed',
        message: 'You have already completed this quiz. Each user can only take the quiz once per week.',
        icon: '✅',
      };
    }
    
    // If quiz is not live, show quiz state message
    if (quizState !== 'live') {
      if (quizState === 'upcoming') {
        return {
          title: 'Quiz Not Started',
          message: 'This quiz hasn\'t started yet. Please wait for the quiz to go live.',
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

    // If quiz is live, check wallet and QT requirements
    if (quizState === 'live') {
      if (!isWalletConnected) {
        return {
          title: 'Wallet Not Connected',
          message: 'Please connect your Farcaster wallet to participate in the Weekly Quiz.',
          icon: '🔗',
        };
      }

      if (!hasEnoughQT) {
        const requiredFormatted = formatTokens(MIN_REQUIRED_QT);
        const currentFormatted = formatTokens(walletBalance);
        const shortfall = MIN_REQUIRED_QT - walletBalance;
        const shortfallFormatted = formatTokens(shortfall);
        return {
          title: 'Insufficient QT Tokens',
          message: `Required: ${requiredFormatted} QT\nYour Balance: ${currentFormatted} QT\nYou Need: ${shortfallFormatted} QT more\n\nPlease add more QT tokens to participate.`,
          icon: '💰',
        };
      }
    }

    // User can participate
    return null;
  };

  const whyCantParticipate = getWhyCantParticipate();

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
        className={`w-full bg-gradient-to-r ${getButtonGradient()} text-white font-bold py-6 px-10 rounded-xl text-2xl transition-all duration-200 shadow-2xl ${className} ${
          quizState === 'live' 
            ? 'transform hover:scale-105' 
            : ''
        }`}
        style={quizState === 'live' ? {
          animation: 'glow-pulse 2s ease-in-out infinite'
        } : {}}
      >
        {getButtonText()}
        {quizState === 'live' && (
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
                    • 10 questions with 45 seconds per question
                  </p>
                  <p className="text-xs text-blue-700">
                    • Runs every Tuesday & Friday, 6 PM – 6 AM UTC
                  </p>
                </div>

                {/* Rewards */}
                <div className="bg-yellow-50 rounded-lg p-3">
                  <div className="font-semibold text-yellow-800 mb-1.5 text-sm">
                    🔥 Rewards — 25M $QT Tokens
                  </div>
                  <p className="text-xs text-yellow-700 mb-1">🥇 1st Place: 10M $QT</p>
                  <p className="text-xs text-yellow-700 mb-1">🥈 2nd Place: 5M $QT</p>
                  <p className="text-xs text-yellow-700 mb-1">🥉 3rd Place: 3M $QT</p>
                  <p className="text-xs text-yellow-700">4th-10th: 1.0M $QT each</p>
                </div>

                {/* State-specific Section */}
                <div className={`${stateInfo.bgColor} rounded-lg p-3`}>
                  <div className={`font-semibold ${stateInfo.textColor} mb-1.5 text-sm`}>
                    {stateInfo.icon} {stateInfo.title}
                  </div>
                  {quizState === 'ended' && !userCompleted && (
                    <p className={`text-xs ${stateInfo.textColor} mb-1.5`}>
                      This quiz has ended, Add Frame for next Quiz update. Check the leaderboard to see results!
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

                {/* Why Can't Participate Section - Only show if user hasn't completed and can't start */}
                {whyCantParticipate && !canStartQuiz && !userCompleted && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="font-semibold text-red-800 mb-1.5 text-sm flex items-center justify-center gap-2">
                      <span>{whyCantParticipate.icon}</span>
                      <span>{whyCantParticipate.title}</span>
                    </div>
                    <p className="text-xs text-red-700 text-center">
                      {whyCantParticipate.message}
                    </p>
                    {!isWalletConnected && (
                      <p className="text-xs text-red-600 mt-2 font-medium text-center">
                        💡 Tip: Connect your wallet from the top right corner to participate.
                      </p>
                    )}
                    {!hasEnoughQT && isWalletConnected && (
                      <div className="text-xs text-red-600 mt-2 space-y-1">
                        <p className="font-medium text-center">
                          💡 Tip: Add more QT tokens to your wallet to meet the requirement and participate in the Weekly Quiz.
                        </p>
                        {walletBalance === 0 && (
                          <p className="text-center text-red-500">
                            ⚠️ If you have QT tokens but see 0 balance, try:
                            <br />
                            • Disconnect and reconnect your wallet
                            <br />
                            • Refresh the page
                            <br />
                            • Check that you're on Base network
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Error Message Section (from failed start attempt) */}
                {error && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 animate-pulse">
                    {error.includes('QT') || error.includes('Insufficient') ? (
                      <>
                        <div className="font-semibold text-red-800 mb-1.5 text-sm flex items-center justify-center gap-2">
                          <span>💰</span>
                          <span>Insufficient QT Tokens</span>
                        </div>
                        <p className="text-xs text-red-700 text-center whitespace-pre-line">
                          {error}
                        </p>
                        <p className="text-xs text-red-600 mt-2 font-medium text-center">
                          💡 Please add more QT tokens to your wallet to participate.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-red-800 mb-1.5 text-sm flex items-center gap-2">
                          <span>⚠️</span>
                          <span>Cannot Start Quiz</span>
                        </div>
                        <p className="text-xs text-red-700 whitespace-pre-line">
                          {error}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer with Buttons */}
            <div className="flex-shrink-0 pt-3 mt-3 border-t border-gray-200 flex gap-2 flex-wrap">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 font-semibold text-sm rounded-lg hover:bg-gray-300 transition min-w-[80px]"
                >
                  Close
                </button>
                
                  <button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                    window.location.href = '/leaderboard?mode=CLASSIC';
                    }}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-sm rounded-lg hover:from-blue-600 hover:to-purple-700 transition min-w-[140px]"
                  >
                    📊 View Leaderboard
                  </button>
                
                {canStartQuiz && (
                  <button
                    onClick={handleStartQuizConfirmed}
                    disabled={userCompleted || isStarting}
                    className={`flex-1 px-3 py-2 text-white font-bold text-sm rounded-lg transition min-w-[120px] ${
                      userCompleted || isStarting
                        ? 'bg-gray-400 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700'
                    }`}
                  >
                    {isStarting ? 'Starting...' : userCompleted ? 'Already Completed ✓' : 'Start Quiz 🚀'}
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