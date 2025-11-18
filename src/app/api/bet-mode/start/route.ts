import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrencyAccountsCollection,
  getBetModeGamesCollection,
  getBetModeQuestionsCollection,
  getWeeklyPoolsCollection,
} from '~/lib/mongodb';
import {
  getBetModeWindowState,
  validateBetAmount,
  getCurrentWeekId,
  shuffleArray,
} from '~/lib/betMode';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { fid, betAmount } = await req.json();

    if (!fid || !betAmount) {
      return NextResponse.json({ error: 'Missing fid or betAmount' }, { status: 400 });
    }

    const numFid = Number(fid);
    const numBetAmount = Number(betAmount);

    if (!Number.isFinite(numFid) || !Number.isFinite(numBetAmount)) {
      return NextResponse.json({ error: 'Invalid fid or betAmount' }, { status: 400 });
    }

    // Check if window is open
    const windowState = getBetModeWindowState();
    if (!windowState.isOpen) {
      return NextResponse.json(
        { error: 'Bet Mode is currently closed. Window opens Wednesday 11 AM UTC.' },
        { status: 400 }
      );
    }

    // Validate bet amount
    const accounts = await getCurrencyAccountsCollection();
    const account = await accounts.findOne({ fid: numFid });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const qtBalance = account.qtBalance || 0;
    const qtLockedBalance = account.qtLockedBalance || 0;
    const availableBalance = qtBalance - qtLockedBalance;

    const validation = validateBetAmount(numBetAmount, availableBalance);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check for active game
    const games = await getBetModeGamesCollection();
    const activeGame = await games.findOne({
      fid: numFid,
      status: 'active',
    });

    if (activeGame) {
      return NextResponse.json({ error: 'You already have an active game' }, { status: 400 });
    }

    // Get questions (shuffled)
    const questionsCollection = await getBetModeQuestionsCollection();
    const allQuestions = await questionsCollection
      .find({ isActive: true })
      .toArray();

    if (allQuestions.length < 10) {
      return NextResponse.json(
        { error: 'Not enough questions available. Please contact admin.' },
        { status: 500 }
      );
    }

    // Shuffle and select 10 questions with progressive difficulty
    // Q1-Q4: Easy/Medium, Q5-Q7: Hard, Q8-Q10: Expert
    const easyMedium = shuffleArray(
      allQuestions.filter((q) => q.difficulty === 'easy' || q.difficulty === 'medium')
    );
    const hard = shuffleArray(allQuestions.filter((q) => q.difficulty === 'hard'));
    const expert = shuffleArray(allQuestions.filter((q) => q.difficulty === 'expert'));

    const selectedQuestions = [
      ...easyMedium.slice(0, 4),
      ...hard.slice(0, 3),
      ...expert.slice(0, 3),
    ].slice(0, 10);

    if (selectedQuestions.length < 10) {
      return NextResponse.json(
        { error: 'Not enough questions of required difficulty. Please contact admin.' },
        { status: 500 }
      );
    }

    // Create game
    const weekId = getCurrentWeekId();
    const gameId = `bet_${numFid}_${Date.now()}`;
    const now = Date.now();

    const gameQuestions = selectedQuestions.map((q) => ({
      questionId: q.id || q._id.toString(),
      questionText: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
    }));

    await games.insertOne({
      gameId,
      fid: numFid,
      betAmount: numBetAmount,
      status: 'active',
      currentQuestion: 1,
      questions: gameQuestions,
      startedAt: now,
      weekId,
    });

    // Lock balance
    await accounts.updateOne(
      { fid: numFid },
      {
        $inc: {
          qtBalance: -numBetAmount,
          qtLockedBalance: numBetAmount,
          qtTotalWagered: numBetAmount,
        },
        $set: { updatedAt: now },
      }
    );

    // Ensure weekly pool exists
    const pools = await getWeeklyPoolsCollection();
    await pools.updateOne(
      { weekId },
      {
        $setOnInsert: {
          weekId,
          startDate: windowState.windowStart.getTime(),
          endDate: windowState.windowEnd.getTime(),
          totalLosses: 0,
          toBurnAccumulated: 0,
          lotteryPool: 0,
          platformRevenue: 0,
          snapshotTaken: false,
          drawCompleted: false,
          burnCompleted: false,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    // Return first question
    const firstQuestion = selectedQuestions[0];
    return NextResponse.json({
      success: true,
      gameId,
      betAmount: numBetAmount,
      question: {
        questionNumber: 1,
        questionId: firstQuestion.id || firstQuestion._id.toString(),
        text: firstQuestion.text,
        options: firstQuestion.options,
        timeLimit: 30,
      },
    });
  } catch (error: any) {
    console.error('Bet Mode start error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start game' }, { status: 500 });
  }
}

