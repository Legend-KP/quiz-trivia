import { NextRequest, NextResponse } from 'next/server';
import { getBetModeQuestionsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Verify admin key
    const adminKey = req.headers.get('x-admin-key');
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || adminKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const questionsCollection = await getBetModeQuestionsCollection();
    const questions = await questionsCollection.find({}).toArray();

    return NextResponse.json({
      success: true,
      count: questions.length,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        difficulty: q.difficulty,
        isActive: q.isActive,
      })),
    });
  } catch (error: any) {
    console.error('Question list error:', error);
    return NextResponse.json({ error: error.message || 'Failed to list questions' }, { status: 500 });
  }
}

