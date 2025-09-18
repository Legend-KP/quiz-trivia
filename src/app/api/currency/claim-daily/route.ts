import { NextRequest } from 'next/server';
import { getCurrencyAccountsCollection, getCurrencyTxnsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

function isSameUTCDate(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = Number(body.fid);
    if (!Number.isFinite(fid)) return new Response(JSON.stringify({ error: 'Invalid fid' }), { status: 400, headers: { 'content-type': 'application/json' } });

    const accounts = await getCurrencyAccountsCollection();
    const txns = await getCurrencyTxnsCollection();

    const now = Date.now();
    const today = new Date(now);

    // Ensure account exists
    await accounts.updateOne(
      { fid },
      { $setOnInsert: { balance: 0, dailyStreakDay: 0, createdAt: now }, $set: { updatedAt: now } },
      { upsert: true }
    );

    const doc = await accounts.findOne({ fid });
    const lastClaim = doc?.lastClaimAt ? new Date(doc.lastClaimAt) : undefined;

    // If already claimed today, no-op
    if (lastClaim && isSameUTCDate(lastClaim, today)) {
      return new Response(JSON.stringify({ success: true, balance: doc?.balance ?? 0, streakDay: doc?.dailyStreakDay ?? 0, alreadyClaimed: true }), { headers: { 'content-type': 'application/json' } });
    }

    // Determine if streak continues (claimed yesterday) or resets
    let streakDay = doc?.dailyStreakDay ?? 0; // 0..7
    if (lastClaim) {
      const yesterday = new Date(today);
      yesterday.setUTCDate(today.getUTCDate() - 1);
      const continued = isSameUTCDate(lastClaim, yesterday);
      streakDay = continued ? Math.min(7, streakDay + 1) : 1;
    } else {
      streakDay = 1;
    }

    // Reward schedule by streak day
    const rewardMap: Record<number, number> = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 30, 6: 40, 7: 50 };
    const reward = rewardMap[streakDay] ?? 5;

    // Apply reward and update streak
    await accounts.updateOne(
      { fid },
      { $inc: { balance: reward }, $set: { lastClaimAt: now, dailyStreakDay: streakDay, updatedAt: now } }
    );

    try {
      await txns.insertOne({ fid, amount: reward, reason: 'daily_claim', createdAt: now });
    } catch {}

    const after = await accounts.findOne({ fid });
    return new Response(JSON.stringify({ success: true, balance: after?.balance ?? 0, streakDay }), { headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

 
