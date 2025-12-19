import React, { useState, useRef, useEffect } from 'react';
import { useMiniApp } from '@neynar/react';
import wheelOptions, { WheelOption } from '~/config/wheelOptions';
import { APP_URL, APP_NAME } from '~/lib/constants';

interface SpinWheelProps {
  onSpin: () => Promise<{ success: boolean; spinResult?: any; balance?: number; error?: string }>;
  onQTTokenWin?: (userAddress: string, qtAmount: number) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  userAddress?: string;
  disabled?: boolean;
}

const SpinWheel: React.FC<SpinWheelProps> = ({ onSpin, onQTTokenWin, userAddress, disabled = false }) => {
  const { context, actions } = useMiniApp();
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [canSpin, setCanSpin] = useState(true);
  const wheelRef = useRef<HTMLDivElement>(null);

  // Check cooldown timer
  useEffect(() => {
    const checkCooldown = () => {
      const lastSpinTime = localStorage.getItem('lastSpinTime');
      
      if (lastSpinTime) {
        const timeSinceLastSpin = Date.now() - parseInt(lastSpinTime);
        const cooldownPeriod = 60 * 60 * 1000; // 1 hour in milliseconds
        const remainingTime = cooldownPeriod - timeSinceLastSpin;
        
        if (remainingTime > 0) {
          setCanSpin(false);
          setTimeLeft(Math.ceil(remainingTime / 1000)); // Convert to seconds
        } else {
          setCanSpin(true);
          setTimeLeft(0);
          localStorage.removeItem('lastSpinTime');
        }
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update timer every second
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !canSpin) {
      setCanSpin(true);
    }
  }, [timeLeft, canSpin]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  // Wheel options are now imported from config/wheelOptions.ts
  // All segments award QT tokens: 100, 200, 500, 1000, 2000, 10000

  const handleSpin = async () => {
    if (isSpinning || disabled || !canSpin) return;

    setIsSpinning(true);
    setResult(null);
    setShowResult(false);

    try {
      const response = await onSpin();
      
      if (response.success && response.spinResult) {
        // Record the spin time for 1-hour cooldown
        localStorage.setItem('lastSpinTime', Date.now().toString());
        setCanSpin(false);
        setTimeLeft(60 * 60); // 1 hour in seconds
        
        // Find which segment index the result corresponds to
        const resultIndex = wheelOptions.findIndex(opt => opt.id === response.spinResult.id);
        
        // Calculate the angle to land on this segment
        // Each segment is 60 degrees (360 / 6 segments), we want to land in the middle of the segment
        const segmentAngle = resultIndex * 60;
        const targetAngle = 360 - segmentAngle + 30; // +30 to center on segment, inverse rotation
        
        // Add multiple full rotations for effect
        const fullRotations = 1800; // 5 full rotations
        const finalRotation = fullRotations + targetAngle;
        
        // Now animate the wheel to the calculated position
        if (wheelRef.current) {
          wheelRef.current.style.transition = 'transform 3s cubic-bezier(0.23, 1, 0.32, 1)';
          wheelRef.current.style.transform = `rotate(${finalRotation}deg)`;
        }
        
        // All results are now QT tokens
        setResult({
          ...response.spinResult,
          needsWalletClaim: true
        });
        
        setTimeout(() => {
          setShowResult(true);
        }, 3000); // Show result after animation
      } else {
        console.error('Spin failed:', response.error);
      }
    } catch (error) {
      console.error('Spin error:', error);
    } finally {
      setTimeout(() => {
        setIsSpinning(false);
      }, 3000);
    }
  };

  const handleClaimQTTokens = async () => {
    if (isClaiming) {
      return;
    }

    if (!userAddress || userAddress === "0x0000000000000000000000000000000000000000") {
      alert('Please connect your Farcaster wallet to claim QT tokens');
      return;
    }

    if (!onQTTokenWin) {
      alert('QT token claiming is not available');
      return;
    }

    if (!result || !result.qtAmount) {
      alert('Invalid spin result');
      return;
    }

    try {
      setIsClaiming(true);
      // This will trigger a wallet transaction
      // The user will need to sign the transaction in their Farcaster wallet
      const qtResponse = await onQTTokenWin(userAddress, result.qtAmount);
      
      if (qtResponse?.success) {
        setResult({
          ...result,
          txHash: qtResponse.txHash
        });
        // Wait a moment for transaction to be confirmed
        setTimeout(() => {
          // Close the claim modal
          setShowResult(false);
          // Show success popup
          setShowSuccessPopup(true);
        }, 1500);
      } else {
        alert(`Failed to claim QT tokens: ${qtResponse?.error || 'Unknown error'}`);
      }
    } catch (_error) {
      alert('Failed to claim QT tokens. Please try again.');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleShare = async () => {
    try {
      const fid = context?.user?.fid;
      if (!fid) {
        alert('Farcaster authentication required to share your win.');
        return;
      }

      if (!result || !result.qtAmount) {
        alert('No win to share.');
        return;
      }

      const formatQT = (amount: number) => {
        if (amount >= 1000) {
          return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
        }
        return amount.toString();
      };

      const buildShareUrl = () => {
        const base = new URL(`${APP_URL}/share/${fid}`);
        base.searchParams.set('mode', 'Spin Wheel');
        base.searchParams.set('qt', formatQT(result.qtAmount));
        return base.toString();
      };

      const shareText = `🎰 I just won ${formatQT(result.qtAmount)} QT tokens on the Spin Wheel in ${APP_NAME}! 🎉 Try your luck:`;

      try {
        await actions.composeCast({
          text: shareText,
          embeds: [buildShareUrl()],
        });
      } catch (err) {
        console.error('Failed to open Farcaster composer:', err);
        const text = encodeURIComponent(shareText);
        const url = encodeURIComponent(buildShareUrl());
        const warpcastUrl = `https://warpcast.com/~/compose?text=${text}%20${url}`;
        if (typeof window !== 'undefined') {
          window.open(warpcastUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err) {
      console.error('Failed to share result:', err);
      alert('Failed to share. Please try again.');
    }
  };

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
    resetWheel();
  };

  const resetWheel = () => {
    if (wheelRef.current) {
      wheelRef.current.style.transition = 'none';
      wheelRef.current.style.transform = 'rotate(0deg)';
    }
    setShowResult(false);
    setResult(null);
  };


  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Spin Wheel */}
      <div className="relative">
        <div 
          ref={wheelRef}
          className="w-64 h-64 rounded-full border-8 border-white shadow-2xl relative overflow-hidden"
          style={{ 
            background: `conic-gradient(from 0deg, ${wheelOptions.map((opt, i) => 
              `${opt.color} ${i * 60}deg ${(i + 1) * 60}deg`
            ).join(', ')})`
          }}
        >
          {/* Wheel segments with centered text */}
          {wheelOptions.map((option, index) => {
            const angle = index * 60; // 60 degrees per segment
            
            return (
              <div
                key={option.id}
                className="absolute w-full h-full"
                style={{
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: '50% 50%'
                }}
              >
                {/* Text positioned near circumference and shifted right */}
                <div 
                  className="absolute text-white font-bold text-lg"
                  style={{
                    top: '10%',
                    left: '70%',
                    transform: `translateX(-50%) rotate(30deg)`,
                    transformOrigin: 'center',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {option.label}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Center pointer - at top pointing down */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 z-10">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px] border-l-transparent border-r-transparent border-b-white drop-shadow-2xl"></div>
        </div>
      </div>

      {/* Spin Button */}
      {canSpin ? (
        <button
          onClick={handleSpin}
          disabled={isSpinning || disabled}
          className={`px-8 py-3 rounded-full font-bold text-white text-lg transition-all duration-300 ${
            isSpinning || disabled
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:scale-105 shadow-lg'
          }`}
        >
          {isSpinning ? 'Spinning...' : '🎰 Spin the Wheel!'}
        </button>
      ) : (
        <div className="text-center">
          <div className="bg-gray-100 rounded-lg p-4 mb-2">
            <div className="text-sm text-gray-600 mb-1">Next spin available in:</div>
            <div className="text-2xl font-bold text-gray-800 font-mono">
              {formatTime(timeLeft)}
            </div>
          </div>
              <div className="text-xs text-gray-500">
                You can spin once every hour
              </div>
        </div>
      )}

        {/* Result Modal */}
        {showResult && result && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
              {/* All results are now QT tokens */}
              <div>
                <div className="text-6xl mb-4">🎁</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Congratulations!</h3>
                <div className="text-xl text-gray-600 mb-6">
                  <span className="font-bold text-yellow-600">You won {result.qtAmount?.toLocaleString() || result.label} QT Tokens!</span>
                </div>
              </div>
            {result.isToken && (
              <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4">
                <p className="text-yellow-700 text-sm mb-4">
                  To claim your tokens, you need to sign a transaction with your wallet.
                </p>
                <button
                  onClick={handleClaimQTTokens}
                  disabled={isClaiming}
                  className={`w-full px-6 py-4 rounded-lg font-bold text-lg transition-all ${
                    isClaiming 
                      ? 'bg-yellow-300 text-yellow-700 cursor-not-allowed' 
                      : 'bg-yellow-500 text-yellow-900 hover:bg-yellow-400 shadow-lg hover:shadow-xl transform hover:scale-105'
                  }`}
                >
                  {isClaiming ? '⏳ Processing...' : '🚀 Claim QT Tokens'}
                </button>
                {result.txHash && (
                  <p className="text-xs text-yellow-600 mt-2">
                    Transaction: {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Popup after claiming */}
      {showSuccessPopup && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Success!</h3>
            <div className="text-xl text-gray-600 mb-6">
              <span className="font-bold text-green-600">
                You've successfully claimed {result.qtAmount?.toLocaleString() || result.label} QT Tokens!
              </span>
            </div>
            {result.txHash && (
              <p className="text-xs text-gray-500 mb-4">
                Transaction: {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
              </p>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleShare}
                className="w-full px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                📤 Share Your Win
              </button>
              
              <button
                onClick={handleCloseSuccessPopup}
                className="w-full px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpinWheel;