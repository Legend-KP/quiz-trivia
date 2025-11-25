import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  getCurrencyAccountsCollection,
  getBetModeGamesCollection,
} from '~/lib/mongodb';
import { BET_MODE_VAULT_ABI, getBetModeVaultAddress } from '~/lib/betModeVault';

export const runtime = 'nodejs';

/**
 * Prepare withdrawal by generating admin signature
 * 
 * Flow:
 * 1. Verify user has sufficient balance
 * 2. Check for active games
 * 3. Get current nonce from contract
 * 4. Generate signature
 * 5. Return signature + nonce + amount
 */
export async function POST(req: NextRequest) {
  try {
    const { fid, amount, walletAddress } = await req.json();

    if (!fid || !amount || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing fid, amount, or walletAddress' },
        { status: 400 }
      );
    }

    const numFid = Number(fid);
    const numAmount = Number(amount);

    if (!Number.isFinite(numFid) || !Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid fid or amount' }, { status: 400 });
    }

    // Validate address
    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // 1. Verify user has sufficient balance
    const accounts = await getCurrencyAccountsCollection();
    const account = await accounts.findOne({ fid: numFid });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const qtBalance = account.qtBalance || 0;
    const qtLockedBalance = account.qtLockedBalance || 0;
    const availableBalance = qtBalance - qtLockedBalance;

    if (availableBalance < numAmount) {
      return NextResponse.json(
        { error: `Insufficient balance. You have ${availableBalance} QT available.` },
        { status: 400 }
      );
    }

    // 2. Check for active games
    const games = await getBetModeGamesCollection();
    const activeGame = await games.findOne({
      fid: numFid,
      status: 'active',
    });

    if (activeGame) {
      return NextResponse.json(
        { error: 'Cannot withdraw during active game' },
        { status: 400 }
      );
    }

    // 3. Get current nonce from contract and verify contract balance
    const contractAddress = getBetModeVaultAddress();
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, BET_MODE_VAULT_ABI, provider);

    // Check user's balance in contract
    let contractBalance: bigint;
    try {
      contractBalance = await contract.userBalances(walletAddress);
      const contractBalanceQT = parseFloat(ethers.formatEther(contractBalance));
      
      // Compare contract balance with database balance
      if (contractBalanceQT < numAmount) {
        const needsSync = contractBalanceQT < availableBalance;
        return NextResponse.json(
          { 
            error: `Insufficient balance in contract. Your contract balance is ${contractBalanceQT.toFixed(2)} QT, but you're trying to withdraw ${numAmount} QT. ${needsSync ? 'Your database shows more balance - deposits may not have synced properly. Attempting to sync...' : 'Please reduce your withdrawal amount.'}`,
            contractBalance: contractBalanceQT,
            dbBalance: availableBalance,
            requestedAmount: numAmount,
            needsSync: needsSync,
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error fetching contract balance:', error);
      return NextResponse.json(
        { error: 'Failed to fetch balance from contract' },
        { status: 500 }
      );
    }

    let nonce: bigint;
    try {
      nonce = await contract.withdrawalNonces(walletAddress);
    } catch (error) {
      console.error('Error fetching nonce:', error);
      return NextResponse.json(
        { error: 'Failed to fetch withdrawal nonce from contract' },
        { status: 500 }
      );
    }

    // 4. Generate signature
    const adminPrivateKey = process.env.ADMIN_SIGNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    
    if (!adminPrivateKey) {
      return NextResponse.json(
        { error: 'Admin signer not configured' },
        { status: 500 }
      );
    }

    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    
    // Convert amount to Wei
    const amountWei = ethers.parseEther(numAmount.toString());
    
    // Get chain ID
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // Generate message hash
    // Format: keccak256(abi.encodePacked(user, amount, nonce, chainId, contractAddress))
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256', 'uint256', 'address'],
      [walletAddress, amountWei, nonce, chainId, contractAddress]
    );
    
    // Sign the message
    const signature = await adminWallet.signMessage(ethers.getBytes(messageHash));
    
    // Verify signature (sanity check)
    const recoveredAddress = ethers.verifyMessage(ethers.getBytes(messageHash), signature);
    if (recoveredAddress.toLowerCase() !== adminWallet.address.toLowerCase()) {
      return NextResponse.json(
        { error: 'Signature generation failed verification' },
        { status: 500 }
      );
    }

    // 5. Return signature + nonce + amount
    return NextResponse.json({
      success: true,
      data: {
        amount: amountWei.toString(),
        nonce: nonce.toString(),
        signature,
        contractAddress,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      },
    });
  } catch (error: any) {
    console.error('❌ Error preparing withdrawal:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to prepare withdrawal' },
      { status: 500 }
    );
  }
}

