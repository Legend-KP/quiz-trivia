import { NextRequest, NextResponse } from 'next/server';
import { getBetModeQuestionsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

/**
 * Debug endpoint to check question distribution
 * No authentication required for debugging
 */
export async function GET(_req: NextRequest) {
  try {
    const questionsCollection = await getBetModeQuestionsCollection();
    const allQuestions = await questionsCollection.find({ isActive: true }).toArray();

    const easy = allQuestions.filter((q) => q.difficulty === 'easy');
    const medium = allQuestions.filter((q) => q.difficulty === 'medium');
    const hard = allQuestions.filter((q) => q.difficulty === 'hard');
    const expert = allQuestions.filter((q) => q.difficulty === 'expert');
    const easyMedium = allQuestions.filter((q) => q.difficulty === 'easy' || q.difficulty === 'medium');

    // Check if we meet the requirements
    const needsEasyMedium = 4;
    const needsHard = 3;
    const needsExpert = 3;
    const needsTotal = 10;

    const hasEnoughEasyMedium = easyMedium.length >= needsEasyMedium;
    const hasEnoughHard = hard.length >= needsHard;
    const hasEnoughExpert = expert.length >= needsExpert;
    const hasEnoughTotal = allQuestions.length >= needsTotal;

    return NextResponse.json({
      success: true,
      summary: {
        total: allQuestions.length,
        easy: easy.length,
        medium: medium.length,
        hard: hard.length,
        expert: expert.length,
        easyMedium: easyMedium.length,
      },
      requirements: {
        needsEasyMedium,
        needsHard,
        needsExpert,
        needsTotal,
      },
      status: {
        hasEnoughTotal,
        hasEnoughEasyMedium,
        hasEnoughHard,
        hasEnoughExpert,
        canStartGame: hasEnoughTotal && hasEnoughEasyMedium && hasEnoughHard && hasEnoughExpert,
      },
      questions: allQuestions.map((q) => ({
        id: q.id,
        difficulty: q.difficulty,
        text: q.text.substring(0, 50) + '...',
        isActive: q.isActive,
      })),
    });
  } catch (error: any) {
    console.error('Question check error:', error);
    return NextResponse.json({ error: error.message || 'Failed to check questions' }, { status: 500 });
  }
}

