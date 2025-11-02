import React from 'react';
import { TransactionState } from '~/lib/wallet';

interface TransactionModalProps {
  isOpen: boolean;
  state: TransactionState;
  error?: string;
  onClose: () => void;
  transactionHash?: string;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  state,
  error,
  onClose,
  transactionHash
}) => {
  if (!isOpen) return null;

  const getModalContent = () => {
    switch (state) {
      case TransactionState.CONNECTING:
        return {
          title: 'Connecting Your Wallet',
          icon: '🔗',
          message: "Hang tight! We're getting your wallet ready to submit your score...",
          showSpinner: true
        };
      
      case TransactionState.CONFIRMING:
        return {
          title: 'Submitting Score',
          icon: '✍️',
          message: 'Almost there! Please sign the message to submit your quiz score (no payment required).',
          showSpinner: true
        };
      
      case TransactionState.SUCCESS:
        return {
          title: 'Score Submitted! 🎉',
          icon: '✅',
          message: 'Your score has been successfully submitted to the leaderboard!',
          showSpinner: false,
          showTxHash: true
        };
      
      case TransactionState.ERROR:
        return {
          title: 'Oops! Something Went Wrong',
          icon: '❌',
          message: error || 'Failed to submit your score. Please try again.',
          showSpinner: false
        };
      
      default:
        return {
          title: 'Processing',
          icon: '⏳',
          message: "Just a sec... we're getting things ready.",
          showSpinner: true
        };
    }
  };
  

  const content = getModalContent();
  const isSuccess = state === TransactionState.SUCCESS;
  const isError = state === TransactionState.ERROR;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative shadow-2xl">
        {/* Close button (only show if not success) */}
        {!isSuccess && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}

        {/* Icon and Title */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{content.icon}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {content.title}
          </h2>
          <p className="text-gray-600">{content.message}</p>
        </div>

        {/* Spinner */}
        {content.showSpinner && (
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Transaction Hash */}
        {content.showTxHash && transactionHash && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 mb-2">Transaction Hash:</p>
            <p className="text-xs font-mono text-green-700 break-all">
              {transactionHash}
            </p>
            <a
              href={`https://sepolia.basescan.org/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 hover:text-green-800 underline mt-1 inline-block"
            >
              View on BaseScan ↗
            </a>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {isSuccess ? (
            <button
              onClick={onClose}
              className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200"
            >
              View Leaderboard! 📊
            </button>
          ) : isError ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-600 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                Try Again
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Additional Info */}
        {state === TransactionState.CONFIRMING && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              💡 <strong>Tip:</strong> This signature creates a permanent record of your quiz score on the blockchain - no payment required!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionModal;

