import { NextRequest, NextResponse } from 'next/server';
import {
  getBetModeGamesCollection,
  getCurrencyAccountsCollection,
  getWeeklyPoolsCollection,
  getLotteryTicketsCollection,
  getQTTransactionsCollection,
} from '~/lib/mongodb';
import {
  calculatePayout,
  calculateLossDistribution,
  calculateBaseTickets,
  getStreakMultiplier,
  calculateConsecutiveDays,
  getTodayDateString,
} from '~/lib/betMode';
import { syncBalanceUpdate } from '~/lib/syncContractBalance';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { gameId, fid, answerIndex } = await req.json();

    if (!gameId || !fid || answerIndex === undefined) {
      return NextResponse.json({ error: 'Missing gameId, fid, or answerIndex' }, { status: 400 });
    }

    const numFid = Number(fid);
    const numAnswerIndex = Number(answerIndex);

    if (!Number.isFinite(numFid) || !Number.isFinite(numAnswerIndex)) {
      return NextResponse.json({ error: 'Invalid fid or answerIndex' }, { status: 400 });
    }

    const games = await getBetModeGamesCollection();
    const game = await games.findOne({ gameId, fid: numFid, status: 'active' });

    if (!game) {
      return NextResponse.json({ error: 'Game not found or not active' }, { status: 404 });
    }

    const currentQ = game.currentQuestion;
    const question = game.questions[currentQ - 1];

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 400 });
    }

    if (question.userAnswer !== undefined) {
      return NextResponse.json({ error: 'Question already answered' }, { status: 400 });
    }

    const isCorrect = numAnswerIndex === question.correctIndex;
    const now = Date.now();

    // Update question with answer
    question.userAnswer = numAnswerIndex;
    question.isCorrect = isCorrect;
    question.answeredAt = now;

    // If wrong answer, handle loss
    if (!isCorrect) {
      const lossDistribution = calculateLossDistribution(game.betAmount);

      // Update weekly pool
      const pools = await getWeeklyPoolsCollection();
      await pools.updateOne(
        { weekId: game.weekId },
        {
          $inc: {
            totalLosses: game.betAmount,
            toBurnAccumulated: lossDistribution.toBurn,
            lotteryPool: lossDistribution.toLottery,
            platformRevenue: lossDistribution.toPlatform,
          },
          $set: { updatedAt: now },
        }
      );

      // Release locked balance (it's gone)
      const accounts = await getCurrencyAccountsCollection();
      await accounts.updateOne(
        { fid: numFid },
        {
          $inc: { qtLockedBalance: -game.betAmount },
          $set: { updatedAt: now },
        }
      );

      // Sync balance debit to contract (loss)
      // Don't await - let it run async to not block the response
      syncBalanceUpdate(numFid, game.betAmount, 'DEBIT').catch((error) => {
        console.error('Failed to sync DEBIT balance update:', error);
      });

      // Award lottery tickets (consolation)
      await awardLotteryTickets(numFid, game.betAmount, 1, game.weekId);

      // Log transaction
      const transactions = await getQTTransactionsCollection();
      await transactions.insertOne({
        fid: numFid,
        type: 'game_loss',
        amount: -game.betAmount,
        gameId,
        weekId: game.weekId,
        status: 'completed',
        createdAt: now,
      });

      // Update game status
      await games.updateOne(
        { gameId },
        {
          $set: {
            status: 'lost',
            currentQuestion: currentQ,
            questions: game.questions,
            completedAt: now,
            lossDistribution,
          },
        }
      );

      return NextResponse.json({
        success: true,
        result: 'lost',
        correctAnswer: question.correctIndex,
        explanation: question.explanation || 'Better luck next time!',
        lossDistribution,
        ticketsEarned: calculateBaseTickets(game.betAmount, 1).totalTickets,
      });
    }

    // Correct answer - check if it's Q10 (auto cash out)
    if (currentQ === 10) {
      // Auto cash out at Q10
      const payout = calculatePayout(game.betAmount, 10);

      const accounts = await getCurrencyAccountsCollection();
      await accounts.updateOne(
        { fid: numFid },
        {
          $inc: {
            qtBalance: payout,
            qtLockedBalance: -game.betAmount,
            qtTotalWon: payout,
          },
          $set: { updatedAt: now },
        }
      );

      // Sync balance credit to contract (win)
      // Credit the net winnings (payout - betAmount) since betAmount was already deducted
      const netWinnings = payout - game.betAmount;
      if (netWinnings > 0) {
        // Don't await - let it run async to not block the response
        syncBalanceUpdate(numFid, netWinnings, 'CREDIT').catch((error) => {
          console.error('Failed to sync CREDIT balance update:', error);
        });
      }

      // Award lottery tickets
      await awardLotteryTickets(numFid, game.betAmount, 1, game.weekId);

      // Log transaction
      const transactions = await getQTTransactionsCollection();
      await transactions.insertOne({
        fid: numFid,
        type: 'game_win',
        amount: payout,
        gameId,
        weekId: game.weekId,
        status: 'completed',
        createdAt: now,
      });

      // Update game status
      await games.updateOne(
        { gameId },
        {
          $set: {
            status: 'won',
            currentQuestion: 10,
            questions: game.questions,
            completedAt: now,
            finalPayout: payout,
          },
        }
      );

      return NextResponse.json({
        success: true,
        result: 'won',
        questionNumber: 10,
        payout,
        profit: payout - game.betAmount,
        ticketsEarned: calculateBaseTickets(game.betAmount, 1).totalTickets,
        nextQuestion: null, // Game complete
      });
    }

    // Correct answer, continue to next question
    await games.updateOne(
      { gameId },
      {
        $set: {
          currentQuestion: currentQ + 1,
          questions: game.questions,
        },
      }
    );

    const nextQuestion = game.questions[currentQ];
    const currentPayout = calculatePayout(game.betAmount, currentQ);
    const nextPayout = calculatePayout(game.betAmount, currentQ + 1);
    const canCashOut = currentQ >= 5; // Can cash out from Q5+

    return NextResponse.json({
      success: true,
      result: 'correct',
      questionNumber: currentQ,
      correctAnswer: question.correctIndex,
      currentPayout,
      nextPayout,
      canCashOut,
      nextQuestion: nextQuestion
        ? {
            questionNumber: currentQ + 1,
            questionId: nextQuestion.questionId,
            text: nextQuestion.questionText,
            options: nextQuestion.options,
            timeLimit: 30,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Bet Mode answer error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process answer' }, { status: 500 });
  }
}

/**
 * Award lottery tickets to a user
 */
async function awardLotteryTickets(
  fid: number,
  betAmount: number,
  gamesPlayed: number,
  weekId: string
) {
  const tickets = await getLotteryTicketsCollection();
  const now = Date.now();
  const today = getTodayDateString();

  const ticketDoc = await tickets.findOne({ weekId, fid });

  if (!ticketDoc) {
    // First game this week
    const baseTickets = calculateBaseTickets(betAmount, gamesPlayed);
    const multiplier = getStreakMultiplier(1);
    const bonusTickets = baseTickets.totalTickets * (multiplier - 1);
    const totalTickets = baseTickets.totalTickets * multiplier;

    await tickets.insertOne({
      weekId,
      fid,
      betBasedTickets: baseTickets.betBasedTickets,
      gameBasedTickets: baseTickets.gameBasedTickets,
      bonusTickets,
      totalTickets,
      gamesPlayed: 1,
      totalWagered: betAmount,
      consecutiveDays: 1,
      daysPlayed: [today],
      streakMultiplier: multiplier,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // Add to existing
    const current = ticketDoc;
    const daysPlayed = [...(current.daysPlayed || [])];
    if (!daysPlayed.includes(today)) {
      daysPlayed.push(today);
    }

    const consecutiveDays = calculateConsecutiveDays(daysPlayed);
    const multiplier = getStreakMultiplier(consecutiveDays);

    const newBetBased = current.betBasedTickets + Math.floor(betAmount / 10000);
    const newGameBased = current.gameBasedTickets + gamesPlayed * 0.5;
    const baseTotal = newBetBased + newGameBased;
    const bonusTickets = baseTotal * (multiplier - 1);
    const finalTotal = baseTotal * multiplier;

    await tickets.updateOne(
      { weekId, fid },
      {
        $set: {
          betBasedTickets: newBetBased,
          gameBasedTickets: newGameBased,
          bonusTickets,
          totalTickets: finalTotal,
          gamesPlayed: current.gamesPlayed + gamesPlayed,
          totalWagered: current.totalWagered + betAmount,
          consecutiveDays,
          daysPlayed,
          streakMultiplier: multiplier,
          updatedAt: now,
        },
      }
    );
  }
}

