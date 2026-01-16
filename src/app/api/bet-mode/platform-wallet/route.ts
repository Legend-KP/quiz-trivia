import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    const platformWallet = process.env.PLATFORM_WALLET_ADDRESS;
    
    // Return null address instead of error - this is not critical for Bet Mode to function
    // Platform wallet is only needed for deposit verification
    if (!platformWallet) {
      return NextResponse.json({ address: null });
    }
    
    return NextResponse.json({ address: platformWallet });
  } catch (error: any) {
    // Return null instead of error to prevent console errors
    return NextResponse.json({ address: null });
  }
}

