import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const platformWallet = process.env.PLATFORM_WALLET_ADDRESS;
    
    if (!platformWallet) {
      return NextResponse.json({ error: 'Platform wallet not configured' }, { status: 500 });
    }
    
    return NextResponse.json({ address: platformWallet });
  } catch (error: any) {
    console.error('Platform wallet fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch platform wallet' }, { status: 500 });
  }
}

