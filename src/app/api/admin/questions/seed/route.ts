import { NextRequest, NextResponse } from 'next/server';
import { getBetModeQuestionsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

// Sample questions - you'll replace this with your 100+ questions
const SAMPLE_QUESTIONS = [
  {
    id: 'q1',
    text: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctIndex: 2,
    difficulty: 'easy' as const,
    explanation: 'Paris is the capital and largest city of France.',
    isActive: true,
  },
  {
    id: 'q2',
    text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctIndex: 1,
    difficulty: 'easy' as const,
    explanation: 'Mars is called the Red Planet due to iron oxide on its surface.',
    isActive: true,
  },
  // Add more questions here...
];

export async function POST(req: NextRequest) {
  try {
    // Verify admin key
    const adminKey = req.headers.get('x-admin-key');
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || adminKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questions } = await req.json().catch(() => ({ questions: null }));

    const questionsToInsert = questions || SAMPLE_QUESTIONS;
    const now = Date.now();

    const questionsCollection = await getBetModeQuestionsCollection();

    // Insert questions
    const insertPromises = questionsToInsert.map((q: any) =>
      questionsCollection.updateOne(
        { id: q.id },
        {
          $set: {
            ...q,
            createdAt: now,
          },
        },
        { upsert: true }
      )
    );

    await Promise.all(insertPromises);

    return NextResponse.json({
      success: true,
      inserted: questionsToInsert.length,
      message: 'Questions seeded successfully',
    });
  } catch (error: any) {
    console.error('Question seed error:', error);
    return NextResponse.json({ error: error.message || 'Failed to seed questions' }, { status: 500 });
  }
}

