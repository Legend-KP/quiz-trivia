  "use client";

  import React, { useState, useEffect, useCallback, useRef } from 'react';
  import { useMiniApp } from '@neynar/react';
  import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useConnect, useChainId, useSwitchChain } from 'wagmi';
  import { base } from 'wagmi/chains';
  import { CheckCircle, XCircle } from 'lucide-react';
  import { formatUnits, parseUnits } from 'viem';
  import { createWalletClient, createPublicClient, custom } from 'viem';
  import { config } from '~/components/providers/WagmiProvider';
import sdk from '@farcaster/miniapp-sdk';
import { APP_URL, APP_NAME } from '~/lib/constants';
  import {
    formatQT,
    BET_MODE_MULTIPLIERS,
    MIN_BET,
    MAX_BET,
    calculatePayout,
  } from '~/lib/betMode';
  import { BET_MODE_VAULT_ABI, getBetModeVaultAddress } from '~/lib/betModeVault';

// ERC20 ABI - Complete with all necessary functions
const ERC20_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

  type BetModeScreen = 'entry' | 'bet-selection' | 'game' | 'cash-out' | 'loss' | 'info' | 'closed';

  interface BetModeStatus {
    window: {
      isOpen: boolean;
      timeUntilOpen?: string;
      timeUntilClose?: string;
      timeUntilSnapshot?: string;
      timeUntilDraw?: string;
    };
    balance: {
      qtBalance: number;
      qtLockedBalance: number;
      availableBalance: number;
      walletBalance?: number; // On-chain wallet balance
    };
    activeGame: {
      gameId: string;
      betAmount: number;
      currentQuestion: number;
    } | null;
    weeklyPool: {
      toBurnAccumulated: number;
      totalLosses: number;
      platformRevenue: number;
    } | null;
  }

  interface BetModeTabProps {
    onExit?: () => void;
    openDepositModal?: boolean;
    openWithdrawModal?: boolean;
  }

  export function BetModeTab({ onExit, openDepositModal, openWithdrawModal }: BetModeTabProps = {}) {
    const { context, actions } = useMiniApp();
    const { address, isConnected, chainId: accountChainId } = useAccount();
    const { connect, connectors } = useConnect();
    const currentChainId = useChainId();
    const { switchChain } = useSwitchChain();
    
  // Get QT token address from environment (client-side safe)
  // Fallback to hardcoded address if env var not set
  const QT_TOKEN_ADDRESS = "0x361faAea711B20caF59726e5f478D745C187cB07";
  const qtTokenAddress = (process.env.NEXT_PUBLIC_QT_TOKEN_ADDRESS || QT_TOKEN_ADDRESS) as `0x${string}`;
  
  const [screen, setScreen] = useState<BetModeScreen>('entry');
  const screenRef = useRef<BetModeScreen>(screen);
  const [status, setStatus] = useState<BetModeStatus | null>(null);
  
  // Track if modals were opened from props to prevent reopening
  const depositModalOpenedFromProps = useRef(false);
  const withdrawModalOpenedFromProps = useRef(false);
  
  // Track transaction progress to prevent modal reopening during 2-step transactions
  const isDepositInProgress = useRef(false);
  const isWithdrawInProgress = useRef(false);
  // Persist the latest amounts across async flows (avoid reading cleared state)
  const currentDepositAmount = useRef<number>(0);
  const currentWithdrawAmount = useRef<number>(0);
  // Debounce sync calls to prevent multiple simultaneous syncs
  const lastSyncTime = useRef<number>(0);
  const SYNC_DEBOUNCE_MS = 5000; // Only allow sync once every 5 seconds
  
  // Keep screenRef in sync with screen state
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  const [betAmount, setBetAmount] = useState<number>(MIN_BET);
  const [customBet, setCustomBet] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Deposit state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositing, setDepositing] = useState(false);
  const [depositStep, setDepositStep] = useState<'input' | 'approving' | 'depositing' | 'confirming'>('input');
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | undefined>();
  const [isDepositPending, setIsDepositPending] = useState(false);
  const [writeContractError, setWriteContractError] = useState<Error | null>(null);
  const [platformWallet, setPlatformWallet] = useState<string | null>(null);
  const [platformWalletError, setPlatformWalletError] = useState<string | null>(null);
  const [walletBalanceError, setWalletBalanceError] = useState<string | null>(null);
  
  // Withdrawal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<'input' | 'preparing' | 'withdrawing' | 'confirming'>('input');
  const [withdrawTxHash, setWithdrawTxHash] = useState<`0x${string}` | undefined>();
  const [withdrawalSuccess, setWithdrawalSuccess] = useState<{
    amount: number;
    txHash: string;
  } | null>(null);
  
  // Contract address (check if contract is configured)
  const contractAddress = (() => {
    try {
      return getBetModeVaultAddress();
    } catch {
      return null;
    }
  })();
  
  // Read QT token balance from wallet
  // Only enable if we have a valid address and token address
  const { data: walletBalanceRaw, error: balanceError } = useReadContract({
    address: qtTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: base.id,
    query: {
      enabled: !!address && !!qtTokenAddress && isConnected && typeof address === 'string',
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });
  
  // Convert balance from wei to QT (18 decimals) - use useState for walletBalance
  const [walletBalance, setWalletBalance] = useState<number>(0);
  
  // Handle balance parsing in useEffect to avoid calling setState during render
  useEffect(() => {
    if (walletBalanceRaw) {
      try {
        const balance = parseFloat(formatUnits(walletBalanceRaw, 18));
        setWalletBalance(balance);
        setWalletBalanceError(null);
      } catch (err: any) {
        console.warn('Error parsing wallet balance:', err);
        setWalletBalanceError('Failed to read wallet balance');
        setWalletBalance(0);
      }
    } else {
      setWalletBalance(0);
    }
  }, [walletBalanceRaw]);
  
  // Log balance errors for debugging
  useEffect(() => {
    if (balanceError) {
      console.warn('Error reading wallet balance from contract:', balanceError);
    }
  }, [balanceError]);
    
  // Wagmi hooks for deposit transaction confirmation (using state-managed hash)
  const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  });
  
  // Wagmi hooks for withdrawal transaction confirmation
  const { isSuccess: isWithdrawConfirmed } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
  });
  
  // Read allowance for deposit
  const { data: allowanceRaw } = useReadContract({
    address: qtTokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && contractAddress ? [address, contractAddress] : undefined,
    chainId: base.id,
    query: {
      enabled: !!address && !!contractAddress && isConnected,
      refetchInterval: 5000,
    },
  });
  
  // Handle writeContract errors
  useEffect(() => {
    if (writeContractError) {
      console.error('Write contract error:', writeContractError);
      setError(writeContractError.message || 'Transaction failed. Please try again.');
      setDepositing(false);
      setIsDepositPending(false);
      setDepositStep('input');
    }
  }, [writeContractError]);

    // Game state
    const [currentGame, setCurrentGame] = useState<any>(null);
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [gameResult, setGameResult] = useState<any>(null);
    // 30 second timer per question (time limit to answer)
    const [questionTimerEnd, setQuestionTimerEnd] = useState<number | null>(null);
    const [timerDisplay, setTimerDisplay] = useState<number>(30);

    // Get time limit for each question based on question number
    const getQuestionTimeLimit = (questionNumber: number): number => {
      if (questionNumber >= 1 && questionNumber <= 4) return 30; // Q1-Q4: 30 seconds
      if (questionNumber === 5) return 25; // Q5: 25 seconds
      if (questionNumber === 6 || questionNumber === 7) return 20; // Q6-Q7: 20 seconds
      if (questionNumber === 8 || questionNumber === 9) return 15; // Q8-Q9: 15 seconds
      if (questionNumber === 10) return 10; // Q10: 10 seconds
      return 30; // Default fallback
    };

    const loadGameState = useCallback(async (_gameId: string) => {
      // In a real implementation, you'd fetch the current question
      // For now, we'll handle it through the answer flow
    }, []);

    // Fetch status
    const fetchStatus = useCallback(async () => {
      const fid = context?.user?.fid;
      
      // If no fid, set default status to prevent infinite loading
      if (!fid) {
        setStatus({
          window: {
            isOpen: true,
          },
          balance: {
            qtBalance: 0,
            qtLockedBalance: 0,
            availableBalance: 0,
            walletBalance: walletBalance || 0,
          },
          activeGame: null,
          weeklyPool: null,
        });
        // Only change screen to 'entry' if not on a preserved screen
        const screensToPreserve: BetModeScreen[] = ['info', 'bet-selection', 'cash-out', 'loss'];
        if (!screensToPreserve.includes(screenRef.current)) {
        setScreen('entry');
        }
        return;
      }

      try {
        // Build status URL - wallet balance is now fetched client-side via Wagmi
        const res = await fetch(`/api/bet-mode/status?fid=${fid}`);
        
        if (!res.ok) {
          // Try to get error message from response
          let errorMessage = `Status API returned ${res.status}`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If response is not JSON, use status text
            errorMessage = res.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        const data = await res.json();
        
        // Validate response data structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format from status API');
        }
        
        // Merge wallet balance from Wagmi into status
        if (isConnected && address) {
          data.balance = {
            ...data.balance,
            walletBalance: walletBalance || 0, // Add wallet balance from Wagmi
          };
        }
        
        setStatus(data);
        setError(null); // Clear any previous errors

        // Determine screen based on status
        // Always switch to 'game' if there's an activeGame and not on a terminal/preserved screen
        const screensToPreserve: BetModeScreen[] = ['info', 'bet-selection', 'cash-out', 'loss'];
        if (data.activeGame) {
          if (!screensToPreserve.includes(screenRef.current)) {
            setScreen('game');
            await loadGameState(data.activeGame.gameId);
          }
        } else {
          if (!screensToPreserve.includes(screenRef.current)) {
            setScreen('entry');
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch status:', err);
        
        // Set default status on error to prevent infinite loading
        const defaultStatus: BetModeStatus = {
          window: {
            isOpen: true,
            // timeUntilDraw and timeUntilSnapshot are optional, so omit them
          },
          balance: {
            qtBalance: 0,
            qtLockedBalance: 0,
            availableBalance: 0,
            walletBalance: walletBalance || 0,
          },
          activeGame: null,
          weeklyPool: null,
        };
        
        setStatus(defaultStatus);
        
        // Only change screen to 'entry' on error if not on a preserved screen
        const screensToPreserve: BetModeScreen[] = ['info', 'bet-selection', 'cash-out', 'loss'];
        if (!screensToPreserve.includes(screenRef.current)) {
        setScreen('entry');
        }
        
        // Show user-friendly error message
        const errorMsg = err?.message || 'Failed to load Bet Mode status';
        setError(errorMsg.includes('Failed to get status') 
          ? 'Unable to connect to Bet Mode service. Please check your connection and try again.' 
          : errorMsg);
      }
    }, [
      context?.user?.fid,
      loadGameState,
      isConnected,
      address,
      walletBalance,
    ]);

    useEffect(() => {
      // Initial fetch
      fetchStatus();
      const interval = setInterval(fetchStatus, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }, [fetchStatus]);

    // Open deposit modal if requested from homepage (only once when prop changes to true)
    // Prevent reopening during transaction flow
    useEffect(() => {
      if (openDepositModal && !depositModalOpenedFromProps.current && !showDepositModal && !isDepositInProgress.current) {
        setShowDepositModal(true);
        depositModalOpenedFromProps.current = true;
      } else if (!openDepositModal) {
        // Reset flag when prop becomes false
        depositModalOpenedFromProps.current = false;
      }
    }, [openDepositModal, showDepositModal]);

    // Auto-connect wallet when deposit modal opens in Farcaster
    useEffect(() => {
      if (showDepositModal && !isConnected && context?.user?.fid && connectors.length > 0) {
        const isInFarcasterClient = typeof window !== 'undefined' && 
          (window.location.href.includes('warpcast.com') || 
           window.location.href.includes('farcaster') ||
           window.ethereum?.isFarcaster ||
           context?.client);
        
        if (isInFarcasterClient) {
          console.log('Auto-connecting wallet for deposit...');
          try {
            connect({ 
              connector: connectors[0],
              chainId: base.id,
            });
          } catch (error) {
            console.error('Auto-connection failed:', error);
          }
        }
      }
    }, [showDepositModal, isConnected, context?.user?.fid, connectors, connect, context?.client]);

    // Open withdraw modal if requested from homepage (only once when prop changes to true)
    // Prevent reopening during transaction flow
    useEffect(() => {
      if (openWithdrawModal && !withdrawModalOpenedFromProps.current && !showWithdrawModal && !isWithdrawInProgress.current) {
        setShowWithdrawModal(true);
        withdrawModalOpenedFromProps.current = true;
      } else if (!openWithdrawModal) {
        // Reset flag when prop becomes false
        withdrawModalOpenedFromProps.current = false;
      }
    }, [openWithdrawModal, showWithdrawModal]);
    
  // Fetch platform wallet address (optional - only needed for deposit verification)
  useEffect(() => {
    let isMounted = true;
    
    fetch('/api/bet-mode/platform-wallet')
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        
        if (data.address) {
          setPlatformWallet(data.address);
          setPlatformWalletError(null);
        } else {
          // Platform wallet not configured - this is OK, just set to null
          setPlatformWallet(null);
          setPlatformWalletError(null);
        }
      })
      .catch(err => {
        if (!isMounted) return;
        // Silently handle error - platform wallet is optional
        setPlatformWallet(null);
        setPlatformWalletError(null);
      });
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Clear active games when entering bet mode entry screen
  useEffect(() => {
    if (screen !== 'entry') return;
    
    const clearActiveGame = async () => {
      const fid = context?.user?.fid;
      if (!fid) return;
      
      try {
        const res = await fetch('/api/bet-mode/clear-active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid }),
        });
        if (res.ok) {
          // Refresh status after clearing to update balance
          fetchStatus();
        }
      } catch (err) {
        // Silently handle - not critical
        console.error('Failed to clear active game on entry:', err);
      }
    };
    
    clearActiveGame();
  }, [screen, context?.user?.fid, fetchStatus]);
    
  // Handle deposit verification with useCallback to avoid stale closures
  const handleDepositVerification = useCallback(async (txHash: string) => {
    const fid = context?.user?.fid;
    if (!fid) return;
    
    try {
      setDepositing(true);
      const res = await fetch('/api/bet-mode/deposit/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, txHash }),
      });
      
      const data = await res.json();
      if (data.success) {
        setError(null);
        setShowDepositModal(false);
        depositModalOpenedFromProps.current = false; // Reset flag
        isDepositInProgress.current = false; // Reset transaction progress flag
        setDepositAmount('');
        await fetchStatus(); // Refresh balance
      } else {
        setError(data.error || 'Failed to verify deposit');
        isDepositInProgress.current = false; // Reset transaction progress flag on error
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify deposit');
      isDepositInProgress.current = false; // Reset transaction progress flag on error
    } finally {
      setDepositing(false);
    }
  }, [context?.user?.fid, fetchStatus]);
  
  // Handle deposit transaction confirmation
  useEffect(() => {
    // Prevent deposit confirmation from firing during withdrawal
    if (isDepositConfirmed && depositTxHash && !isWithdrawInProgress.current && !withdrawing) {
      // If using contract, events will handle DB update automatically
      // Otherwise, use manual verification
      if (!contractAddress) {
        handleDepositVerification(depositTxHash);
      } else {
        // Contract deposit - events will sync DB, but add manual sync and polling
        setDepositing(false);
        setDepositStep('input');
        setShowDepositModal(false);
        depositModalOpenedFromProps.current = false; // Reset flag
        isDepositInProgress.current = false; // Reset transaction progress flag
        
        // Store the amount for success message (use ref to avoid cleared state)
        const finalAmount = currentDepositAmount.current;
        setDepositAmount('');
        
        // Set success state
        setDepositSuccess({
          amount: finalAmount,
          txHash: depositTxHash,
        });
        
        // Poll for balance update (events might take a few seconds to process)
        let pollCount = 0;
        const maxPolls = 10; // Reduced from 15 - poll for up to 30 seconds (10 * 3s)
        
        // Single sync attempt after 3 seconds (give event listener time to process)
        const syncTimeout = setTimeout(() => {
          const now = Date.now();
          // Debounce: only sync if enough time has passed since last sync
          if (now - lastSyncTime.current < SYNC_DEBOUNCE_MS) {
            console.log('Sync debounced, skipping...');
            return;
          }
          
          if (address && context?.user?.fid) {
            lastSyncTime.current = now;
            fetch('/api/bet-mode/deposit/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fid: context.user.fid,
                walletAddress: address,
              }),
            }).then((syncRes) => {
              syncRes.json().then((syncData) => {
                if (syncData.synced) {
                  fetchStatus(); // Refresh after sync
                }
              });
            }).catch((syncError) => {
              console.warn('Manual sync failed, will rely on event listener:', syncError);
            });
          }
        }, 3000);
        
        // Immediate refresh
        fetchStatus();
        
        const pollInterval = setInterval(() => {
          pollCount++;
          fetchStatus();
          
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            // Final refresh after polling completes
            setTimeout(() => fetchStatus(), 1000);
          }
        }, 3000); // Poll every 3 seconds (reduced from 2s)
        
        // Cleanup on unmount
        return () => {
          clearInterval(pollInterval);
          clearTimeout(syncTimeout);
        };
      }
    }
  }, [isDepositConfirmed, depositTxHash, handleDepositVerification, contractAddress, fetchStatus, address, context?.user?.fid]);
  
  // Store withdrawal amount before clearing (for success message)
  const [withdrawnAmount, setWithdrawnAmount] = useState<number>(0);
  
  // Deposit success state
  const [depositSuccess, setDepositSuccess] = useState<{
    amount: number;
    txHash: string;
  } | null>(null);

  // Handle withdrawal transaction confirmation
  useEffect(() => {
    // Prevent withdrawal confirmation from firing during deposit
    if (isWithdrawConfirmed && withdrawTxHash && !isDepositInProgress.current && !depositing) {
      // Contract withdrawal - events will sync DB, but add polling to ensure balance updates
      setWithdrawing(false);
      setWithdrawStep('input');
      setShowWithdrawModal(false);
      withdrawModalOpenedFromProps.current = false; // Reset flag
      isWithdrawInProgress.current = false; // Reset transaction progress flag
      
      // Store the amount before clearing (use ref to avoid cleared state)
      const finalAmount = currentWithdrawAmount.current;
      setWithdrawAmount('');
      
      // Set success state immediately
      setWithdrawalSuccess({
        amount: finalAmount,
        txHash: withdrawTxHash,
      });
      
      // Immediate refresh
      fetchStatus();
      
      // Poll for balance update (events might take a few seconds to process)
      let pollCount = 0;
      const maxPolls = 15; // Poll for up to 30 seconds (15 * 2s)
      
      // Try manual sync once after a delay (event listener should handle it, but sync as backup)
      // Only sync once to avoid creating multiple transaction records
      const performSync = async () => {
        const now = Date.now();
        // Debounce: only sync if enough time has passed since last sync
        if (now - lastSyncTime.current < SYNC_DEBOUNCE_MS) {
          console.log('Sync debounced, skipping...');
          return;
        }
        
        if (address && context?.user?.fid) {
          lastSyncTime.current = now;
          try {
            const syncRes = await fetch('/api/bet-mode/deposit/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fid: context.user.fid,
                walletAddress: address,
              }),
            });
            const syncData = await syncRes.json();
            if (syncData.synced) {
              console.log('Balance synced successfully:', syncData);
              fetchStatus(); // Refresh status after sync
            }
          } catch (syncError) {
            console.warn('Manual sync failed, will rely on event listener:', syncError);
          }
        }
      };
      
      // Single sync attempt after 3 seconds (give event listener time to process)
      const syncTimeout = setTimeout(() => {
        performSync();
      }, 3000);
      
      // Poll for balance update (reduced frequency)
      const pollInterval = setInterval(() => {
        pollCount++;
        fetchStatus();
        
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          // Final refresh after polling completes
          setTimeout(() => fetchStatus(), 1000);
        }
      }, 3000); // Poll every 3 seconds (reduced from 2s)
      
      // Cleanup on unmount
      return () => {
        clearInterval(pollInterval);
        clearTimeout(syncTimeout);
      };
    }
  }, [isWithdrawConfirmed, withdrawTxHash, fetchStatus, address, context?.user?.fid]);
    
    const handleDeposit = async () => {
      // Prevent double-click / multiple simultaneous calls
      if (depositing || isDepositPending || isDepositConfirming || isDepositInProgress.current) {
        console.log('Deposit already in progress, ignoring duplicate call');
        return;
      }
      
      // Contract-based deposit flow (required)
      if (!contractAddress) {
        setError('Bet Mode Vault contract is not configured. Please contact support.');
        return;
      }
      
      // Contract-based deposit flow
      if (!address) {
        setError('Please connect your wallet first.');
        return;
      }
      
      if (!depositAmount || depositAmount.trim() === '') {
        setError('Please enter deposit amount');
        return;
      }
      
      const amount = parseFloat(depositAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Invalid deposit amount');
        return;
      }
      
      const MIN_DEPOSIT = 1000; // 1K QT minimum
      if (amount < MIN_DEPOSIT) {
        setError(`Minimum deposit is ${formatQT(MIN_DEPOSIT)}`);
        return;
      }
      
      if (amount > walletBalance) {
        setError(`Insufficient wallet balance. You have ${formatQT(walletBalance)} QT.`);
        return;
      }
      
      // Persist amount for success modal before any async clears state
      currentDepositAmount.current = amount;
      
      try {
        // Mark transaction as in progress BEFORE starting (prevents modal reopening)
        isDepositInProgress.current = true;
        // Clear any pending withdrawal state to prevent cross-triggering
        setWithdrawTxHash(undefined);
        setWithdrawalSuccess(null);
        setWithdrawing(false);
        setDepositing(true);
        setError(null);
        
        // Ensure we're on Base chain before proceeding
        const targetChainId = base.id;
        if (currentChainId && currentChainId !== targetChainId && switchChain) {
          try {
            console.log('Switching to Base chain...');
            await switchChain({ chainId: targetChainId });
            // Wait for chain switch to complete
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (switchError: any) {
            // If user rejects or switch fails, continue anyway
            if (!switchError.message?.includes('User rejected')) {
              console.warn('Chain switch failed, continuing anyway:', switchError);
            }
          }
        }
        
        // Convert to wei (18 decimals)
        const amountWei = parseUnits(amount.toFixed(18), 18);
        
        // Step 1: Check and approve if needed
        const currentAllowance = allowanceRaw || BigInt(0);
        
        // Get wallet provider - try multiple sources for Farcaster web compatibility
        let provider: any = null;
        
        // Try Farcaster SDK first (for Farcaster clients)
        try {
          const farcasterProvider = await sdk.wallet.getEthereumProvider();
          if (farcasterProvider) {
            console.log('Using Farcaster SDK provider');
            provider = farcasterProvider;
          }
        } catch (e) {
          console.warn('Farcaster SDK provider not available:', e);
        }
        
        // Try window.ethereum (standard Web3 provider)
        if (!provider && typeof window !== 'undefined' && window.ethereum) {
          console.log('Using window.ethereum provider');
          provider = window.ethereum;
        }
        
        if (!provider) {
          throw new Error('No wallet provider found. Please ensure your wallet is connected and try again.');
        }
        
        if (!address) {
          throw new Error('No wallet address found. Please connect your wallet.');
        }
        
        // Create a custom transport that handles eth_chainId requests
        // Wrap the provider to intercept and handle chainId requests
        const customProvider = {
          ...provider,
          request: async (args: any) => {
            // If the request is for chainId, return Base chain ID directly
            if (args.method === 'eth_chainId' || args.method === 'eth_chainld') {
              return `0x${base.id.toString(16)}`;
            }
            // For other requests, use the original provider
            return provider.request(args);
          },
        };
        
        // Create wallet client directly from provider to bypass wagmi
        const walletClient = createWalletClient({
          account: address as `0x${string}`,
          chain: base,
          transport: custom(customProvider),
        });
        
        if (currentAllowance < amountWei) {
          setDepositStep('approving');
          console.log('Requesting approval...');
          
          // Use wallet client's writeContract method directly to bypass wagmi's getChainId check
          const approveHash = await walletClient.writeContract({
            account: address as `0x${string}`,
            address: qtTokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [contractAddress, amountWei],
          });
          
          console.log('Approval transaction hash:', approveHash);
          
          // Wait for approval transaction to be confirmed
          const publicClient = createPublicClient({
            chain: base,
            transport: custom(customProvider),
          });
          
          try {
            const receipt = await publicClient.waitForTransactionReceipt({
              hash: approveHash,
              timeout: 60_000, // 60 seconds timeout
            });
            
            if (receipt.status !== 'success') {
              throw new Error('Approval transaction failed');
            }
            
            console.log('Approval confirmed:', receipt);
          } catch (approvalError: any) {
            console.error('Approval confirmation error:', approvalError);
            // If user rejected, throw error
            if (approvalError.message?.includes('User rejected') || approvalError.message?.includes('denied')) {
              throw new Error('Approval cancelled by user');
            }
            // Otherwise, continue - approval might still be processing
            console.warn('Approval confirmation failed, but continuing...');
          }
        }
        
        // Step 2: Call contract.deposit()
        setDepositStep('depositing');
        setIsDepositPending(true);
        console.log('Depositing to contract...');
        
        // Use wallet client's writeContract method directly to bypass wagmi's getChainId check
        const depositHash = await walletClient.writeContract({
          account: address as `0x${string}`,
          address: contractAddress,
          abi: BET_MODE_VAULT_ABI,
          functionName: 'deposit',
          args: [amountWei],
        });
        
        console.log('Deposit transaction hash:', depositHash);
        
        // Store hash in state so useWaitForTransactionReceipt can track it
        setDepositTxHash(depositHash);
        setIsDepositPending(false);
        
        // Step 3: Wait for confirmation (handled by useWaitForTransactionReceipt)
        setDepositStep('confirming');
        
      } catch (err: any) {
        console.error('Deposit error:', err);
        
        let errorMessage = 'Failed to initiate deposit';
        
        if (err.message?.includes('insufficient funds') || err.message?.includes('gas')) {
          errorMessage = 'Insufficient ETH for gas fees. Please add ETH to your wallet.';
        } else if (err.message?.includes('User rejected') || err.message?.includes('denied') || err.message?.includes('rejected')) {
          errorMessage = 'Transaction cancelled by user.';
        } else if (err.message?.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (err.shortMessage) {
          errorMessage = err.shortMessage;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        setWriteContractError(err);
        setDepositing(false);
        setIsDepositPending(false);
        setDepositStep('input');
        // Reset transaction progress flag on error
        isDepositInProgress.current = false;
      }
    };
    
    const handleBuyQT = async () => {
      try {
        const QT_TOKEN_ADDRESS = "0x361faAea711B20caF59726e5f478D745C187cB07";
        const CHAIN_ID = "8453"; // Base Mainnet
        const TOKEN_ASSET_ID = `eip155:${CHAIN_ID}/erc20:${QT_TOKEN_ADDRESS}`;
        
        // Open QT token in Farcaster wallet where user can buy it
        await sdk.actions.viewToken({ token: TOKEN_ASSET_ID });
      } catch (err: any) {
        console.error('Failed to open QT token:', err);
        setError('Failed to open wallet. Please try again.');
      }
    };

    const handleAnswer = useCallback(async (answerIndex: number | null) => {
      if (!currentGame) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/bet-mode/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: currentGame.gameId,
            fid: context?.user?.fid,
            answerIndex: answerIndex ?? -1, // -1 for timeout
            walletAddress: address || undefined, // Include wallet address for contract sync
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to process answer');
        }

        if (data.result === 'lost') {
          setGameResult({ type: 'loss', ...data });
          setScreen('loss');
        } else if (data.result === 'won') {
          setGameResult({ type: 'win', ...data });
          setScreen('cash-out');
        } else if (data.result === 'correct') {
          // Continue to next question
          if (data.nextQuestion) {
            setCurrentQuestion(data.nextQuestion);
            setSelectedAnswer(null);
            // Start timer for next question based on question number
            const questionNum = data.nextQuestion.questionNumber || 1;
            const timeLimit = getQuestionTimeLimit(questionNum) * 1000; // Convert to milliseconds
            const timerEnd = Date.now() + timeLimit;
            setQuestionTimerEnd(timerEnd);
            setTimerDisplay(getQuestionTimeLimit(questionNum));
            setCurrentGame((prev: any) => ({
              ...prev,
              currentQuestion: data.nextQuestion.questionNumber,
            }));
          } else {
            // No next question - game complete (shouldn't happen, but handle it)
            setGameResult({ type: 'win', ...data });
            setScreen('cash-out');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to process answer');
      } finally {
        setLoading(false);
      }
    }, [currentGame, context?.user?.fid]);

    // 30 second timer per question (time limit to answer, works even when app is in background)
    useEffect(() => {
      if (questionTimerEnd === null || screen !== 'game' || gameResult) {
        return;
      }

      let timeoutTriggered = false;

      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((questionTimerEnd - now) / 1000));
        setTimerDisplay(remaining);

        if (remaining === 0 && selectedAnswer === null && !loading && !timeoutTriggered) {
          // Time's up - auto-submit as wrong answer (null = timeout)
          timeoutTriggered = true;
          setQuestionTimerEnd(null);
          handleAnswer(null);
        } else if (remaining === 0) {
          setQuestionTimerEnd(null);
        }
      };

      // Update immediately
      updateTimer();

      // Update every second
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    }, [questionTimerEnd, screen, gameResult, selectedAnswer, loading, handleAnswer]);

  const handleStartGameClick = () => {
    // Navigate to bet selection screen
    setScreen('bet-selection');
    setError(null);
  };

  const handleStartGame = async () => {
    const fid = context?.user?.fid;
    if (!fid) {
      setError('Farcaster authentication required. Please reload the app.');
      return;
    }

      const amount = customBet ? Number(customBet) : betAmount;

      if (amount < MIN_BET || amount > MAX_BET) {
        setError(`Bet must be between ${formatQT(MIN_BET)} and ${formatQT(MAX_BET)}`);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Clear any existing active game before starting a new one
        try {
          await fetch('/api/bet-mode/clear-active', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fid }),
          });
        } catch (clearErr) {
          // Continue even if clearing fails - start endpoint will handle it
          console.error('Failed to clear active game:', clearErr);
        }

        const res = await fetch('/api/bet-mode/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid, betAmount: amount }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to start game');
        }

        setCurrentGame(data);
        setCurrentQuestion(data.question);
        // Start timer for first question based on question number
        const questionNum = data.question?.questionNumber || 1;
        const timeLimit = getQuestionTimeLimit(questionNum) * 1000; // Convert to milliseconds
        const timerEnd = Date.now() + timeLimit;
        setQuestionTimerEnd(timerEnd);
        setTimerDisplay(getQuestionTimeLimit(questionNum));
        setScreen('game');
      } catch (err: any) {
        setError(err.message || 'Failed to start game');
      } finally {
        setLoading(false);
      }
    };

    const handleCashOut = async () => {
      if (!currentGame) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/bet-mode/cash-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: currentGame.gameId,
            fid: context?.user?.fid,
            walletAddress: address || undefined, // Include wallet address for contract sync
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to cash out');
        }

        setGameResult({ type: 'cash-out', ...data });
        setScreen('cash-out');
      } catch (err: any) {
        setError(err.message || 'Failed to cash out');
      } finally {
        setLoading(false);
      }
    };

  const handleContinue = () => {
      // Continue to next question (already handled in handleAnswer)
      setSelectedAnswer(null);
    };

  const handlePlayAgain = async () => {
      // Clear any active games before starting fresh
      const fid = context?.user?.fid;
      if (fid) {
        try {
          await fetch('/api/bet-mode/clear-active', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fid }),
          });
        } catch (err) {
          // Silently handle - not critical
          console.error('Failed to clear active game:', err);
        }
      }
      
      setScreen('entry');
      setCurrentGame(null);
      setCurrentQuestion(null);
      setGameResult(null);
      setSelectedAnswer(null);
      setError(null);
      // Refresh status to get updated balance
      if (fid) {
        fetchStatus();
      }
    };

    const handleShareResult = async () => {
      try {
        const fid = context?.user?.fid;
        if (!fid) {
          setError('Farcaster authentication required to share your result.');
          return;
        }

        if (!gameResult) {
          setError('No game result available to share.');
          return;
        }

        const betAmount = currentGame?.betAmount || gameResult.betAmount || 0;
        const profit = gameResult.profit || (gameResult.payout - betAmount);
        const profitPercent = betAmount > 0 ? ((profit / betAmount) * 100).toFixed(0) : '0';

        const buildShareUrl = () => {
          const base = new URL(`${APP_URL}/share/${fid}`);
          base.searchParams.set('mode', 'bet-mode');
          base.searchParams.set('result', gameResult.type === 'cash-out' ? 'cashout' : 'win');
          base.searchParams.set('payout', formatQT(gameResult.payout));
          base.searchParams.set('profit', formatQT(profit));
          base.searchParams.set('tickets', `${gameResult.ticketsEarned || 0}`);
          return base.toString();
        };

        const shareText = gameResult.type === 'cash-out'
          ? `💰 Just cashed out on ${APP_NAME} by @kushal-paliwal\nPayout: ${formatQT(gameResult.payout)}\nProfit: +${formatQT(profit)} (${profitPercent}%) 😎\nThink you can play it smarter? 👇`
          : `🎉 Big win in Bet Mode on ${APP_NAME} by @kushal-paliwal!\nPayout: ${formatQT(gameResult.payout)}\nProfit: +${formatQT(profit)} (${profitPercent}%) 🔥\nYour turn to try 👇`;

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
        setError('Failed to open Farcaster to share your result. Please try again.');
      }
    };

    const handleWithdraw = async () => {
      // Prevent double-click / multiple simultaneous calls
      if (withdrawing || isWithdrawInProgress.current || withdrawStep !== 'input') {
        console.log('Withdrawal already in progress, ignoring duplicate call');
        return;
      }
      
      if (!address) {
        setError('Please connect your wallet first.');
        return;
      }

      if (!withdrawAmount || withdrawAmount.trim() === '') {
        setError('Please enter withdrawal amount');
        return;
      }

      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Invalid withdrawal amount');
        return;
      }

      const availableBalance = status?.balance?.availableBalance || 0;
      // Round down available balance to avoid floating point precision issues
      const maxWithdrawable = Math.floor(availableBalance);
      
      // Use a small epsilon to handle floating point precision issues when comparing
      const epsilon = 0.01;
      if (amount > maxWithdrawable + epsilon) {
        setError(`Insufficient balance. You have ${formatQT(availableBalance)} QT available (max withdrawable: ${formatQT(maxWithdrawable)} QT).`);
        return;
      }
      
      // Ensure we use the floored amount for the actual withdrawal
      const finalAmount = Math.min(Math.floor(amount), maxWithdrawable);

      // Store the amount for success message
      setWithdrawnAmount(finalAmount);
      currentWithdrawAmount.current = finalAmount;

      // Minimum withdrawal check
      const MIN_WITHDRAW = 1000; // 1K QT minimum
      if (finalAmount < MIN_WITHDRAW) {
        setError(`Minimum withdrawal is ${formatQT(MIN_WITHDRAW)}`);
        return;
      }

      // Check if contract is configured
      if (!contractAddress) {
        // Fallback to old withdrawal method
        try {
          // Mark transaction as in progress for fallback method too
          isWithdrawInProgress.current = true;
          setWithdrawing(true);
          setError(null);

          const fid = context?.user?.fid;
          if (!fid) {
            throw new Error('Farcaster authentication required');
          }

          const res = await fetch('/api/bet-mode/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid,
              amount: finalAmount,
              toAddress: address,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || 'Failed to process withdrawal');
          }

          setShowWithdrawModal(false);
          withdrawModalOpenedFromProps.current = false; // Reset flag
          isWithdrawInProgress.current = false; // Reset transaction progress flag
          setWithdrawAmount('');
          setWithdrawnAmount(finalAmount);
          await fetchStatus();
          setError(null);
          setWithdrawalSuccess({
            amount: finalAmount,
            txHash: data.txHash,
          });
        } catch (err: any) {
          setError(err.message || 'Failed to process withdrawal');
          isWithdrawInProgress.current = false; // Reset transaction progress flag on error
        } finally {
          setWithdrawing(false);
        }
        return;
      }

      // NEW: Contract-based withdrawal flow
      try {
        // Mark transaction as in progress BEFORE starting (prevents modal reopening)
        isWithdrawInProgress.current = true;
        // Clear any pending deposit state to prevent cross-triggering
        setDepositTxHash(undefined);
        setDepositSuccess(null);
        setDepositing(false);
        setWithdrawing(true);
        setError(null);

        const fid = context?.user?.fid;
        if (!fid) {
          throw new Error('Farcaster authentication required');
        }

        // Step 1: Request signature from backend
        setWithdrawStep('preparing');
        let prepareData: any;
        
        // First attempt
        let res = await fetch('/api/bet-mode/withdraw/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid,
            amount: finalAmount,
            walletAddress: address,
          }),
        });

        let data = await res.json();

        // If there's a balance mismatch, try to sync first (only once)
        if (!res.ok && data.needsSync && address && fid) {
          console.log('Balance mismatch detected, attempting to sync...');
          try {
            const syncRes = await fetch('/api/bet-mode/deposit/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fid,
                walletAddress: address,
              }),
            });
            
            const syncData = await syncRes.json();
            if (syncData.success && syncData.synced) {
              // Retry withdrawal after sync (only once)
              console.log('Balance synced, retrying withdrawal...');
              await fetchStatus(); // Refresh status
              
              // Wait a moment for DB to update
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Retry the withdrawal prepare (only once)
              res = await fetch('/api/bet-mode/withdraw/prepare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fid,
                  amount: finalAmount,
                  walletAddress: address,
                }),
              });
              
              data = await res.json();
              if (!res.ok) {
                throw new Error(data.error || 'Failed to prepare withdrawal after sync');
              }
            } else {
              throw new Error(data.error || 'Failed to prepare withdrawal. Balance sync did not resolve the issue.');
            }
          } catch (syncError: any) {
            throw new Error(data.error || `Failed to prepare withdrawal: ${syncError.message}`);
          }
        } else if (!res.ok) {
          throw new Error(data.error || 'Failed to prepare withdrawal');
        }

        const { amount: amountWei, nonce, signature } = data.data;

        // Step 2: Call contract.withdraw()
        setWithdrawStep('withdrawing');
        console.log('Withdrawing from contract...');

        // Get wallet provider directly to bypass wagmi's getChainId check
        // Try Farcaster SDK first, then fallback to window.ethereum
        let provider: any = null;
        try {
          const farcasterProvider = await sdk.wallet.getEthereumProvider();
          if (farcasterProvider) {
            provider = farcasterProvider;
          }
        } catch (e) {
          console.warn('Farcaster SDK provider not available, using window.ethereum');
        }
        
        if (!provider && window.ethereum) {
          provider = window.ethereum;
        }
        
        if (!provider) {
          throw new Error('No wallet provider found. Please connect your wallet.');
        }
        
        if (!address) {
          throw new Error('No wallet address found. Please connect your wallet.');
        }
        
        // Create a custom transport that doesn't call eth_chainId
        // Wrap the provider to intercept and handle chainId requests
        const customProvider = {
          ...provider,
          request: async (args: any) => {
            // If the request is for chainId, return Base chain ID directly
            if (args.method === 'eth_chainId' || args.method === 'eth_chainld') {
              return `0x${base.id.toString(16)}`;
            }
            // For other requests, use the original provider
            return provider.request(args);
          },
        };
        
        // Create wallet client directly from provider to bypass wagmi
        const walletClient = createWalletClient({
          account: address as `0x${string}`,
          chain: base,
          transport: custom(customProvider),
        });

        // Use wallet client's writeContract method directly to bypass wagmi's getChainId check
        const withdrawHash = await walletClient.writeContract({
          account: address as `0x${string}`,
          address: contractAddress,
          abi: BET_MODE_VAULT_ABI,
          functionName: 'withdraw',
          args: [BigInt(amountWei), BigInt(nonce), signature as `0x${string}`],
        });

        console.log('Withdrawal transaction hash:', withdrawHash);
        setWithdrawTxHash(withdrawHash);

        // Step 3: Wait for confirmation (handled by useWaitForTransactionReceipt)
        setWithdrawStep('confirming');

      } catch (err: any) {
        console.error('Withdrawal error:', err);
        
        // Reset transaction progress flag on error
        isWithdrawInProgress.current = false;
        
        let errorMessage = 'Failed to process withdrawal';
        
        if (err.message?.includes('User rejected') || err.message?.includes('denied') || err.message?.includes('rejected')) {
          errorMessage = 'Transaction cancelled by user.';
        } else if (err.message?.includes('InvalidSignature')) {
          errorMessage = 'Invalid signature. Please try again.';
        } else if (err.message?.includes('InsufficientContractBalance')) {
          errorMessage = 'Contract has insufficient balance. Please contact support.';
        } else if (err.message?.includes('InsufficientUserBalance')) {
          errorMessage = 'Insufficient balance in contract.';
        } else if (err.message?.includes('InvalidNonce')) {
          errorMessage = 'Invalid nonce. Please try again.';
        } else if (err.shortMessage) {
          errorMessage = err.shortMessage;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        setWithdrawing(false);
        setWithdrawStep('input');
        // Reset transaction progress flag on error
        isWithdrawInProgress.current = false;
      }
    };

    if (!status) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading Bet Mode...</p>
          </div>
        </div>
      );
    }

    // Closed screen
    if (screen === 'closed') {
      return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto mt-20 mb-10 pb-20">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl text-center overflow-y-auto max-h-[calc(100vh-5rem)]">
            {onExit && (
              <button
                onClick={onExit}
                className="mb-4 px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium float-left"
              >
                ← Back
              </button>
            )}
              <div className="text-6xl mb-4">🎰</div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Bet Mode: Make upto 5x!</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">🔴 Available 24/7</p>

              <div className="text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  🎮 Game Mode: Always Open (24/7)
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  🔥 Token Burn: Immediate (50% of losses)
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Entry screen
    if (screen === 'entry') {
      // Show loading state if status hasn't loaded yet
      if (!status) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 flex items-center justify-center">
            <div className="text-white text-xl">Loading Bet Mode...</div>
          </div>
        );
      }
      
      // Check if user has enough balance (no multiplier - just need bet amount)
      const canBet = (status?.balance?.availableBalance || 0) >= betAmount;

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
          <div className="max-w-md mx-auto mt-10 mb-10 pb-20">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[calc(100vh-5rem)]">
              {onExit && (
                <button
                  onClick={onExit}
                  className="mb-4 px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium"
                >
                  ← Back
                </button>
              )}
              <div className="text-center mb-6">
                <div className="text-5xl mb-2">🎰</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">BET MODE</h2>
                <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-1">🤑 Make upto 5x! 🤑</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {status && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700 dark:text-gray-300">💰 Your Bet Mode Balance:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatQT(status.balance?.availableBalance || 0)}</span>
                  </div>
                  {isConnected && address && (
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-700 dark:text-gray-300">💼 Wallet Balance:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{formatQT(walletBalance)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Deposit and Withdraw Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-sm transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  💰 Deposit QT
                </button>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-3 px-4 rounded-xl text-sm transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  💸 Withdraw QT
                </button>
              </div>
              
              <button
                onClick={handleStartGameClick}
                disabled={loading || !canBet}
                className={`w-full py-4 px-6 rounded-xl font-bold text-white text-lg transition-all shadow-lg transform hover:scale-105 ${
                  loading || !canBet
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700'
                }`}
              >
                {loading ? 'Starting...' : canBet ? '🎮 START GAME' : 'INSUFFICIENT BALANCE'}
              </button>

              <button
                onClick={() => setScreen('info')}
                className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold text-base shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <span className="text-xl">🎰</span>
                <span>Bet Mode Info</span>
              </button>
              
              {/* Withdrawal Modal */}
              {showWithdrawModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full my-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Withdraw QT Tokens</h3>
                      <button
                        onClick={() => {
                          setShowWithdrawModal(false);
                          withdrawModalOpenedFromProps.current = false; // Reset flag
                          setWithdrawAmount('');
                          setError(null);
                        }}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {error && (
                      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Withdrawal Amount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="Enter amount"
                          value={withdrawAmount}
                          onChange={(e) => {
                            setWithdrawAmount(e.target.value);
                            setError(null);
                          }}
                          className="w-full p-3 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          min={1000}
                          max={status?.balance?.availableBalance || 0}
                        />
                        <button
                          onClick={() => {
                            const maxAmount = status?.balance?.availableBalance || 0;
                            if (maxAmount > 0) {
                              // Round to avoid floating point precision issues
                              const roundedMax = Math.floor(maxAmount);
                              setWithdrawAmount(roundedMax.toString());
                              setError(null);
                            }
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-md transition-all"
                        >
                          Max
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Available: {formatQT(status?.balance?.availableBalance || 0)}
                      </p>
                    </div>
                    
                    {/* Step indicators for contract withdrawal */}
                    {contractAddress && (withdrawStep !== 'input' || withdrawing) && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                        {withdrawStep === 'preparing' && (
                          <p className="text-xs text-blue-700 dark:text-blue-200">
                            ⏳ Step 1/2: Preparing withdrawal signature...
                          </p>
                        )}
                        {withdrawStep === 'withdrawing' && (
                          <p className="text-xs text-blue-700 dark:text-blue-200">
                            ⏳ Step 2/2: Processing withdrawal...
                          </p>
                        )}
                        {withdrawStep === 'confirming' && withdrawTxHash && (
                          <>
                            <p className="text-xs text-blue-700 dark:text-blue-200">
                              ⏳ Waiting for confirmation...
                            </p>
                            <a
                              href={`https://basescan.org/tx/${withdrawTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-1 inline-block"
                            >
                              View on BaseScan →
                            </a>
                          </>
                        )}
                      </div>
                    )}

                    {!address && (
                      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
                          ⚠️ Please connect your wallet to withdraw
                        </p>
                        {connectors.length > 0 && (
                          <button
                            onClick={() => connect({ 
                              connector: connectors[0],
                              chainId: base.id,
                            })}
                            className="w-full mt-2 py-2 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all text-sm"
                          >
                            Connect Wallet
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowWithdrawModal(false);
                          withdrawModalOpenedFromProps.current = false; // Reset flag
                          setWithdrawAmount('');
                          setError(null);
                        }}
                        className="flex-1 py-3 px-4 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-all"
                        disabled={withdrawing}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleWithdraw}
                        disabled={withdrawing || !address || !withdrawAmount}
                        className={`flex-1 py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                          withdrawing || !address || !withdrawAmount
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
                        }`}
                      >
                        {withdrawing 
                          ? withdrawStep === 'preparing'
                            ? 'Preparing...'
                            : withdrawStep === 'withdrawing'
                            ? 'Withdrawing...'
                            : 'Processing...'
                          : 'Withdraw'}
                      </button>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-4 text-center">
                      Tokens will be sent from the platform wallet to your connected wallet address.
                    </p>
                  </div>
                </div>
              )}

              {/* Withdrawal Success Modal */}
              {withdrawalSuccess && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
                    {/* Sparkle Effects */}
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute animate-sparkle"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${1.5 + Math.random()}s`,
                          }}
                        >
                          <span className="text-yellow-400 text-2xl opacity-80">✨</span>
                        </div>
                      ))}
                    </div>
                    <style jsx>{`
                      @keyframes sparkle {
                        0%, 100% {
                          opacity: 0;
                          transform: scale(0) rotate(0deg);
                        }
                        50% {
                          opacity: 1;
                          transform: scale(1) rotate(180deg);
                        }
                      }
                      .animate-sparkle {
                        animation: sparkle 2s ease-in-out infinite;
                      }
                    `}</style>
                    <div className="text-center relative z-10">
                      <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 mb-4 animate-pulse shadow-lg">
                        <svg
                          className="h-10 w-10 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Withdrawal Successful! 🎉
                      </h3>
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 mb-4 border-2 border-green-200 dark:border-green-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount Withdrawn</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                          {withdrawalSuccess.amount > 0 ? formatQT(withdrawalSuccess.amount) : '0 QT'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Tokens have been sent to your connected wallet
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 text-left">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                          Transaction Details
                        </p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash:</p>
                            <p className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all bg-white dark:bg-gray-900 p-2 rounded border">
                              {withdrawalSuccess.txHash}
                            </p>
                          </div>
                          <a
                            href={`https://basescan.org/tx/${withdrawalSuccess.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View on BaseScan
                          </a>
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                        <p className="text-xs text-blue-800 dark:text-blue-300">
                          💡 Your balance will update automatically once the transaction is confirmed on-chain.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setWithdrawalSuccess(null);
                          setWithdrawnAmount(0);
                        }}
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Deposit Success Modal */}
              {depositSuccess && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
                    {/* Sparkle Effects */}
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute animate-sparkle"
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${1.5 + Math.random()}s`,
                          }}
                        >
                          <span className="text-yellow-400 text-2xl opacity-80">✨</span>
                        </div>
                      ))}
                    </div>
                    <style jsx>{`
                      @keyframes sparkle {
                        0%, 100% {
                          opacity: 0;
                          transform: scale(0) rotate(0deg);
                        }
                        50% {
                          opacity: 1;
                          transform: scale(1) rotate(180deg);
                        }
                      }
                      .animate-sparkle {
                        animation: sparkle 2s ease-in-out infinite;
                      }
                    `}</style>
                    <div className="text-center relative z-10">
                      <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 mb-4 animate-pulse shadow-lg">
                        <svg
                          className="h-10 w-10 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Deposit Successful! 🎉
                      </h3>
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 mb-4 border-2 border-green-200 dark:border-green-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount Deposited</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                          {depositSuccess.amount > 0 ? formatQT(depositSuccess.amount) : '0 QT'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Tokens have been added to your Bet Mode balance
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 text-left">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                          Transaction Details
                        </p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Transaction Hash:</p>
                            <p className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all bg-white dark:bg-gray-900 p-2 rounded border">
                              {depositSuccess.txHash}
                            </p>
                          </div>
                          <a
                            href={`https://basescan.org/tx/${depositSuccess.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View on BaseScan
                          </a>
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                        <p className="text-xs text-blue-800 dark:text-blue-300">
                          💡 Your balance will update automatically once the transaction is confirmed on-chain.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setDepositSuccess(null);
                        }}
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Deposit Modal */}
              {showDepositModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full my-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Deposit QT Tokens</h3>
                      <button
                        onClick={() => {
                          setShowDepositModal(false);
                          depositModalOpenedFromProps.current = false; // Reset flag
                          setDepositAmount('');
                          setError(null);
                          setDepositStep('input');
                        }}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {!contractAddress && (
                      <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-200 rounded-lg text-sm">
                        ⚠️ Bet Mode Vault contract is not configured. Please contact support or check environment variables.
                      </div>
                    )}
                    
                    {error && (
                      <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                    
                    {walletBalanceError && (
                      <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg text-sm">
                        ⚠️ {walletBalanceError}
                      </div>
                    )}

                    {!address && (
                      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
                          ⚠️ Please connect your wallet to deposit
                        </p>
                        {connectors.length > 0 && (
                          <button
                            onClick={() => connect({ 
                              connector: connectors[0],
                              chainId: base.id,
                            })}
                            className="w-full mt-2 py-2 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all text-sm"
                          >
                            Connect Wallet
                          </button>
                        )}
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount to Deposit:
                      </label>
                      
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => {
                          setDepositAmount(e.target.value);
                          setError(null);
                        }}
                        placeholder={`Min: ${formatQT(MIN_BET)}`}
                        min={MIN_BET}
                        max={walletBalance}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        disabled={depositing || isDepositPending || isDepositConfirming}
                      />
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <span>Min: {formatQT(MIN_BET)}</span>
                        <span>Available: {formatQT(walletBalance)}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowDepositModal(false);
                          depositModalOpenedFromProps.current = false; // Reset flag
                          setDepositAmount('');
                          setError(null);
                        }}
                        className="flex-1 py-2 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                        disabled={depositing || isDepositPending || isDepositConfirming}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeposit}
                        disabled={
                          depositing || 
                          isDepositPending || 
                          isDepositConfirming || 
                          !depositAmount ||
                          !address
                        }
                        className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {depositing || isDepositPending || isDepositConfirming
                          ? depositStep === 'approving' 
                            ? 'Approving...'
                            : depositStep === 'depositing'
                            ? 'Depositing...'
                            : 'Processing...'
                          : 'Deposit'}
                      </button>
                    </div>
                    
                    {/* Step indicators for contract deposit */}
                    {contractAddress && (depositStep !== 'input' || isDepositPending || isDepositConfirming) && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                        {depositStep === 'approving' && (
                          <p className="text-xs text-blue-700 dark:text-blue-200">
                            ⏳ Step 1/2: Approving contract to spend tokens...
                          </p>
                        )}
                        {depositStep === 'depositing' && (
                          <p className="text-xs text-blue-700 dark:text-blue-200">
                            ⏳ Step 2/2: Depositing tokens to contract...
                          </p>
                        )}
                        {depositStep === 'confirming' && depositTxHash && (
                          <>
                            <p className="text-xs text-blue-700 dark:text-blue-200">
                              ⏳ Waiting for confirmation...
                            </p>
                            <a
                              href={`https://basescan.org/tx/${depositTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-1 inline-block"
                            >
                              View on BaseScan →
                            </a>
                          </>
                        )}
                        {depositTxHash && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            TX: {depositTxHash.slice(0, 10)}...{depositTxHash.slice(-8)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Legacy deposit status */}
                    {!contractAddress && (isDepositPending || isDepositConfirming) && depositTxHash && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-200">
                          Transaction: {depositTxHash.slice(0, 10)}...{depositTxHash.slice(-8)}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          {isDepositPending ? 'Waiting for confirmation...' : 'Verifying deposit...'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Bet Selection screen
    if (screen === 'bet-selection') {
      const canBet = (status?.balance?.availableBalance || 0) >= betAmount;
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
          <div className="max-w-md mx-auto mt-10 mb-10 pb-20">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[calc(100vh-5rem)]">
              <button
                onClick={() => setScreen('entry')}
                className="mb-4 px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium"
              >
                ← Back
              </button>
              
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Choose Your Bet</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Select your bet amount to start playing</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[10000, 50000, 100000, 500000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        setBetAmount(amount);
                        setCustomBet('');
                        setError(null);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${
                        betAmount === amount && !customBet
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg scale-105'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="font-bold text-lg text-gray-900 dark:text-gray-100">{formatQT(amount)}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Win up to {formatQT(amount * BET_MODE_MULTIPLIERS[10])}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Or enter custom amount:
                  </label>
                  <input
                    type="number"
                    placeholder="Custom amount"
                    value={customBet}
                    onChange={(e) => {
                      setCustomBet(e.target.value);
                      if (e.target.value) {
                        setBetAmount(Number(e.target.value));
                        setError(null);
                      }
                    }}
                    className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                    min={MIN_BET}
                    max={MAX_BET}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
                    Min: {formatQT(MIN_BET)} | Max: {formatQT(MAX_BET)}
                  </p>
                </div>
              </div>

              {status && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-6 border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Available Balance:</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-gray-100">{formatQT(status.balance?.availableBalance || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">Selected Bet:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatQT(customBet ? Number(customBet) : betAmount)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleStartGame}
                disabled={loading || !canBet}
                className={`w-full py-4 px-6 rounded-xl font-bold text-white text-lg transition-all shadow-lg transform hover:scale-105 ${
                  loading || !canBet
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700'
                }`}
              >
                {loading ? 'Starting Game...' : canBet ? '🚀 START GAME' : `INSUFFICIENT BALANCE (Need ${formatQT(betAmount)})`}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Game screen
    if (screen === 'game' && currentQuestion) {
      const questionNum = currentQuestion.questionNumber || 1;
      const currentPayout = currentGame ? calculatePayout(currentGame.betAmount, questionNum) : 0;
      const nextPayout =
        questionNum < 10
          ? currentGame
            ? calculatePayout(currentGame.betAmount, questionNum + 1)
            : 0
          : 0;
      const canCashOut = questionNum >= 5;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto mt-10 mb-10 pb-20">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[calc(100vh-5rem)]">
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Question {questionNum} of 10
                </span>
                {/* Timer removed for testing */}
              </div>

              <div className="bg-gradient-to-r from-yellow-50 dark:from-yellow-900 to-orange-50 dark:to-orange-900 rounded-lg p-4 mb-6 border-2 border-yellow-200 dark:border-yellow-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-1">
                    💰 {formatQT(currentPayout)}
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">Current Value</div>
                  {nextPayout > 0 && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Next: {formatQT(nextPayout)}
                    </div>
                  )}
                </div>
              </div>

            <div className="mb-6 max-h-[50vh] overflow-y-auto pr-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{currentQuestion.text}</h3>
                <div className={`px-3 py-1 rounded-lg font-bold text-sm ${
                  timerDisplay <= 10 
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                    : timerDisplay <= 15
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                }`}>
                  ⏱️ {timerDisplay}s
                </div>
              </div>
              <div className="space-y-3">
                  {currentQuestion.options.map((option: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedAnswer(index);
                        setQuestionTimerEnd(null); // Stop timer when answer is selected
                        handleAnswer(index);
                      }}
                      disabled={loading || selectedAnswer !== null || timerDisplay === 0}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedAnswer === index
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } ${loading || selectedAnswer !== null || timerDisplay === 0 ? 'opacity-50 cursor-not-allowed' : ''} text-gray-900 dark:text-gray-100`}
                    >
                      <span className="font-semibold mr-2">{String.fromCharCode(65 + index)})</span>
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {canCashOut && (
                <div className="flex gap-3">
                  <button
                    onClick={handleCashOut}
                    disabled={loading}
                    className="w-full py-3 px-6 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-all disabled:opacity-50"
                  >
                    💰 CASH OUT {formatQT(currentPayout)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Cash out screen
    if (screen === 'cash-out' && gameResult) {
      const betAmount = currentGame?.betAmount || gameResult.betAmount || 0;
      const profit = gameResult.profit || (gameResult.payout - betAmount);
      const profitPercent = betAmount > 0 ? ((profit / betAmount) * 100).toFixed(0) : '0';

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto mt-20 mb-10 pb-20">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl text-center overflow-y-auto max-h-[calc(100vh-5rem)]">
            <CheckCircle className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                {gameResult.type === 'cash-out' ? '✅ CASHED OUT!' : '🎉 YOU WON!'}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">Smart move! You secured:</p>

              <div className="bg-gradient-to-r from-green-50 dark:from-green-900 to-blue-50 dark:to-blue-900 rounded-lg p-6 mb-6 border-2 border-green-200 dark:border-green-700 max-h-[30vh] overflow-y-auto">
                <div className="text-3xl font-bold text-green-800 dark:text-green-200 mb-2">
                  💰 {formatQT(gameResult.payout)}
                </div>
                <div className="text-lg text-green-700 dark:text-green-300">
                  Profit: +{formatQT(profit)} ({profitPercent}%)
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handlePlayAgain}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold hover:from-green-600 hover:to-blue-700 transition-all"
                >
                  PLAY AGAIN
                </button>
                <button
                  onClick={handleShareResult}
                  className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200"
                >
                  📣 Share on Farcaster
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Loss screen
    if (screen === 'loss' && gameResult) {
      const betAmount = currentGame?.betAmount || 0;
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto mt-20 mb-10 pb-20">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl text-center overflow-y-auto max-h-[calc(100vh-5rem)]">
            <XCircle className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">❌ WRONG ANSWER</h2>

              {/* Display losing amount */}
              {betAmount > 0 && (
                <div className="mb-4">
                  <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4 border-2 border-red-200 dark:border-red-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Amount Lost</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatQT(betAmount)}</p>
                  </div>
                </div>
              )}

              {gameResult.explanation && (
                <div className="mb-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 text-center">✅ Correct Answer:</p>
                  <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-blue-800 dark:text-blue-200">{gameResult.explanation}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handlePlayAgain}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-white font-bold hover:from-red-600 hover:to-orange-700 transition-all"
              >
                TRY AGAIN
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Bet Mode Info screen
    if (screen === 'info') {
      // Show loading state if status hasn't loaded yet
      if (!status) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 flex items-center justify-center">
            <div className="text-white text-xl">Loading Bet Mode...</div>
          </div>
        );
      }
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-orange-500 p-4 overflow-y-auto">
          <div className="max-w-md mx-auto mt-10 mb-10 pb-20">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[calc(100vh-5rem)]">
              <button
                onClick={() => setScreen('entry')}
                className="mb-4 px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium"
              >
                ← Back
              </button>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">How Bet Mode Works</h2>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-r from-blue-50 dark:from-blue-900 to-cyan-50 dark:to-cyan-900 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">💰 How It Works</h3>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    <p>• Place a bet (10K - 500K QT)</p>
                    <p>• Answer 10 questions correctly</p>
                    <p>• Win up to 5x your bet!</p>
                    <p>• Cash out anytime after Q5</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 dark:from-green-900 to-emerald-50 dark:to-emerald-900 rounded-lg p-4 border-2 border-green-200 dark:border-green-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">📈 Multipliers</h3>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <p>Q1: 1.05x | Q2: 1.15x | Q3: 1.30x | Q4: 1.50x</p>
                    <p>Q5: 2.00x | Q6: 2.50x | Q7: 3.00x</p>
                    <p>Q8: 3.75x | Q9: 4.50x | Q10: 5.00x</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-50 dark:from-red-900 to-orange-50 dark:to-orange-900 rounded-lg p-4 border-2 border-red-200 dark:border-red-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🔥 Loss Distribution</h3>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <p>• 50% burned permanently 🔥</p>
                    <p>• 50% app revenue 💰</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 dark:from-purple-900 to-pink-50 dark:to-pink-900 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">⚡ Rules</h3>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <p>• Time per question: Q1-Q4: 30s | Q5: 25s | Q6-Q7: 20s | Q8-Q9: 15s | Q10: 10s</p>
                    <p>• Wrong answer = game over (Loose the bet amount) </p>
                    <p>• Cash out available from Q5</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setScreen('entry')}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold hover:from-blue-600 hover:to-cyan-700 transition-all"
              >
                PLAY BET MODE
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

