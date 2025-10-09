import React, { useState } from 'react';
import { QuizMode, TransactionState, startQuizTransaction, formatWalletError, WalletError } from '@/lib/wallet';
import TransactionModal from './TransactionModal';

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
  const [transactionState, setTransactionState] = useState<TransactionState>(TransactionState.IDLE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [transactionHash, setTransactionHash] = useState<string>('');

  const handleStartQuiz = async () => {
    try {
      setError('');
      setIsModalOpen(true);
      setTransactionState(TransactionState.CONNECTING);
      
      // Start the blockchain transaction
      const txHash = await startQuizTransaction(mode, (state) => {
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
    switch (mode) {
      case QuizMode.CLASSIC:
        return 'Classic Quiz 🧠';
      case QuizMode.TIME_MODE:
        return 'Time Mode ⏱️';
      case QuizMode.CHALLENGE:
        return 'Challenge (Beta) ⚔️';
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
    <>
      <button
        onClick={handleStartQuiz}
        disabled={isModalOpen}
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

export default QuizStartButton;

