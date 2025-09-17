import { NextResponse } from 'next/server';
import { getChallengesCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const challenges = await getChallengesCollection();
    const ch = await challenges.findOne({ id: params.id });
    if (!ch) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ challenge: { ...ch, _id: undefined } });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to load challenge' }, { status: 500 });
  }
}


