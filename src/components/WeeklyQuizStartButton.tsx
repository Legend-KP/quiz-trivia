import React, { useState, useEffect } from 'react';
import { QuizMode, TransactionState, startQuizTransactionWithWagmi, formatWalletError, WalletError } from '~/lib/wallet';
import { useConfig } from 'wagmi';
import TransactionModal from './TransactionModal';
import { QuizState } from '~/lib/weeklyQuiz';

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
  const [error, setError] = useState<string>('');
  const [transactionHash, setTransactionHash] = useState<string>('');
  const config = useConfig();

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

  const handleStartQuiz = async () => {
    if (quizState !== 'live' || userCompleted) {
      return; // Don't start if not live or already completed
    }

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

  const isDisabled = quizState !== 'live' || userCompleted || isModalOpen;

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
