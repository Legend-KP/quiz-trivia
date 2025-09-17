import { NextResponse } from 'next/server';
import { getQuestionsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = Math.max(1, Math.min(100, Number(limitParam) || 10));

    const collection = await getQuestionsCollection();
    const match: any = { isActive: true };
    if (topic) match.topicKey = topic;

    // Use $sample for randomness
    const pipeline = [
      { $match: match },
      { $sample: { size: limit } },
      { $project: { _id: 0 } },
    ];
    const cursor = collection.aggregate(pipeline);
    const questions = await cursor.toArray();

    return NextResponse.json({ questions });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}


