import React, { useState, useEffect, useCallback } from 'react';
import { getUserNonce } from '../lib/wallet';

interface DebugPanelProps {
  userAddress?: string;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ userAddress }) => {
  const [nonce, setNonce] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshNonce = useCallback(async () => {
    if (!userAddress) return;
    
    setIsLoading(true);
    try {
      const currentNonce = await getUserNonce(userAddress);
      setNonce(currentNonce);
    } catch (error) {
      console.error('Failed to get nonce:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    if (userAddress) {
      refreshNonce();
      // Auto-refresh every 5 seconds
      const interval = setInterval(refreshNonce, 5000);
      return () => clearInterval(interval);
    }
  }, [userAddress, refreshNonce]);

  if (!userAddress) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: '10px', 
        right: '10px', 
        background: '#f0f0f0', 
        padding: '10px', 
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 1000
      }}>
        🔍 Debug Panel: No wallet connected
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: '#f0f0f0', 
      padding: '10px', 
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 1000,
      minWidth: '200px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>🔍 Debug Panel</div>
      <div>Address: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}</div>
      <div>
        Current Nonce: {isLoading ? '⏳' : nonce}
        {isLoading && ' (refreshing...)'}
      </div>
      <div>Next Quiz: #{nonce + 1}</div>
      <button 
        onClick={refreshNonce}
        disabled={isLoading}
        style={{ 
          marginTop: '5px', 
          padding: '2px 6px', 
          fontSize: '10px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
};
