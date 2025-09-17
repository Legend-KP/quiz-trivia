import { NextResponse } from 'next/server';
import { getChallengesCollection, getCurrencyAccountsCollection, getCurrencyTxnsCollection, getQuestionsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

const ENTRY_COST = 10; // per player, deducted on accept for opponent, on create for challenger

export async function POST(request: Request) {
  try {
    const { fid } = await request.json();
    const nfid = Number(fid);
    if (!nfid || Number.isNaN(nfid)) {
      return NextResponse.json({ error: 'fid required' }, { status: 400 });
    }

    const now = Date.now();
    const durationSec = 120;
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24h

    // Deduct entry from challenger now
    const accounts = await getCurrencyAccountsCollection();
    const txns = await getCurrencyTxnsCollection();
    const balanceGuard = await accounts.updateOne(
      { fid: nfid, balance: { $gte: ENTRY_COST } },
      { $inc: { balance: -ENTRY_COST }, $set: { updatedAt: now } }
    );
    if (!balanceGuard.matchedCount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Build question set
    const questionsCol = await getQuestionsCollection();
    const pipeline = [ { $match: { isActive: true } }, { $sample: { size: 10 } }, { $project: { _id: 0 } } ];
    const questions = await questionsCol.aggregate(pipeline).toArray();

    const id = `ch_${nfid}_${now}`;
    const challenges = await getChallengesCollection();
    await challenges.insertOne({
      id,
      challengerFid: nfid,
      status: 'pending',
      createdAt: now,
      expiresAt,
      durationSec,
      questions,
    } as any);

    await txns.insertOne({ fid: nfid, amount: -ENTRY_COST, reason: 'challenge_entry', refId: id, createdAt: now });

    return NextResponse.json({ success: true, id, durationSec });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 });
  }
}


