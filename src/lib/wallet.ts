import { ethers } from 'ethers';
import { getWalletClient } from 'wagmi/actions';
import { encodeFunctionData } from 'viem';

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
    farcaster?: any;
  }
}

// Contract configuration - Updated for signature-based contract
export const CONTRACT_ADDRESS = '0x904f81eeD7f129aA6e65bD21e697A681BEA8bf47'; // Improved contract with fixed signature verification
export const CONTRACT_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"mode","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"score","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"QuizCompleted","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"mode","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"},{"indexed":false,"internalType":"bytes32","name":"signatureHash","type":"bytes32"}],"name":"QuizStarted","type":"event"},
  {"inputs":[{"internalType":"bytes32","name":"messageHash","type":"bytes32"}],"name":"getEthSignedMessageHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"enum QuizTriviaSignature.QuizMode","name":"mode","type":"uint8"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"}],"name":"getMessageHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},
  {"inputs":[],"name":"getStats","outputs":[{"internalType":"uint256","name":"total","type":"uint256"},{"internalType":"uint256","name":"classic","type":"uint256"},{"internalType":"uint256","name":"time","type":"uint256"},{"internalType":"uint256","name":"challenge","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserNonce","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserQuizCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"enum QuizTriviaSignature.QuizMode","name":"","type":"uint8"}],"name":"modeCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"enum QuizTriviaSignature.QuizMode","name":"mode","type":"uint8"},{"internalType":"uint256","name":"score","type":"uint256"}],"name":"recordQuizCompletion","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"messageHash","type":"bytes32"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"recoverSigner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"pure","type":"function"},
  {"inputs":[{"internalType":"enum QuizTriviaSignature.QuizMode","name":"mode","type":"uint8"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"startQuizWithSignature","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"totalQuizzes","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"usedSignatures","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userNonce","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userQuizCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"enum QuizTriviaSignature.QuizMode","name":"mode","type":"uint8"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"verifySignature","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},
  {"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}
] as const;

// Quiz modes matching the smart contract
export enum QuizMode {
  CLASSIC = 0,
  TIME_MODE = 1,
  CHALLENGE = 2
}

// Network configuration for Base Mainnet
export const NETWORK_CONFIG = {
  chainId: '0x2105', // 8453 in hex
  chainName: 'Base',
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  }
};

// Transaction states
export enum TransactionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONFIRMING = 'confirming',
  SUCCESS = 'success',
  ERROR = 'error'
}

// Error types
export class WalletError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'WalletError';
  }
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Check if Farcaster Mini App is available
 */
export function isFarcasterMiniAppAvailable(): boolean {
  return typeof window !== 'undefined' && 
    ((window as any).farcaster?.miniApp || 
     (window as any).farcaster?.context ||
     typeof (window as any).farcaster !== 'undefined');
}

/**
 * Request account access and get signer
 */
export async function connectWallet(): Promise<ethers.BrowserProvider> {
  // Check for Farcaster Mini App first
  if (isFarcasterMiniAppAvailable()) {
    try {
      // Use Farcaster Mini App provider
      const farcaster = (window as any).farcaster;
      if (farcaster?.miniApp?.getEthereumProvider) {
        const provider = farcaster.miniApp.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(provider);
        
        // Check if we're on the correct network
        const network = await ethersProvider.getNetwork();
        if (Number(network.chainId) !== 8453) { // Base Mainnet chain ID
          await switchToBaseMainnet();
        }
        
        return ethersProvider;
      }
    } catch (error: any) {
      console.warn('Farcaster Mini App connection failed:', error);
    }
  }

  // Check for Farcaster Frame provider
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      // Use Farcaster Frame provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      
    // Check if we're on the correct network
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== 8453) { // Base Mainnet chain ID
      await switchToBaseMainnet();
    }
    
    return provider;
  } catch (error: any) {
      console.warn('Farcaster Frame connection failed:', error);
  }
  }

  throw new WalletError('No Farcaster wallet found. Please use Farcaster to continue.');
}

