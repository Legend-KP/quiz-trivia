import { NextRequest } from 'next/server';
import { getCurrencyAccountsCollection, getCurrencyTxnsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

function _isSameUTCDate(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

// Spin wheel options with probabilities - All segments now award QT tokens
const SPIN_OPTIONS = [
  { 
    id: '100_qt', 
    qtAmount: 100, 
    probability: 0.30,  // 30% - Most common
    label: '100 QT',
    isToken: true 
  },
  { 
    id: '200_qt', 
    qtAmount: 200, 
    probability: 0.25,  // 25%
    label: '200 QT',
    isToken: true 
  },
  { 
    id: '500_qt', 
    qtAmount: 500, 
    probability: 0.20,  // 20%
    label: '500 QT',
    isToken: true 
  },
  { 
    id: '1000_qt', 
    qtAmount: 1000, 
    probability: 0.15,  // 15%
    label: '1K QT',
    isToken: true 
  },
  { 
    id: '2000_qt', 
    qtAmount: 2000, 
    probability: 0.07,  // 7%
    label: '2K QT',
    isToken: true 
  },
  { 
    id: '10000_qt', 
    qtAmount: 10000, 
    probability: 0.03,  // 3% - Most rare
    label: '10K QT',
    isToken: true 
  }
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
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }), 
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }
    
    const fid = Number(body.fid);

    if (!Number.isFinite(fid)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid fid' }), 
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    let accounts, txns;
    try {
      accounts = await getCurrencyAccountsCollection();
      txns = await getCurrencyTxnsCollection();
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database connection failed', details: dbError?.message }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
    
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

    // All rewards are now QT tokens - no coin rewards
    // Update lastSpinAt for tracking cooldown
    await accounts.updateOne(
      { fid },
      { $set: { lastSpinAt: now, updatedAt: now } }
    );
    
    // Note: QT token transfer will be handled by the frontend
    // via the smart contract claimSpinReward function

    const after = await accounts.findOne({ fid });

    return new Response(
      JSON.stringify({
        success: true,
        balance: after?.balance ?? 0,
        spinResult: {
          id: spinResult.id,
          qtAmount: spinResult.qtAmount,
          label: spinResult.label,
          isToken: spinResult.isToken,
          requiresClaim: true // User must claim via smart contract
        }
      }), 
      { 
        status: 200,
        headers: { 'content-type': 'application/json' } 
      }
    );
  } catch (err: any) {
    console.error('Error in claim-daily route:', err);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: err?.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err?.stack : undefined
      }), 
      { 
        status: 500, 
        headers: { 'content-type': 'application/json' } 
      }
    );
  }
}