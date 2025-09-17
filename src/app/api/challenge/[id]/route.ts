import { NextResponse } from 'next/server';
import { getChallengesCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(_req: Request, context: any) {
  try {
    const id = context?.params?.id as string;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const challenges = await getChallengesCollection();
    const ch = await challenges.findOne({ id });
    if (!ch) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // strip _id for cleanliness
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...rest } = ch as any;
    return NextResponse.json({ challenge: rest });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to load challenge' }, { status: 500 });
  }
}