/**
 * Switch to Base Mainnet network
 */
export async function switchToBaseMainnet(): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new WalletError('No wallet provider found');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: NETWORK_CONFIG.chainId }],
    });
  } catch (error: any) {
    // If the network doesn't exist, add it
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [NETWORK_CONFIG],
        });
      } catch (addError: any) {
        throw new WalletError(`Failed to add Base Mainnet network: ${addError.message}`);
      }
    } else {
      throw new WalletError(`Failed to switch to Base Mainnet: ${error.message}`);
    }
  }
}

/**
 * Get the current account address
 */
export async function getCurrentAccount(): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new WalletError('No wallet provider found');
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length === 0) {
      throw new WalletError('No accounts found. Please connect your Farcaster wallet.');
    }
    return accounts[0];
  } catch (error: any) {
    throw new WalletError(`Failed to get account: ${error.message}`);
  }
}

/**
 * Get contract instance
 */
export async function getContract(provider: ethers.BrowserProvider) {
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/**
 * Start a quiz with signature-based authentication (NO PAYMENT REQUIRED)
 */
export async function startQuizWithSignature(
  mode: QuizMode,
  config: any,
  onStateChange?: (state: TransactionState) => void
): Promise<string> {
  try {
    onStateChange?.(TransactionState.CONNECTING);
    
    // Debug: Log connection attempt
    console.log('Attempting to get wallet client for signature...');
    console.log('Config:', config);
    
    // Try to get wallet client from Wagmi with enhanced error handling
    let client;
    try {
      client = await getWalletClient(config);
      console.log('Wallet client obtained:', !!client);
      
      // Additional validation for the client
      if (!client) {
        throw new WalletError('No wallet client available. Please connect your Farcaster wallet first.');
      }
      
      // Check if the client has the required methods and fix if needed
      if (typeof client.getChainId !== 'function') {
        console.warn('⚠️ Client missing getChainId method, creating fallback...');
        // Try to get chain ID from the account or use a fallback
        const chainId = client.chain?.id || 8453; // Default to Base Mainnet
        console.log('📝 Using chain ID:', chainId);
        
        // Create a mock client with the required methods
        const mockClient = {
          ...client,
          getChainId: async () => chainId,
        };
        client = mockClient;
      }
      
    } catch (connectorError: any) {
      console.error('getWalletClient failed:', connectorError);
      
      // Enhanced error handling for different connector issues
      if (connectorError.message?.includes('Connector not connected')) {
        throw new WalletError('Please connect your Farcaster wallet first. Go to the Wallet tab and click "Connect Farcaster".');
      } else if (connectorError.message?.includes('getChainId is not a function')) {
        console.warn('⚠️ getChainId error detected, this is a known issue with some connectors');
        console.warn('⚠️ Please try reconnecting your wallet or refreshing the page');
        throw new WalletError('Wallet connection issue. Please try reconnecting your wallet or refreshing the page.');
      } else if (connectorError.message?.includes('User rejected')) {
        throw new WalletError('Connection was rejected. Please try again.');
      }
      
      // Log the full error for debugging
      console.error('Full connector error:', connectorError);
      throw new WalletError(`Connection failed: ${connectorError.message || 'Unknown error'}`);
    }
    
    if (!client) {
      throw new WalletError('Wallet not connected. Please connect your Farcaster wallet first.');
    }
    
    onStateChange?.(TransactionState.CONFIRMING);
    
    // Verify we're on the correct network
    let networkId;
    try {
      networkId = await client.getChainId();
      console.log('📝 Network ID from client:', networkId);
    } catch (networkError) {
      console.warn('⚠️ getChainId failed, using fallback approach:', networkError);
      // Fallback: try to get chain ID from client.chain or use default
      networkId = client.chain?.id || 8453; // Default to Base Mainnet
      console.log('📝 Using fallback network ID:', networkId);
    }
    
    if (networkId !== 8453) { // Base Mainnet
      throw new WalletError('Please switch to Base network to start quizzes.');
    }
    
    // Get user address and current nonce
    const userAddress = client.account.address;
    const timestamp = BigInt(Math.floor(Date.now() / 1000));
    
    // Get user's current nonce from contract
    // Use a simpler approach - start with nonce 0 if contract call fails
    let nonce = BigInt(0); // Default to 0
    let contract;
    
    try {
      // Create provider using the client's transport
      const provider = new ethers.BrowserProvider(client.transport);
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Try to get the nonce with a timeout
      const noncePromise = contract.getUserNonce(userAddress);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Contract call timeout')), 5000)
      );
      
      nonce = await Promise.race([noncePromise, timeoutPromise]);
      console.log('✅ Contract connection successful, nonce:', nonce.toString());
    } catch (contractError) {
      const errorMessage = contractError instanceof Error ? contractError.message : 'Unknown error';
      console.warn('⚠️ Contract call failed, using default nonce 0:', errorMessage);
      console.log('🔍 This is normal for first-time users or network issues');
      console.log('🔍 Continuing with nonce 0 - this is safe for new users');
      // Continue with nonce 0 - this is fine for new users
    }
    
    console.log('=== SIGNATURE DEBUG ===');
    console.log('User:', userAddress);
    console.log('Mode:', Number(mode));
    console.log('Timestamp:', timestamp.toString());
    console.log('Nonce:', nonce.toString());
    console.log('=====================');
    
    // 🔑 KEY FIX: Get the RAW hash from the contract (NEW APPROACH)
    let rawMessageHash;
    if (contract) {
      try {
        // The new contract's getMessageHash() returns the raw hash (no Ethereum prefix)
        rawMessageHash = await contract.getMessageHash(userAddress, Number(mode), timestamp, nonce);
        console.log('📝 Raw message hash from contract:', rawMessageHash);
      } catch (hashError) {
        const errorMessage = hashError instanceof Error ? hashError.message : 'Unknown error';
        console.warn('⚠️ Contract getMessageHash failed, using fallback:', errorMessage);
        // Fallback: create the raw hash manually
        rawMessageHash = ethers.solidityPackedKeccak256(
          ['address', 'uint8', 'uint256', 'uint256'],
          [userAddress, Number(mode), timestamp, nonce]
        );
        console.log('📝 Fallback raw message hash:', rawMessageHash);
      }
    } else {
      // Fallback: create the raw hash manually
      rawMessageHash = ethers.solidityPackedKeccak256(
        ['address', 'uint8', 'uint256', 'uint256'],
        [userAddress, Number(mode), timestamp, nonce]
      );
      console.log('📝 Fallback raw message hash (no contract):', rawMessageHash);
    }
    
    // Sign the raw message hash (wallet will add Ethereum prefix automatically)
    let signature;
    try {
      // Sign the raw hash - wallet will add Ethereum prefix
      signature = await client.signMessage({
        message: { raw: rawMessageHash as `0x${string}` }
      });
      console.log('✅ Signature created:', signature);
      console.log('=== SIGNATURE VERIFICATION DEBUG ===');
      console.log('Raw message hash used:', rawMessageHash);
      console.log('Signature created:', signature);
      console.log('=====================================');
    } catch (signError) {
      const errorMessage = signError instanceof Error ? signError.message : 'Unknown error';
      console.error('❌ Signature creation failed:', errorMessage);
      throw new WalletError(`Failed to create signature: ${errorMessage}`);
    }
    
    // Encode the startQuizWithSignature function call
    const txData = encodeFunctionData({
      abi: CONTRACT_ABI,
      functionName: 'startQuizWithSignature',
      args: [Number(mode), BigInt(timestamp), signature],
    });
    
    console.log('Transaction data:', {
      to: CONTRACT_ADDRESS,
      data: txData,
      value: '0'
    });
    
    // Send transaction using Farcaster wallet (NO VALUE REQUIRED)
    const txHash = await client.sendTransaction({
      to: CONTRACT_ADDRESS as `0x${string}`,
      data: txData,
      value: BigInt(0), // NO PAYMENT REQUIRED
      chain: null,
    });
    
    console.log('Transaction hash:', txHash);
    
    onStateChange?.(TransactionState.SUCCESS);
    
    return txHash;
  } catch (error: any) {
    onStateChange?.(TransactionState.ERROR);
    
    if (error instanceof WalletError) {
      throw error;
    }
    
    // Handle common error cases
    if (error.code === 4001) {
      throw new WalletError('Transaction rejected by user');
    } else if (error.code === -32603) {
      throw new WalletError('Transaction failed. Please try again.');
    } else if (error.message?.includes('Signature expired')) {
      throw new WalletError('Signature expired. Please try again.');
    } else if (error.message?.includes('Invalid signature')) {
      throw new WalletError('Invalid signature. Please try again.');
    } else if (error.message?.includes('Signature already used')) {
      throw new WalletError('Signature already used. Please try again.');
    } else if (error.message?.includes('getChainId is not a function')) {
      throw new WalletError('Wallet connection issue. Please try reconnecting your wallet.');
    } else if (error.message?.includes('missing revert data')) {
      throw new WalletError('Unable to start quiz. Please try again in a moment.');
    } else if (error.message?.includes('CALL_EXCEPTION')) {
      throw new WalletError('Quiz system is temporarily unavailable. Please try again.');
    } else if (error.message?.includes('execution reverted')) {
      throw new WalletError('Quiz entry failed. Please try again.');
    }
    
    console.error('Full error details:', error);
    throw new WalletError(`Transaction failed: ${error.message}`);
  }
}

/**
 * Legacy function - now uses signature-based authentication
 * @deprecated Use startQuizWithSignature instead
 */
export async function startQuizTransaction(
  _mode: QuizMode,
  _onStateChange?: (state: TransactionState) => void
): Promise<string> {
  // Redirect to signature-based method
  console.warn('startQuizTransaction is deprecated. Use startQuizWithSignature instead.');
  throw new WalletError('This method is deprecated. Please use the new signature-based authentication.');
}

/**
 * Record quiz completion (optional - can be called by frontend)
 */
export async function recordQuizCompletion(
  userAddress: string,
  mode: QuizMode,
  score: number
): Promise<string> {
  try {
    const provider = await connectWallet();
    const contract = await getContract(provider);
    
    const tx = await contract.recordQuizCompletion(userAddress, mode, score);
    const receipt = await tx.wait();
    
    return receipt.transactionHash;
  } catch (error: any) {
    throw new WalletError(`Failed to record completion: ${error.message}`);
  }
}

/**
 * Get user's quiz statistics
 */
export async function getUserQuizStats(userAddress: string): Promise<{
  quizCount: number;
  totalQuizzes: number;
  classicQuizzes: number;
  timeQuizzes: number;
  challengeQuizzes: number;
  userNonce: number;
}> {
  try {
    const provider = await connectWallet();
    const contract = await getContract(provider);
    
    const [quizCount, stats, nonce] = await Promise.all([
      contract.getUserQuizCount(userAddress),
      contract.getStats(),
      contract.getUserNonce(userAddress)
    ]);
    
    return {
      quizCount: quizCount.toNumber(),
      totalQuizzes: stats.total.toNumber(),
      classicQuizzes: stats.classic.toNumber(),
      timeQuizzes: stats.time.toNumber(),
      challengeQuizzes: stats.challenge.toNumber(),
      userNonce: nonce.toNumber()
    };
  } catch (error: any) {
    throw new WalletError(`Failed to get stats: ${error.message}`);
  }
}

/**
 * Format error message for user display
 */
export function formatWalletError(error: WalletError): string {
  switch (error.code) {
    case '4001':
      return 'Transaction was cancelled';
    case '4902':
      return 'Please switch to Base Sepolia network';
    default:
      return error.message || 'An unknown error occurred';
  }
}

/**
 * Get network name from chain ID
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 84532:
      return 'Base Sepolia';
    case 1:
      return 'Ethereum Mainnet';
    case 11155111:
      return 'Sepolia';
    default:
      return `Chain ${chainId}`;
  }
}


