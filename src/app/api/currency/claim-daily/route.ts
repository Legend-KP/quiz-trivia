import { NextRequest } from 'next/server';
import { getCurrencyAccountsCollection, getCurrencyTxnsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

function _isSameUTCDate(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

// Spin wheel options with probabilities
const SPIN_OPTIONS = [
  { id: '0_coins', coins: 0, probability: 0.20, label: '0 Coins', isToken: false },
  { id: '5_coins', coins: 5, probability: 0.25, label: '5 Coins', isToken: false },
  { id: '10_coins', coins: 10, probability: 0.20, label: '10 Coins', isToken: false },
  { id: '15_coins', coins: 15, probability: 0.15, label: '15 Coins', isToken: false },
  { id: '25_coins', coins: 25, probability: 0.10, label: '25 Coins', isToken: false },
  { id: 'qt_token', coins: 0, probability: 0.10, label: '10k $QT Token', isToken: true }
];

function getRandomSpinResult() {
  const random = Math.random();
  let cumulativeProbability = 0;
 
  for (const option of SPIN_OPTIONS) {
    cumulativeProbability += option.probability;
    if (random <= cumulativeProbability) {
      return option;
    }
  }
 
  // Fallback to first option
  return SPIN_OPTIONS[0];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = Number(body.fid);

    if (!Number.isFinite(fid)) return new Response(JSON.stringify({ error: 'Invalid fid' }), { status: 400, headers: { 'content-type': 'application/json' } });

    const accounts = await getCurrencyAccountsCollection();
    const txns = await getCurrencyTxnsCollection();
    const now = Date.now();
    const _today = new Date(now);

    // Ensure account exists
    await accounts.updateOne(
      { fid },
      { $setOnInsert: { balance: 0, dailyStreakDay: 0, createdAt: now }, $set: { updatedAt: now } },
      { upsert: true }
    );

    const doc = await accounts.findOne({ fid });
    const _lastSpin = doc?.lastSpinAt ? new Date(doc.lastSpinAt) : undefined;

    // COMMENTED OUT FOR TESTING - Remove this comment block when going live
    /*
    // If already spun today, no-op
    if (lastSpin && isSameUTCDate(lastSpin, today)) {
      return new Response(JSON.stringify({ success: true, balance: doc?.balance ?? 0, alreadySpun: true }), { headers: { 'content-type': 'application/json' } });
    }
    */

    // Get random spin result
    const spinResult = getRandomSpinResult();

    // Apply reward if it's coins (not QT token)
    if (!spinResult.isToken && spinResult.coins > 0) {
      await accounts.updateOne(
        { fid },
        { $inc: { balance: spinResult.coins }, $set: { lastSpinAt: now, updatedAt: now } }
      );

      try {
        await txns.insertOne({ fid, amount: spinResult.coins, reason: 'spin_wheel', createdAt: now });
      } catch {}
    }

    // Handle QT token transfer if user won QT tokens
    if (spinResult.isToken) {
      // Update lastSpinAt even for QT token wins
      await accounts.updateOne(
        { fid },
        { $set: { lastSpinAt: now, updatedAt: now } }
      );
      // Note: QT token transfer will be handled by the frontend
      // by calling the /api/qt-token/transfer endpoint
    }

    const after = await accounts.findOne({ fid });

    return new Response(JSON.stringify({
      success: true,
      balance: after?.balance ?? 0,
      spinResult: {
        id: spinResult.id,
        coins: spinResult.coins,
        label: spinResult.label,
        isToken: spinResult.isToken
      }
    }), { headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}