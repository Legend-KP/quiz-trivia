import { NextResponse } from 'next/server';
import { getCurrencyAccountsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fidParam = searchParams.get('fid');
    const fid = fidParam ? Number(fidParam) : undefined;
    if (!fid || Number.isNaN(fid)) {
      return NextResponse.json({ error: 'fid required' }, { status: 400 });
    }

    const accounts = await getCurrencyAccountsCollection();
    let acct = await accounts.findOne({ fid });
    if (!acct) {
      // initialize with 50 coins
      acct = {
        fid,
        balance: 50,
        dailyStreakDay: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await accounts.insertOne(acct as any);
    }

    return NextResponse.json({ balance: acct.balance, dailyStreakDay: acct.dailyStreakDay, lastClaimAt: acct.lastClaimAt });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}


