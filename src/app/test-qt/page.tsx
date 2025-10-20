"use client";

import { useQTClaim } from '~/hooks/useQTClaim';
import { useAccount } from 'wagmi';

export default function TestQTPage() {
  const { claimQTReward, isProcessing, error, address, isConnected } = useQTClaim();
  const { address: wagmiAddress } = useAccount();

  const handleTestClaim = async () => {
    console.log('🧪 Test claim button clicked!');
    console.log('Address from useQTClaim:', address);
    console.log('Address from useAccount:', wagmiAddress);
    console.log('Is connected:', isConnected);
    console.log('Is processing:', isProcessing);
    console.log('Error:', error);

    if (!address) {
      alert('No wallet address found');
      return;
    }

    try {
      const result = await claimQTReward(address);
      console.log('Claim result:', result);
      alert(`Claim result: ${JSON.stringify(result)}`);
    } catch (err) {
      console.error('Claim error:', err);
      alert(`Claim error: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">QT Token Claim Test</h1>
        
        <div className="space-y-4">
          <div>
            <strong>Wallet Address (useQTClaim):</strong> {address || 'Not connected'}
          </div>
          <div>
            <strong>Wallet Address (useAccount):</strong> {wagmiAddress || 'Not connected'}
          </div>
          <div>
            <strong>Is Connected:</strong> {isConnected ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Is Processing:</strong> {isProcessing ? 'Yes' : 'No'}
          </div>
          {error && (
            <div className="text-red-600">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <button
            onClick={handleTestClaim}
            disabled={isProcessing || !address}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Test Claim QT Tokens'}
          </button>
        </div>
      </div>
    </div>
  );
}
