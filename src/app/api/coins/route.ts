import { NextRequest } from 'next/server';
import {
  getCurrencyAccountsCollection,
  getCurrencyTxnsCollection,
} from '~/lib/mongodb';
import type { CurrencyTxnDocument } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fidParam = searchParams.get('fid');
    if (!fidParam) {
      return new Response(JSON.stringify({ error: 'Missing fid' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    const fid = Number(fidParam);
    if (!Number.isFinite(fid)) {
      return new Response(JSON.stringify({ error: 'Invalid fid' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const accounts = await getCurrencyAccountsCollection();
    const account = await accounts.findOne({ fid });
    return new Response(
      JSON.stringify({ fid, balance: account?.balance ?? 0 }),
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal error' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fid = Number(body.fid);
    const amount = Number(body.amount ?? 500);
    const allowedReasons: CurrencyTxnDocument['reason'][] = [
      'time_entry',
      'challenge_entry',
      'win_reward',
      'daily_claim',
      'admin_adjust',
      'other',
    ];
    const requestedReason = typeof body.reason === 'string' ? body.reason : undefined;
    const reason: CurrencyTxnDocument['reason'] = allowedReasons.includes(
      requestedReason as CurrencyTxnDocument['reason']
    )
      ? (requestedReason as CurrencyTxnDocument['reason'])
      : 'admin_adjust';
    if (!Number.isFinite(fid)) {
      return new Response(JSON.stringify({ error: 'Invalid fid' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (!Number.isFinite(amount)) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const now = Date.now();
    const accounts = await getCurrencyAccountsCollection();
    const txns = await getCurrencyTxnsCollection();

    // Upsert account and increment balance atomically
    const updateResult = await accounts.findOneAndUpdate(
      { fid },
      {
        $inc: { balance: amount },
        $setOnInsert: { createdAt: now, dailyStreakDay: 0 },
        $set: { updatedAt: now },
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Record transaction (best-effort; do not fail the whole call if this fails)
    try {
      await txns.insertOne({ fid, amount, reason, createdAt: now });
    } catch {}

    const updatedBalance = (
      updateResult?.value as { balance?: number } | null
    )?.balance;
    return new Response(
      JSON.stringify({ fid, balance: updatedBalance ?? amount }),
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal error' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}


