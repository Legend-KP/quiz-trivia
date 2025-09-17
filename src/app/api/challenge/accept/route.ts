import { NextResponse } from 'next/server';
import { getChallengesCollection, getCurrencyAccountsCollection, getCurrencyTxnsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';
const ENTRY_COST = 10;

export async function POST(request: Request) {
  try {
    const { fid, id } = await request.json();
    const nfid = Number(fid);
    if (!nfid || !id) return NextResponse.json({ error: 'fid and id required' }, { status: 400 });

    const challenges = await getChallengesCollection();
    const ch = await challenges.findOne({ id });
    if (!ch) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    if (ch.status !== 'pending') return NextResponse.json({ error: 'Challenge not available' }, { status: 400 });

    // Deduct entry from opponent now
    const now = Date.now();
    const accounts = await getCurrencyAccountsCollection();
    const txns = await getCurrencyTxnsCollection();
    const guard = await accounts.updateOne(
      { fid: nfid, balance: { $gte: ENTRY_COST } },
      { $inc: { balance: -ENTRY_COST }, $set: { updatedAt: now } }
    );
    if (!guard.matchedCount) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    await txns.insertOne({ fid: nfid, amount: -ENTRY_COST, reason: 'challenge_entry', refId: id, createdAt: now });

    await challenges.updateOne({ id }, { $set: { status: 'accepted', opponentFid: nfid } });
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to accept challenge' }, { status: 500 });
  }
}


