import { NextResponse } from 'next/server';
import { getCurrencyAccountsCollection, getCurrencyTxnsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

// Example reward schedule; replace with provided values later
const REWARDS = [10, 12, 14, 16, 18, 20, 25];

export async function POST(request: Request) {
  try {
    const { fid } = await request.json();
    if (!fid || Number.isNaN(Number(fid))) {
      return NextResponse.json({ error: 'fid required' }, { status: 400 });
    }

    const accounts = await getCurrencyAccountsCollection();
    const txns = await getCurrencyTxnsCollection();
    const now = Date.now();

    const acct = await accounts.findOne({ fid: Number(fid) });
    const lastClaimAt = acct?.lastClaimAt || 0;
    const oneDayMs = 24 * 60 * 60 * 1000;

    const isSameDay = lastClaimAt > 0 && (now - lastClaimAt) < oneDayMs && new Date(now).getUTCDate() === new Date(lastClaimAt).getUTCDate();
    if (isSameDay) {
      return NextResponse.json({ error: 'Already claimed today' }, { status: 400 });
    }

    // Determine streak progression
    let nextDay = (acct?.dailyStreakDay || 0) + 1;
    if (nextDay > 7) nextDay = 1;
    const reward = REWARDS[nextDay - 1];

    // Upsert account and record txn
    await accounts.updateOne(
      { fid: Number(fid) },
      {
        $setOnInsert: { createdAt: now, balance: 50, dailyStreakDay: 0 },
        $set: { updatedAt: now, lastClaimAt: now, dailyStreakDay: nextDay },
        $inc: { balance: reward },
      },
      { upsert: true }
    );

    await txns.insertOne({ fid: Number(fid), amount: reward, reason: 'daily_claim', createdAt: now });

    const fresh = await accounts.findOne({ fid: Number(fid) });
    const balance = fresh?.balance ?? 50 + reward;

    return NextResponse.json({ success: true, reward, balance, dailyStreakDay: nextDay });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to claim daily' }, { status: 500 });
  }
}


