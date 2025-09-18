import { NextRequest } from 'next/server';
import { getCurrencyAccountsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

function isSameUTCDate(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fidParam = searchParams.get('fid');
    if (!fidParam) return new Response(JSON.stringify({ error: 'Missing fid' }), { status: 400, headers: { 'content-type': 'application/json' } });
    const fid = Number(fidParam);
    if (!Number.isFinite(fid)) return new Response(JSON.stringify({ error: 'Invalid fid' }), { status: 400, headers: { 'content-type': 'application/json' } });

    const accounts = await getCurrencyAccountsCollection();
    const now = Date.now();
    const today = new Date(now);

    // Upsert doc so first-time users exist
    const existing = await accounts.findOne({ fid });
    if (!existing) {
      await accounts.insertOne({ fid, balance: 0, dailyStreakDay: 0, createdAt: now, updatedAt: now });
    }

    // Apply base daily grant of 50 if not yet applied today (tracked by lastDailyBaseAt)
    const doc = await accounts.findOne({ fid });
    const lastBase = doc?.lastDailyBaseAt ? new Date(doc.lastDailyBaseAt) : undefined;
    const shouldGrantBase = !lastBase || !isSameUTCDate(lastBase, today);
    if (shouldGrantBase) {
      await accounts.updateOne(
        { fid },
        { $inc: { balance: 50 }, $set: { lastDailyBaseAt: now, updatedAt: now } }
      );
    }

    const after = await accounts.findOne({ fid });
    return new Response(JSON.stringify({ fid, balance: after?.balance ?? 0 }), { headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

 
