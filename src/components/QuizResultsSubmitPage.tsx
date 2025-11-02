import React, { useState, useEffect } from 'react';
import { QuizMode, TransactionState, startQuizTransactionWithWagmi, formatWalletError, WalletError } from '~/lib/wallet';
import { useConfig } from 'wagmi';
import TransactionModal from './TransactionModal';

interface QuizResultsSubmitPageProps {
  score: number;
  totalQuestions: number;
  mode: QuizMode;
  onSubmit: () => void;
  onViewLeaderboard: () => void;
  className?: string;
}

const QuizResultsSubmitPage: React.FC<QuizResultsSubmitPageProps> = ({
  score,
  totalQuestions,
  mode,
  onSubmit,
  onViewLeaderboard,
  className = ""
}) => {
  const [transactionState, setTransactionState] = useState<TransactionState>(TransactionState.IDLE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
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
          setHasSubmitted(true);
          // Call onSubmit to proceed to leaderboard
          onSubmit();
        }, 2000);
      }
    };

    window.addEventListener("message", handleFrameTransaction);
    return () => window.removeEventListener("message", handleFrameTransaction);
  }, [onSubmit]);

  const handleSubmitScore = async () => {
    if (hasSubmitted) {
      // Already submitted, go to leaderboard
      onSubmit();
      return;
    }

    try {
      setError('');
      setIsModalOpen(true);
      setTransactionState(TransactionState.CONNECTING);
      
      // Submit score with blockchain transaction
      const txHash = await startQuizTransactionWithWagmi(mode, config, (state) => {
        setTransactionState(state);
      });
      
      setTransactionHash(txHash);
      
      // Wait a moment to show success state
      setTimeout(() => {
        setIsModalOpen(false);
        setTransactionState(TransactionState.IDLE);
        setHasSubmitted(true);
        // Proceed to leaderboard
        onSubmit();
      }, 2000);
      
    } catch (err) {
      console.error('Score submission error:', err);
      
      // Close modal immediately on error - show inline error instead
      setIsModalOpen(false);
      setTransactionState(TransactionState.ERROR);
      
      if (err instanceof WalletError) {
        setError(formatWalletError(err));
      } else {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
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

  const handleRetry = () => {
    setError('');
    setTransactionState(TransactionState.IDLE);
    setIsModalOpen(false);
    handleSubmitScore();
  };

  return (
    <>
      <div className={`min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4 flex items-center justify-center ${className}`}>
        <div className="max-w-md w-full mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Your Quiz Results</h2>
            
            <div className="mb-8">
              <div className="text-6xl mb-4">✅</div>
              <div className="text-4xl font-bold text-gray-800 mb-2">
                Score: {score}/{totalQuestions}
              </div>
            </div>

            {/* Submit Button */}
            {!hasSubmitted && (
              <button
                onClick={handleSubmitScore}
                disabled={isModalOpen || transactionState !== TransactionState.IDLE}
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-4 px-8 rounded-xl text-xl transform hover:scale-105 transition-all duration-200 shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isModalOpen ? (
                  <span>
                    {transactionState === TransactionState.CONNECTING && '🔗 Connecting...'}
                    {transactionState === TransactionState.CONFIRMING && '⏳ Submitting...'}
                    {transactionState === TransactionState.SUCCESS && '✅ Submitted!'}
                    {transactionState === TransactionState.ERROR && '❌ Error'}
                  </span>
                ) : (
                  'Submit Your Score'
                )}
              </button>
            )}

            {/* Error State - Show Retry and Leaderboard buttons */}
            {transactionState === TransactionState.ERROR && !hasSubmitted && (
              <div className="mt-4 space-y-3">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm mb-3">
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleRetry}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all"
                  >
                    🔄 Retry
                  </button>
                  <button
                    onClick={onViewLeaderboard}
                    className="flex-1 bg-gray-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-600 transition-all"
                  >
                    📊 Leaderboard
                  </button>
                </div>
              </div>
            )}

            {/* Success State - Already submitted */}
            {hasSubmitted && (
              <div className="mt-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm mb-3">
                  ✅ Score submitted successfully!
                </div>
                <button
                  onClick={onViewLeaderboard}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-blue-700 transition-all"
                >
                  📊 View Leaderboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Only show modal for connecting, confirming, and success states - never for errors */}
      {isModalOpen && transactionState !== TransactionState.ERROR && (
        <TransactionModal
          isOpen={isModalOpen}
          state={transactionState}
          error={error}
          onClose={handleCloseModal}
          transactionHash={transactionHash}
        />
      )}
    </>
  );
};

export default QuizResultsSubmitPage;

