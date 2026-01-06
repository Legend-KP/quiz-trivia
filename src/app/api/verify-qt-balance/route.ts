import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export const runtime = 'nodejs';

const QT_TOKEN_ADDRESS = process.env.QT_TOKEN_ADDRESS || '0x361faAea711B20caF59726e5f478D745C187cB07';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const MIN_REQUIRED_QT = 1; // 1 QT minimum

/**
 * Verify QT token balance for a wallet address
 * GET /api/verify-qt-balance?address=0x...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Read balance from blockchain
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const tokenAbi = ['function balanceOf(address owner) view returns (uint256)'];
    const tokenContract = new ethers.Contract(QT_TOKEN_ADDRESS, tokenAbi, provider);

    const balance = await tokenContract.balanceOf(address);
    const balanceFormatted = parseFloat(ethers.formatUnits(balance, 18));
    const hasEnoughTokens = balanceFormatted >= MIN_REQUIRED_QT;

    return NextResponse.json({
      success: true,
      address,
      balance: balanceFormatted,
      balanceFormatted: balanceFormatted.toLocaleString('en-US', {
        maximumFractionDigits: 4,
      }),
      hasEnoughTokens,
      minRequired: MIN_REQUIRED_QT,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error verifying QT balance:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to verify balance',
      },
      { status: 500 }
    );
  }
}

