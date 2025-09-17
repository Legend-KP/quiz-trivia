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
      const now = Date.now();
      await accounts.insertOne({
        fid,
        balance: 50,
        dailyStreakDay: 0,
        createdAt: now,
        updatedAt: now,
      } as any);
      acct = await accounts.findOne({ fid });
    }

    const balance = acct?.balance ?? 50;
    const dailyStreakDay = acct?.dailyStreakDay ?? 0;
    const lastClaimAt = acct?.lastClaimAt;
    return NextResponse.json({ balance, dailyStreakDay, lastClaimAt });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}


