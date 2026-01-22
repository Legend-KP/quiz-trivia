import React from 'react';
import { QuizMode } from '@/lib/wallet';

interface QuizStartButtonProps {
  mode: QuizMode;
  modeName: string;
  onQuizStart: () => void;
  className?: string;
}

const QuizStartButton: React.FC<QuizStartButtonProps> = ({
  mode,
  modeName,
  onQuizStart,
  className = ""
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
        return 'Time Mode ⏱️';
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
        return 'from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700';
      case QuizMode.CHALLENGE:
        return 'from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700';
      default:
        return 'from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700';
    }
  };

  return (
    <button
      onClick={handleStartQuiz}
      className={`w-full bg-gradient-to-r ${getButtonGradient()} text-white font-bold py-6 px-10 rounded-xl text-2xl transform hover:scale-105 transition-all duration-200 shadow-2xl ${className}`}
    >
      {getButtonText()}
    </button>
  );
};

export default QuizStartButton;

