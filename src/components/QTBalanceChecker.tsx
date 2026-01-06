import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { base } from 'wagmi/chains';
import { formatUnits } from 'viem';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

// ERC20 ABI with all standard functions
const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// QT Token Address on Base
const QT_TOKEN_ADDRESS = '0x361faAea711B20caF59726e5f478D745C187cB07' as `0x${string}`;
const MIN_REQUIRED_QT = 5000000; // 5M QT

interface QTBalanceCheckerProps {
  onBalanceVerified?: (hasEnough: boolean, balance: number) => void;
}

export default function QTBalanceChecker({ onBalanceVerified }: QTBalanceCheckerProps) {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });
  
  const [manualBalance, setManualBalance] = useState<number | null>(null);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [contractExists, setContractExists] = useState<boolean | null>(null);
  
  // Check if wallet is on Base network
  const isOnBaseNetwork = chainId === base.id;

  // Read token decimals
  const { data: decimalsData } = useReadContract({
    address: QT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: base.id,
  });

  // Read token symbol
  const { data: symbolData } = useReadContract({
    address: QT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'symbol',
    chainId: base.id,
  });

  // Read token name
  const { data: nameData } = useReadContract({
    address: QT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'name',
    chainId: base.id,
  });

  // Read wallet balance
  const { 
    data: walletBalanceRaw, 
    error: balanceError, 
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
    isError: isBalanceError,
  } = useReadContract({
    address: QT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: base.id,
    query: {
      enabled: !!address && !!QT_TOKEN_ADDRESS && isConnected && isOnBaseNetwork,
      refetchInterval: 10000,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
  });

  // Manual balance check using publicClient (fallback)
  const checkBalanceManually = async () => {
    if (!address || !publicClient) return;
    
    setIsManualChecking(true);
    try {
      // First verify the contract exists
      const code = await publicClient.getBytecode({ 
        address: QT_TOKEN_ADDRESS 
      });
      
      if (!code || code === '0x') {
        setContractExists(false);
        setDebugInfo((prev: any) => ({
          ...prev,
          error: 'Contract does not exist at this address on Base network',
          code: code || 'none'
        }));
        return;
      }
      
      setContractExists(true);
      
      // Try to read balance directly
      const balance = await publicClient.readContract({
        address: QT_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      
      const decimals = decimalsData || 18;
      const balanceFormatted = parseFloat(formatUnits(balance as bigint, decimals));
      
      setManualBalance(balanceFormatted);
      setDebugInfo((prev: any) => ({
        ...prev,
        manualCheck: true,
        rawBalance: balance?.toString(),
        formattedBalance: balanceFormatted,
        decimals,
      }));
      
    } catch (error: any) {
      console.error('Manual balance check failed:', error);
      setDebugInfo((prev: any) => ({
        ...prev,
        manualCheckError: error.message,
        errorDetails: error,
      }));
    } finally {
      setIsManualChecking(false);
    }
  };

  // Verify contract on mount
  useEffect(() => {
    if (!publicClient) return;
    
    const verifyContract = async () => {
      try {
        const code = await publicClient.getBytecode({ 
          address: QT_TOKEN_ADDRESS 
        });
        setContractExists(code !== '0x' && !!code);
        
        setDebugInfo((prev: any) => ({
          ...prev,
          contractCode: code ? 'exists' : 'none',
          contractAddress: QT_TOKEN_ADDRESS,
        }));
      } catch (error: any) {
        console.error('Contract verification failed:', error);
        setContractExists(false);
      }
    };
    
    verifyContract();
  }, [publicClient]);

  // Update debug info
  useEffect(() => {
    setDebugInfo({
      address,
      isConnected,
      chainId,
      isOnBaseNetwork,
      expectedChainId: base.id,
      tokenAddress: QT_TOKEN_ADDRESS,
      tokenSymbol: symbolData,
      tokenName: nameData,
      tokenDecimals: decimalsData,
      walletBalanceRaw: walletBalanceRaw?.toString(),
      isLoading: isBalanceLoading,
      hasError: isBalanceError,
      error: balanceError?.message,
      contractExists,
    });
  }, [address, isConnected, chainId, isOnBaseNetwork, symbolData, nameData, decimalsData, walletBalanceRaw, isBalanceLoading, isBalanceError, balanceError, contractExists]);

  // Calculate balance
  const decimals = decimalsData || 18;
  const walletBalance = walletBalanceRaw 
    ? parseFloat(formatUnits(walletBalanceRaw, decimals))
    : manualBalance || 0;

  const hasEnoughTokens = walletBalance >= MIN_REQUIRED_QT;

  // Notify parent component
  useEffect(() => {
    if (onBalanceVerified && walletBalance !== null) {
      onBalanceVerified(hasEnoughTokens, walletBalance);
    }
  }, [hasEnoughTokens, walletBalance, onBalanceVerified]);

  const formatTokenAmount = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900">Wallet Not Connected</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Please connect your wallet to verify your QT token balance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isOnBaseNetwork) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Wrong Network</h3>
            <p className="text-sm text-red-700 mt-1">
              Please switch to Base network (Chain ID: {base.id}). Current chain: {chainId}
            </p>
            <button
              onClick={() => window.ethereum?.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${base.id.toString(16)}` }],
              })}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
            >
              Switch to Base Network
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (contractExists === false) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Invalid Token Contract</h3>
            <p className="text-sm text-red-700 mt-1">
              The QT token contract does not exist at address: <br />
              <code className="bg-red-100 px-2 py-1 rounded text-xs">{QT_TOKEN_ADDRESS}</code>
            </p>
            <p className="text-xs text-red-600 mt-2">
              Please verify the token address is correct on Base network.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isBalanceLoading || isManualChecking) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <h3 className="font-semibold text-blue-900">Checking Balance...</h3>
            <p className="text-sm text-blue-700 mt-1">
              Verifying your QT token holdings on Base network
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isBalanceError && !manualBalance) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900">Balance Check Failed</h3>
            <p className="text-sm text-orange-700 mt-1">
              {balanceError?.message || 'Unable to read balance from contract'}
            </p>
            <button
              onClick={checkBalanceManually}
              disabled={isManualChecking}
              className="mt-3 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
            >
              {isManualChecking ? 'Checking...' : 'Try Manual Check'}
            </button>
            <button
              onClick={() => refetchBalance()}
              className="mt-3 ml-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700"
            >
              Retry
            </button>
            
            {/* Debug Information */}
            <details className="mt-3">
              <summary className="text-xs text-orange-600 cursor-pointer">
                Show Debug Info
              </summary>
              <pre className="text-xs bg-orange-100 p-2 rounded mt-2 overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${
      hasEnoughTokens 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-start gap-3">
        {hasEnoughTokens ? (
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
        )}
        <div className="flex-1">
          <h3 className={`font-semibold ${
            hasEnoughTokens ? 'text-green-900' : 'text-red-900'
          }`}>
            {hasEnoughTokens ? '✅ Eligible' : '❌ Insufficient QT Tokens'}
          </h3>
          
          <div className="mt-2 space-y-1 text-sm">
            <div className={hasEnoughTokens ? 'text-green-700' : 'text-red-700'}>
              <span className="font-medium">Your Balance:</span>{' '}
              <span className="font-bold">{formatTokenAmount(walletBalance)} QT</span>
            </div>
            <div className={hasEnoughTokens ? 'text-green-700' : 'text-red-700'}>
              <span className="font-medium">Required:</span>{' '}
              <span>{formatTokenAmount(MIN_REQUIRED_QT)} QT</span>
            </div>
            
            {!hasEnoughTokens && (
              <div className="text-red-700 mt-2">
                <span className="font-medium">You need:</span>{' '}
                <span className="font-bold">
                  {formatTokenAmount(MIN_REQUIRED_QT - walletBalance)} QT more
                </span>
              </div>
            )}
          </div>

          {symbolData && (
            <div className="mt-3 text-xs text-gray-600">
              Token: {nameData || symbolData} ({symbolData})
            </div>
          )}
          
          <button
            onClick={() => refetchBalance()}
            className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Balance
          </button>
        </div>
      </div>
    </div>
  );
}

