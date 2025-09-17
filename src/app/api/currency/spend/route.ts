import { NextResponse } from 'next/server';
import { getCurrencyAccountsCollection, getCurrencyTxnsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { fid, amount, reason, refId } = await request.json();
    const nfid = Number(fid);
    const namount = Number(amount);
    if (!nfid || Number.isNaN(nfid) || !namount || Number.isNaN(namount) || namount <= 0) {
      return NextResponse.json({ error: 'fid and positive amount required' }, { status: 400 });
    }

    const accounts = await getCurrencyAccountsCollection();
    const txns = await getCurrencyTxnsCollection();
    const now = Date.now();

    const acct = await accounts.findOne({ fid: nfid });
    if (!acct) {
      // initialize account with 50
      await accounts.insertOne({ fid: nfid, balance: 50, dailyStreakDay: 0, createdAt: now, updatedAt: now });
    }

    const updated = await accounts.findOneAndUpdate(
      { fid: nfid, balance: { $gte: namount } },
      { $inc: { balance: -namount }, $set: { updatedAt: now } },
      { returnDocument: 'after' as any }
    );

    if (!updated.value) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    await txns.insertOne({ fid: nfid, amount: -namount, reason: reason || 'other', refId, createdAt: now });

    return NextResponse.json({ success: true, balance: updated.value.balance });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to spend' }, { status: 500 });
  }
}


