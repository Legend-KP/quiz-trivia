import { NextRequest, NextResponse } from 'next/server';
import { getBetModeGamesCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId');
    const fidParam = searchParams.get('fid');

    if (!gameId || !fidParam) {
      return NextResponse.json({ error: 'Missing gameId or fid' }, { status: 400 });
    }

    const fid = Number(fidParam);
    if (!Number.isFinite(fid)) {
      return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
    }

    const games = await getBetModeGamesCollection();
    const game = await games.findOne({ gameId, fid, status: 'active' });

    if (!game) {
      return NextResponse.json({ error: 'Game not found or not active' }, { status: 404 });
    }

    // Get current question from questions array
    const currentQuestionNum = game.currentQuestion || 1;
    const questions = game.questions || [];
    const currentQuestionData = questions[currentQuestionNum - 1]; // questions array is 0-indexed

    if (!currentQuestionData) {
      return NextResponse.json({ error: 'Current question not found' }, { status: 404 });
    }

    return NextResponse.json({
      game: {
        gameId: game.gameId,
        betAmount: game.betAmount,
        currentQuestion: game.currentQuestion,
        startedAt: game.startedAt,
      },
      question: {
        questionNumber: currentQuestionNum,
        questionId: currentQuestionData.questionId,
        text: currentQuestionData.questionText,
        options: currentQuestionData.options,
        timeLimit: 30,
      },
    });
  } catch (error: any) {
    console.error('Bet Mode game fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch game' }, { status: 500 });
  }
}

