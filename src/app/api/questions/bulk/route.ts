import { NextResponse } from 'next/server';
import { getQuestionsCollection, QuestionDocument } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const adminSecret = process.env.ADMIN_SECRET;
    const provided = request.headers.get('x-admin-secret') || request.headers.get('X-Admin-Secret');
    if (!adminSecret || provided !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { topicKey, questions } = body as { topicKey?: string; questions?: any[] };

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'questions array required' }, { status: 400 });
    }

    // Normalize and validate to QuestionDocument
    const now = Date.now();
    const docs: QuestionDocument[] = questions.map((q, idx) => {
      const type = (q.type as QuestionDocument['type']) || 'mcq';
      const doc: QuestionDocument = {
        topicKey: (q.topicKey || topicKey || 'general') as string,
        type,
        text: String(q.text ?? q.question ?? ''),
        options: Array.isArray(q.options) ? q.options.map(String) : undefined,
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : typeof q.correct === 'number' ? q.correct : undefined,
        mediaUrl: q.mediaUrl ? String(q.mediaUrl) : undefined,
        explanation: q.explanation ? String(q.explanation) : undefined,
        difficulty: q.difficulty === 'easy' || q.difficulty === 'medium' || q.difficulty === 'hard' ? q.difficulty : undefined,
        isActive: q.isActive === false ? false : true,
        createdAt: now + idx,
      };
      return doc;
    });

    // Basic MCQ validation when type is mcq
    for (const d of docs) {
      if (!d.text || !d.topicKey) {
        return NextResponse.json({ error: 'Each question requires text and topicKey' }, { status: 400 });
      }
      if (d.type === 'mcq') {
        if (!d.options || d.options.length < 2) {
          return NextResponse.json({ error: 'MCQ requires options (>=2)' }, { status: 400 });
        }
        if (typeof d.correctIndex !== 'number' || d.correctIndex < 0 || d.correctIndex >= d.options.length) {
          return NextResponse.json({ error: 'MCQ requires valid correctIndex' }, { status: 400 });
        }
      }
    }

    const collection = await getQuestionsCollection();
    const result = await collection.insertMany(docs);

    return NextResponse.json({ success: true, insertedCount: result.insertedCount });
  } catch (_error) {
    return NextResponse.json({ success: false, error: 'Failed to insert questions' }, { status: 500 });
  }
}


