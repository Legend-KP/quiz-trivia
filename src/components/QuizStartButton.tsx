import React from 'react';
import { QuizMode } from '@/lib/wallet';

interface QuizStartButtonProps {
  mode: QuizMode;
  modeName: string;
  onQuizStart: () => void;
  className?: string;
  isContestLive?: boolean; // NEW: For Time Mode contest glow
}

const QuizStartButton: React.FC<QuizStartButtonProps> = ({
  mode,
  modeName,
  onQuizStart,
  className = "",
  isContestLive = false
}) => {
  const handleStartQuiz = () => {
    // Start the quiz directly (currency deduction happens in TimeModePage)
    onQuizStart();
  };

  const getButtonText = () => {
    switch (mode) {
      case QuizMode.CLASSIC:
        return 'Classic Quiz 🧠';
      case QuizMode.TIME_MODE:
        return isContestLive ? 'Time Mode ⏱️ 🔴 LIVE' : 'Time Mode ⏱️';
      case QuizMode.CHALLENGE:
        return 'Challenge Mode';
      default:
        return modeName;
    }
  };

  const getButtonGradient = () => {
    switch (mode) {
      case QuizMode.CLASSIC:
        return 'from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700';
      case QuizMode.TIME_MODE:
        return isContestLive 
          ? 'from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
          : 'from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700';
      case QuizMode.CHALLENGE:
        return 'from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700';
      default:
        return 'from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700';
    }
  };

  // Show glow animation for Time Mode when contest is live
  const showGlow = mode === QuizMode.TIME_MODE && isContestLive;

  return (
    <>
      {showGlow && (
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
        className={`w-full bg-gradient-to-r ${getButtonGradient()} text-white font-bold py-6 px-10 rounded-xl text-2xl transform hover:scale-105 transition-all duration-200 shadow-2xl ${className}`}
        style={showGlow ? { animation: 'glow-pulse 2s ease-in-out infinite' } : {}}
      >
        {getButtonText()}
        {showGlow && <span className="ml-2 animate-pulse">🚀</span>}
      </button>
    </>
  );
};

export default QuizStartButton;

