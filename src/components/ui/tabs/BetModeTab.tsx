  "use client";

  import React, { useState, useEffect, useCallback } from 'react';
  import { useMiniApp } from '@neynar/react';
  import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useConnect, useChainId, useSwitchChain } from 'wagmi';
  import { base } from 'wagmi/chains';
  import { CheckCircle, XCircle } from 'lucide-react';
  import { formatUnits, parseUnits } from 'viem';
  import { getWalletClient } from '@wagmi/core';
  import { encodeFunctionData } from 'viem';
  import { config } from '~/components/providers/WagmiProvider';
  import sdk from '@farcaster/miniapp-sdk';
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

  type BetModeScreen = 'entry' | 'game' | 'cash-out' | 'loss' | 'lottery' | 'closed';

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
      lotteryPool: number;
      toBurnAccumulated: number;
      totalLosses: number;
    } | null;
    lottery: {
      userTickets: number;
      totalTickets: number;
      userShare: string;
    };
  }

  interface BetModeTabProps {
    onExit?: () => void;
    openDepositModal?: boolean;
    openWithdrawModal?: boolean;
  }

  export function BetModeTab({ onExit, openDepositModal, openWithdrawModal }: BetModeTabProps = {}) {
    const { context } = useMiniApp();
    const { address, isConnected, chainId: accountChainId } = useAccount();
    const { connect, connectors } = useConnect();
    const currentChainId = useChainId();
    const { switchChain } = useSwitchChain();
    
  // Get QT token address from environment (client-side safe)
  // Fallback to hardcoded address if env var not set
  const QT_TOKEN_ADDRESS = "0x541529ADB3f344128aa87917fd2926E7D240FB07";
  const qtTokenAddress = (process.env.NEXT_PUBLIC_QT_TOKEN_ADDRESS || QT_TOKEN_ADDRESS) as `0x${string}`;
  
  const [screen, setScreen] = useState<BetModeScreen>('entry');
  const [status, setStatus] = useState<BetModeStatus | null>(null);
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
    // const [timeRemaining, setTimeRemaining] = useState<number>(30); // Timer removed for testing
    const [gameResult, setGameResult] = useState<any>(null);

    const loadGameState = useCallback(async (_gameId: string) => {
      // In a real implementation, you'd fetch the current question
      // For now, we'll handle it through the answer flow
    }, []);

    // Fetch status
    const fetchStatus = useCallback(async () => {
      const fid = context?.user?.fid;
      if (!fid) return;

      try {
        // Build status URL - wallet balance is now fetched client-side via Wagmi
        const res = await fetch(`/api/bet-mode/status?fid=${fid}`);
        const data = await res.json();
        
        // Merge wallet balance from Wagmi into status
        if (isConnected && address) {
          data.balance = {
            ...data.balance,
            walletBalance, // Add wallet balance from Wagmi
          };
        }
        
        setStatus(data);

        // Determine screen based on status
        // Bet Mode is always open (24/7), so skip closed check
        if (data.activeGame) {
          setScreen('game');
          // Load game state
          await loadGameState(data.activeGame.gameId);
        } else {
          setScreen('entry');
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
      }
    }, [
      context?.user?.fid,
      loadGameState,
      isConnected,
      address,
      walletBalance,
    ]);

    useEffect(() => {
      fetchStatus();
      const interval = setInterval(fetchStatus, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }, [fetchStatus]);

    // Open deposit modal if requested from homepage
    useEffect(() => {
      if (openDepositModal) {
        setShowDepositModal(true);
      }
    }, [openDepositModal]);

    // Open withdraw modal if requested from homepage
    useEffect(() => {
      if (openWithdrawModal) {
        setShowWithdrawModal(true);
      }
    }, [openWithdrawModal]);
    
  // Fetch platform wallet address
  useEffect(() => {
    let isMounted = true;
    
    fetch('/api/bet-mode/platform-wallet')
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw new Error(errData.error || 'Failed to fetch platform wallet');
          });
        }
        return res.json();
      })
      .then(data => {
        if (!isMounted) return;
        
        if (data.address) {
          setPlatformWallet(data.address);
          setPlatformWalletError(null);
        } else if (data.error) {
          setPlatformWalletError(data.error);
        } else {
          setPlatformWalletError('No platform wallet address returned');
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Failed to fetch platform wallet:', err);
        setPlatformWalletError(err.message || 'Failed to load platform wallet');
      });
    
    return () => {
      isMounted = false;
    };
  }, []);
    
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
        setDepositAmount('');
        await fetchStatus(); // Refresh balance
      } else {
        setError(data.error || 'Failed to verify deposit');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify deposit');
    } finally {
      setDepositing(false);
    }
  }, [context?.user?.fid, fetchStatus]);
  
  // Handle deposit transaction confirmation
  useEffect(() => {
    if (isDepositConfirmed && depositTxHash) {
      // If using contract, events will handle DB update automatically
      // Otherwise, use manual verification
      if (!contractAddress) {
        handleDepositVerification(depositTxHash);
      } else {
        // Contract deposit - events will sync DB, but add manual sync and polling
        setDepositing(false);
        setDepositStep('input');
        setShowDepositModal(false);
        setDepositAmount('');
        
        // Poll for balance update (events might take a few seconds to process)
        let pollCount = 0;
        const maxPolls = 15; // Poll for up to 30 seconds (15 * 2s)
        
        // Try manual sync first (in case event listener hasn't processed yet)
        if (address && context?.user?.fid) {
          fetch('/api/bet-mode/deposit/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid: context.user.fid,
              walletAddress: address,
            }),
          }).catch((syncError) => {
            console.warn('Manual sync failed, will rely on event listener:', syncError);
          });
        }
        
        // Immediate refresh
        fetchStatus();
        
        const pollInterval = setInterval(() => {
          pollCount++;
          fetchStatus();
          
          // Try sync again after a few polls
          if (pollCount === 3 && address && context?.user?.fid) {
            fetch('/api/bet-mode/deposit/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fid: context.user.fid,
                walletAddress: address,
              }),
            }).catch(() => {});
          }
          
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            // Final refresh after polling completes
            setTimeout(() => fetchStatus(), 1000);
          }
        }, 2000); // Poll every 2 seconds
        
        // Cleanup on unmount
        return () => {
          clearInterval(pollInterval);
        };
      }
    }
  }, [isDepositConfirmed, depositTxHash, handleDepositVerification, contractAddress, fetchStatus, address, context?.user?.fid]);
  
  // Handle withdrawal transaction confirmation
  useEffect(() => {
    if (isWithdrawConfirmed && withdrawTxHash) {
      // Contract withdrawal - events will sync DB, just refresh status
      setWithdrawing(false);
      setWithdrawStep('input');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      fetchStatus();
      setWithdrawalSuccess({
        amount: parseFloat(withdrawAmount),
        txHash: withdrawTxHash,
      });
    }
  }, [isWithdrawConfirmed, withdrawTxHash, withdrawAmount, fetchStatus]);
    
    const handleDeposit = async () => {
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
        setError(`Minimum deposit is ${formatQT(MIN_DEPOSIT)} QT`);
        return;
      }
      
      if (amount > walletBalance) {
        setError(`Insufficient wallet balance. You have ${formatQT(walletBalance)} QT.`);
        return;
      }
      
      try {
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
        
        // Get wallet client directly to bypass wagmi's getChainId check
        const walletClient = await getWalletClient(config, { chainId: targetChainId });
        if (!walletClient) {
          throw new Error('Failed to get wallet client. Please ensure your wallet is connected.');
        }
        
        if (currentAllowance < amountWei) {
          setDepositStep('approving');
          console.log('Requesting approval...');
          
          // Use wallet client's writeContract method directly to bypass wagmi's getChainId check
          const approveHash = await walletClient.writeContract({
            address: qtTokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [contractAddress, amountWei],
            chain: base,
          });
          
          console.log('Approval transaction hash:', approveHash);
          
          // Wait for approval confirmation
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        
        // Step 2: Call contract.deposit()
        setDepositStep('depositing');
        setIsDepositPending(true);
        console.log('Depositing to contract...');
        
        // Use wallet client's writeContract method directly to bypass wagmi's getChainId check
        const depositHash = await walletClient.writeContract({
          address: contractAddress,
          abi: BET_MODE_VAULT_ABI,
          functionName: 'deposit',
          args: [amountWei],
          chain: base,
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
      }
    };
    
    const handleBuyQT = async () => {
      try {
        const QT_TOKEN_ADDRESS = "0x541529ADB3f344128aa87917fd2926E7D240FB07";
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
            // setTimeRemaining(30); // Timer removed for testing
            setSelectedAnswer(null);
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

    // Timer removed for testing - can be re-enabled later
    // useEffect(() => {
    //   if (screen === 'game' && timeRemaining > 0 && !gameResult) {
    //     const timer = setInterval(() => {
    //       setTimeRemaining((prev) => {
    //         if (prev <= 1) {
    //           // Timeout - auto-submit null answer
    //           handleAnswer(null);
    //           return 0;
    //         }
    //         return prev - 1;
    //       }, 1000);
    //       return () => clearInterval(timer);
    //     }
    //   }
    // }, [screen, timeRemaining, gameResult, handleAnswer]);

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
        // setTimeRemaining(30); // Timer removed for testing
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

    const handlePlayAgain = () => {
      setScreen('entry');
      setCurrentGame(null);
      setCurrentQuestion(null);
      setGameResult(null);
      setSelectedAnswer(null);
      setError(null);
    };

    const handleWithdraw = async () => {
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
      if (amount > availableBalance) {
        setError(`Insufficient balance. You have ${formatQT(availableBalance)} QT available.`);
        return;
      }

      // Minimum withdrawal check
      const MIN_WITHDRAW = 1000; // 1K QT minimum
      if (amount < MIN_WITHDRAW) {
        setError(`Minimum withdrawal is ${formatQT(MIN_WITHDRAW)} QT`);
        return;
      }

      // Check if contract is configured
      if (!contractAddress) {
        // Fallback to old withdrawal method
        try {
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
              amount,
              toAddress: address,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || 'Failed to process withdrawal');
          }

          setShowWithdrawModal(false);
          setWithdrawAmount('');
          await fetchStatus();
          setError(null);
          setWithdrawalSuccess({
            amount,
            txHash: data.txHash,
          });
        } catch (err: any) {
          setError(err.message || 'Failed to process withdrawal');
        } finally {
          setWithdrawing(false);
        }
        return;
      }

      // NEW: Contract-based withdrawal flow
      try {
        setWithdrawing(true);
        setError(null);

        const fid = context?.user?.fid;
        if (!fid) {
          throw new Error('Farcaster authentication required');
        }

        // Step 1: Request signature from backend
        setWithdrawStep('preparing');
        const res = await fetch('/api/bet-mode/withdraw/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid,
            amount,
            walletAddress: address,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to prepare withdrawal');
        }

        const { amount: amountWei, nonce, signature } = data.data;

        // Step 2: Call contract.withdraw()
        setWithdrawStep('withdrawing');
        console.log('Withdrawing from contract...');

        // Get wallet client directly to bypass wagmi's getChainId check
        const walletClient = await getWalletClient(config, { chainId: base.id });
        if (!walletClient) {
          throw new Error('Failed to get wallet client. Please ensure your wallet is connected.');
        }

        // Use wallet client's writeContract method directly to bypass wagmi's getChainId check
        const withdrawHash = await walletClient.writeContract({
          address: contractAddress,
          abi: BET_MODE_VAULT_ABI,
          functionName: 'withdraw',
          args: [BigInt(amountWei), BigInt(nonce), signature as `0x${string}`],
          chain: base,
        });

        console.log('Withdrawal transaction hash:', withdrawHash);
        setWithdrawTxHash(withdrawHash);

        // Step 3: Wait for confirmation (handled by useWaitForTransactionReceipt)
        setWithdrawStep('confirming');

      } catch (err: any) {
        console.error('Withdrawal error:', err);
        
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
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Bet Mode</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">🔴 Available 24/7</p>

              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">⏰ NEXT LOTTERY DRAW:</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {status.window.timeUntilDraw || 'Calculating...'}
                </p>
              </div>

              <div className="text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  🎮 Game Mode: Always Open (24/7)
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  🎰 Lottery Draw: Weekly (Friday 2:00 PM UTC)
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  🔥 Token Burn: Weekly (Friday 2:30 PM UTC)
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
                <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-1">🔴 LIVE 24/7!</p>
                {status.window.timeUntilDraw && (
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-2">
                    Next lottery draw: {status.window.timeUntilDraw}
                  </p>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Choose your bet:
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[10000, 50000, 100000, 500000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        setBetAmount(amount);
                        setCustomBet('');
                      }}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        betAmount === amount && !customBet
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{formatQT(amount)}</div>
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        Win up to {formatQT(amount * BET_MODE_MULTIPLIERS[10])}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <input
                    type="number"
                    placeholder="Custom amount"
                    value={customBet}
                    onChange={(e) => {
                      setCustomBet(e.target.value);
                      if (e.target.value) setBetAmount(Number(e.target.value));
                    }}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    min={MIN_BET}
                    max={MAX_BET}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Min: {formatQT(MIN_BET)} | Max: {formatQT(MAX_BET)}
                  </p>
                </div>
              </div>

              {status && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700 dark:text-gray-300">💰 Your Balance:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatQT(status.balance?.availableBalance || 0)}</span>
                  </div>
                  {isConnected && address && (
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-700 dark:text-gray-300">💼 Wallet Balance:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{formatQT(walletBalance)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700 dark:text-gray-300">🎟️ Your Tickets:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{(status.lottery?.userTickets || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">📊 Pool:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatQT(status.weeklyPool?.lotteryPool || 0)}
                    </span>
                  </div>
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

              {!canBet && (
                <div className="mb-3 space-y-2">
                  {walletBalance >= MIN_BET && isConnected ? (
                  // User has QT in wallet but not deposited - show deposit button
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="w-full py-3 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all"
                  >
                    💰 Deposit QT Tokens
                  </button>
                  ) : walletBalance < MIN_BET && isConnected ? (
                    // User has wallet but not enough QT - show buy button
                    <button
                      onClick={handleBuyQT}
                      className="w-full py-3 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all"
                    >
                      🛒 Buy QT Tokens (Need {formatQT(MIN_BET)} minimum)
                    </button>
                  ) : (
                    // User not connected - show connect message
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800 text-center">
                        ⚠️ Connect your wallet to deposit QT tokens
                      </p>
                    </div>
                  )}
                  
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <p className="text-xs text-gray-900 dark:text-gray-100 text-center">
                      💼 Internal Balance: {formatQT(status?.balance?.availableBalance || 0)}
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 text-center mt-1">
                      Minimum bet: {formatQT(MIN_BET)}
                    </p>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleStartGame}
                disabled={loading || !canBet}
                className={`w-full py-3 px-6 rounded-xl font-bold text-white transition-all ${
                  loading || !canBet
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700'
                }`}
              >
                {loading ? 'Starting...' : canBet ? 'START GAME' : 'INSUFFICIENT BALANCE'}
              </button>

              {/* Withdraw button - show if user has balance */}
              {(status?.balance?.availableBalance || 0) > 0 && (
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  className="w-full mt-3 py-2 px-4 rounded-lg bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200 font-semibold hover:bg-orange-200 dark:hover:bg-orange-800 transition-all"
                >
                  💸 Withdraw QT Tokens
                </button>
              )}

              <button
                onClick={() => setScreen('lottery')}
                className="w-full mt-3 py-2 px-4 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 font-semibold hover:bg-purple-200 dark:hover:bg-purple-800 transition-all"
              >
                View Lottery Info
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
                      <div className="flex gap-2 mb-2">
                        {[
                          Math.min(10000, status?.balance?.availableBalance || 0),
                          Math.min(50000, status?.balance?.availableBalance || 0),
                          Math.min(100000, status?.balance?.availableBalance || 0),
                        ]
                          .filter((amt) => amt > 0)
                          .map((amount) => (
                            <button
                              key={amount}
                              onClick={() => setWithdrawAmount(amount.toString())}
                              className="flex-1 py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium text-gray-900 dark:text-gray-100"
                            >
                              {formatQT(amount)}
                            </button>
                          ))}
                      </div>
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
                              setWithdrawAmount(maxAmount.toString());
                              setError(null);
                            }
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-md transition-all"
                        >
                          Max
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Available: {formatQT(status?.balance?.availableBalance || 0)} QT
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Min: {formatQT(1000)} QT
                      </p>
                    </div>

                    {address && (
                      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">Withdrawing to:</p>
                        <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                          {address}
                        </p>
                      </div>
                    )}
                    
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
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                    <div className="text-center">
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                        <svg
                          className="h-8 w-8 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Withdrawal Successful! 🎉
                      </h3>
                      <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                        {formatQT(withdrawalSuccess.amount)} QT has been sent to your wallet
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                        <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">Transaction Hash:</p>
                        <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                          {withdrawalSuccess.txHash}
                        </p>
                        <a
                          href={`https://basescan.org/tx/${withdrawalSuccess.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-2 inline-block"
                        >
                          View on BaseScan →
                        </a>
                      </div>
                      <button
                        onClick={() => {
                          setWithdrawalSuccess(null);
                        }}
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold transition-all"
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
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount to Deposit:
                      </label>
                      
                      {/* Quick deposit buttons */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {[MIN_BET, MIN_BET * 5, MIN_BET * 10].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => {
                              const maxAmount = Math.min(amount, walletBalance);
                              setDepositAmount(maxAmount.toString());
                              setError(null);
                            }}
                            disabled={depositing || isDepositPending || isDepositConfirming || amount > walletBalance}
                             className={`p-2 rounded-lg text-xs font-semibold transition-all ${
                               amount > walletBalance
                                 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                 : 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800'
                             }`}
                          >
                            {formatQT(amount)}
                          </button>
                        ))}
                      </div>
                      
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
                          !depositAmount
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{currentQuestion.text}</h3>
              <div className="space-y-3">
                  {currentQuestion.options.map((option: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedAnswer(index);
                        handleAnswer(index);
                      }}
                      disabled={loading || selectedAnswer !== null}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedAnswer === index
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } ${loading || selectedAnswer !== null ? 'opacity-50' : ''} text-gray-900 dark:text-gray-100`}
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
                    className="flex-1 py-3 px-6 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-all disabled:opacity-50"
                  >
                    💰 CASH OUT {formatQT(currentPayout)}
                  </button>
                  {questionNum < 10 && (
                    <button
                      onClick={handleContinue}
                      disabled={loading || selectedAnswer === null}
                      className="flex-1 py-3 px-6 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
                    >
                      CONTINUE →
                    </button>
                  )}
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
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                  🎟️ Tickets earned: {gameResult.ticketsEarned || 0}
                </div>
              </div>

              <button
                onClick={handlePlayAgain}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold hover:from-green-600 hover:to-blue-700 transition-all"
              >
                PLAY AGAIN
              </button>
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

              {gameResult.explanation && (
                <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-3 mb-4 border border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-blue-800 dark:text-blue-200">{gameResult.explanation}</p>
                </div>
              )}

              <div className="bg-red-50 dark:bg-red-900 rounded-lg p-4 mb-6 border-2 border-red-200 dark:border-red-700 max-h-[30vh] overflow-y-auto">
                <div className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
                  Lost: {formatQT(betAmount)}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  But your loss contributes to:
                  <div className="mt-2 text-left">
                    <div>• {formatQT(gameResult.lossDistribution?.toBurn || 0)} burned 🔥</div>
                    <div>• {formatQT(gameResult.lossDistribution?.toLottery || 0)} to lottery 🎰</div>
                    <div>• {formatQT(gameResult.lossDistribution?.toPlatform || 0)} to platform 💼</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  🎟️ You earned {gameResult.ticketsEarned || 0} lottery tickets!
                </div>
              </div>

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

    // Lottery screen
    if (screen === 'lottery') {
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
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">🎰</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">THIS WEEK&apos;S LOTTERY</h2>
                {status?.window?.timeUntilSnapshot && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                    Snapshot in: {status.window.timeUntilSnapshot}
                  </p>
                )}
              </div>

              <div className="bg-gradient-to-r from-purple-50 dark:from-purple-900 to-pink-50 dark:to-pink-900 rounded-lg p-4 mb-6 border-2 border-purple-200 dark:border-purple-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-800 dark:text-purple-200 mb-1">
                    💰 {formatQT(status.weeklyPool?.lotteryPool || 0)}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">Current Pool</div>
                </div>
              </div>

              <div className="mb-6 max-h-[30vh] overflow-y-auto">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">YOUR STATUS:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">🎟️ Your Tickets:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{(status.lottery?.userTickets || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">📊 Your Share:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{status.lottery?.userShare || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">🎯 Win Probability:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {((parseFloat(String(status.lottery?.userShare || 0)) / 100) * 31).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 max-h-[40vh] overflow-y-auto">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🏆 PRIZE STRUCTURE:</h3>
                <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1 pr-2">
                  <div>Tier 1 (1 winner): {formatQT((status.weeklyPool?.lotteryPool || 0) * 0.40)} (40%)</div>
                  <div>Tier 2 (2 winners): {formatQT((status.weeklyPool?.lotteryPool || 0) * 0.125)} each (12.5%)</div>
                  <div>Tier 3 (5 winners): {formatQT((status.weeklyPool?.lotteryPool || 0) * 0.04)} each (4%)</div>
                  <div>Tier 4 (10 winners): {formatQT((status.weeklyPool?.lotteryPool || 0) * 0.01)} each (1%)</div>
                  <div>Tier 5 (20 winners): {formatQT((status.weeklyPool?.lotteryPool || 0) * 0.0025)} each (0.25%)</div>
                </div>
              </div>

              <button
                onClick={() => setScreen('entry')}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold hover:from-purple-600 hover:to-pink-700 transition-all"
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

