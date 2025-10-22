import React, { useState, useRef } from 'react';

interface SpinWheelProps {
  onSpin: () => Promise<{ success: boolean; spinResult?: any; balance?: number; error?: string }>;
  onQTTokenWin?: (userAddress: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  userAddress?: string;
  disabled?: boolean;
}

const SpinWheel: React.FC<SpinWheelProps> = ({ onSpin, onQTTokenWin, userAddress, disabled = false }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);


  // IMPORTANT: This order MUST match the backend SPIN_OPTIONS order exactly
  const wheelOptions = [
    { id: '0_coins', label: '0', color: '#FF6B6B', coins: 0 },
    { id: '5_coins', label: '5', color: '#4ECDC4', coins: 5 },
    { id: '10_coins', label: '10', color: '#45B7D1', coins: 10 },
    { id: '15_coins', label: '15', color: '#96CEB4', coins: 15 },
    { id: '25_coins', label: '25', color: '#FFEAA7', coins: 25 },
    { id: 'qt_token', label: '10k $QT', color: '#DDA0DD', coins: '10k', isToken: true }
  ];

  const handleSpin = async () => {
    if (isSpinning || disabled) return;

    setIsSpinning(true);
    setResult(null);
    setShowResult(false);

    try {
      const response = await onSpin();
      
      if (response.success && response.spinResult) {
        // Find which segment index the result corresponds to
        const resultIndex = wheelOptions.findIndex(opt => opt.id === response.spinResult.id);
        
        // Calculate the angle to land on this segment
        // Each segment is 60 degrees, we want to land in the middle of the segment
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
        
        setResult(response.spinResult);
        
        // If user won QT tokens, show instructions for claiming
        if (response.spinResult.isToken) {
          setResult({
            ...response.spinResult,
            needsWalletClaim: true
          });
        }
        
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

    try {
      setIsClaiming(true);
      // This will trigger a wallet transaction
      // The user will need to sign the transaction in their Farcaster wallet
      const qtResponse = await onQTTokenWin(userAddress);
      
      if (qtResponse?.success) {
        setResult({
          ...result,
          txHash: qtResponse.txHash
        });
      } else {
        alert(`Failed to claim QT tokens: ${qtResponse?.error || 'Unknown error'}`);
      }
    } catch (_error) {
      alert('Failed to claim QT tokens. Please try again.');
    } finally {
      setIsClaiming(false);
    }
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
            background: 'conic-gradient(from 0deg, #FF6B6B 0deg 60deg, #4ECDC4 60deg 120deg, #45B7D1 120deg 180deg, #96CEB4 180deg 240deg, #FFEAA7 240deg 300deg, #DDA0DD 300deg 360deg)'
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

        {/* Result Modal */}
        {showResult && result && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
              <div className="text-6xl mb-4">{result.coins === '0' ? '😢' : '🎉'}</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {result.coins === '0' ? 'Better Luck Next Time!' : 'Congratulations!'}
              </h3>
              <div className="text-xl text-gray-600 mb-6">
              {result.coins === 0 ? (
    <span className="font-bold text-gray-500">Better luck next time! The wheel has more surprises waiting! 🎰</span>
  ) : (
    <>You won: <span className="font-bold text-purple-600">{result.label}</span></>
  )}

            </div>
            {result.isToken && (
              <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-semibold mb-2">
                  🎁 You won 10,000 QT Tokens!
                </p>
                <p className="text-yellow-700 text-sm mb-3">
                  
                </p>
                <button
                  onClick={handleClaimQTTokens}
                  disabled={isClaiming}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    isClaiming 
                      ? 'bg-yellow-300 text-yellow-700 cursor-not-allowed' 
                      : 'bg-yellow-500 text-yellow-900 hover:bg-yellow-400'
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
            <button
              onClick={resetWheel}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpinWheel;