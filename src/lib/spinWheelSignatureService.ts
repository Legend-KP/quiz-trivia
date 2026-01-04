/**
 * Backend service for generating secure claim signatures for Spin Wheel
 * 
 * This service generates cryptographic signatures that prove the backend
 * authorized a specific reward amount for a specific user.
 */

import { ethers } from 'ethers';

export interface ClaimSignatureData {
  userAddress: string;
  rewardAmount: string; // In wei (18 decimals)
  rewardAmountReadable: number; // Human-readable amount
  nonce: number;
  deadline: number;
  signature: string;
  expiresAt: string; // ISO timestamp
}

export class SpinWheelSignatureService {
  private signer: ethers.Wallet;
  private contractAddress: string;
  private chainId: number;

  constructor(
    backendSignerPrivateKey: string,
    contractAddress: string,
    chainId: number = 8453 // Base mainnet default
  ) {
    if (!backendSignerPrivateKey) {
      throw new Error('BACKEND_SIGNER_PRIVATE_KEY is required');
    }
    if (!contractAddress) {
      throw new Error('CONTRACT_ADDRESS is required');
    }

    this.signer = new ethers.Wallet(backendSignerPrivateKey);
    this.contractAddress = contractAddress;
    this.chainId = chainId;
  }

  /**
   * Generate signature for a spin wheel reward claim
   * @param userAddress - User's wallet address
   * @param rewardAmount - Reward amount in base units (e.g., 100, 200, 500, 1000, 2000, 10000)
   * @param nonce - Unique nonce (use timestamp + random or incrementing counter)
   * @param deadlineSeconds - How long signature is valid (default: 5 minutes)
   * @returns Signature data to send to frontend
   */
  async generateClaimSignature(
    userAddress: string,
    rewardAmount: number,
    nonce: number,
    deadlineSeconds: number = 300
  ): Promise<ClaimSignatureData> {
    // Validate inputs
    const validAmounts = [100, 200, 500, 1000, 2000, 10000];
    if (!validAmounts.includes(rewardAmount)) {
      throw new Error(
        `Invalid reward amount. Must be one of: ${validAmounts.join(', ')}`
      );
    }

    if (!ethers.isAddress(userAddress)) {
      throw new Error('Invalid user address');
    }

    // Convert to wei (18 decimals)
    const rewardAmountWei = ethers.parseEther(rewardAmount.toString());

    // Calculate deadline
    const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;

    // Create message hash (must match contract exactly)
    // Contract uses: keccak256(abi.encodePacked(msg.sender, rewardAmount, nonce, deadline, address(this), block.chainid))
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256', 'uint256', 'address', 'uint256'],
      [
        userAddress,
        rewardAmountWei,
        nonce,
        deadline,
        this.contractAddress,
        this.chainId,
      ]
    );

    // Sign the message hash
    // signMessage() automatically adds the Ethereum message prefix: "\x19Ethereum Signed Message:\n32"
    // This matches what the contract does with toEthSignedMessageHash()
    // We pass the hash as bytes, and signMessage will add the prefix and sign it
    const signature = await this.signer.signMessage(ethers.getBytes(messageHash));
    
    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Signature Debug:', {
        userAddress,
        rewardAmount: rewardAmountWei.toString(),
        nonce: nonce.toString(),
        deadline: deadline.toString(),
        contractAddress: this.contractAddress,
        chainId: this.chainId.toString(),
        messageHash,
        signature: signature.substring(0, 20) + '...',
        signerAddress: this.signer.address,
      });
    }

    return {
      userAddress,
      rewardAmount: rewardAmountWei.toString(), // Send in wei
      rewardAmountReadable: rewardAmount,
      nonce,
      deadline,
      signature,
      expiresAt: new Date(deadline * 1000).toISOString(),
    };
  }

  /**
   * Verify a signature (optional - contract will verify on-chain)
   * @param signatureData - Data returned from generateClaimSignature
   * @returns Whether signature is valid
   */
  verifySignature(signatureData: ClaimSignatureData): boolean {
    try {
      const { userAddress, rewardAmount, nonce, deadline, signature } =
        signatureData;

      const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'uint256', 'uint256', 'uint256', 'address', 'uint256'],
        [
          userAddress,
          rewardAmount,
          nonce,
          deadline,
          this.contractAddress,
          this.chainId,
        ]
      );

      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(messageHash),
        signature
      );

      return (
        recoveredAddress.toLowerCase() === this.signer.address.toLowerCase()
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Get the backend signer address (for verification)
   */
  getSignerAddress(): string {
    return this.signer.address;
  }
}

/**
 * Helper function to create a signature service instance from environment variables
 */
export function createSpinWheelSignatureService(): SpinWheelSignatureService {
  const backendSignerPrivateKey =
    process.env.BACKEND_SIGNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const contractAddress =
    process.env.SPIN_WHEEL_CONTRACT_ADDRESS ||
    process.env.NEXT_PUBLIC_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS;
  const chainId = process.env.CHAIN_ID
    ? parseInt(process.env.CHAIN_ID)
    : 8453; // Base mainnet

  if (!backendSignerPrivateKey) {
    throw new Error(
      'BACKEND_SIGNER_PRIVATE_KEY or PRIVATE_KEY environment variable is required'
    );
  }
  if (!contractAddress) {
    throw new Error(
      'SPIN_WHEEL_CONTRACT_ADDRESS or NEXT_PUBLIC_SPIN_WHEEL_QT_DISTRIBUTOR_ADDRESS environment variable is required'
    );
  }

  return new SpinWheelSignatureService(
    backendSignerPrivateKey,
    contractAddress,
    chainId
  );
}

