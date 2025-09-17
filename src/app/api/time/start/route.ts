import { NextResponse } from 'next/server';
import { getCurrencyAccountsCollection, getCurrencyTxnsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

const ENTRY_COST = 10; // coins per Time Mode run

export async function POST(request: Request) {
  try {
    const { fid } = await request.json();
    const nfid = Number(fid);
    if (!nfid || Number.isNaN(nfid)) {
      return NextResponse.json({ error: 'fid required' }, { status: 400 });
    }

    const accounts = await getCurrencyAccountsCollection();
    const txns = await getCurrencyTxnsCollection();
    const now = Date.now();

    const acct = await accounts.findOne({ fid: nfid });
    if (!acct) {
      await accounts.insertOne({ fid: nfid, balance: 50, dailyStreakDay: 0, createdAt: now, updatedAt: now });
    }

    const updated = await accounts.findOneAndUpdate(
      { fid: nfid, balance: { $gte: ENTRY_COST } },
      { $inc: { balance: -ENTRY_COST }, $set: { updatedAt: now } },
      { returnDocument: 'after' as any }
    );

    if (!updated.value) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const sessionId = `time_${nfid}_${now}`;
    await txns.insertOne({ fid: nfid, amount: -ENTRY_COST, reason: 'time_entry', refId: sessionId, createdAt: now });

    return NextResponse.json({ success: true, sessionId, balance: updated.value.balance, durationSec: 45 });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to start time mode' }, { status: 500 });
  }
}


