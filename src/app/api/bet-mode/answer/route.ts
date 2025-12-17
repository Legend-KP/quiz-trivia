import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  getBetModeGamesCollection,
  getCurrencyAccountsCollection,
  getWeeklyPoolsCollection,
  getQTTransactionsCollection,
} from '~/lib/mongodb';
import {
  calculatePayout,
  calculateLossDistribution,
} from '~/lib/betMode';
import { debitLoss, creditWinnings } from '~/lib/betModeContract';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { gameId, fid, answerIndex, walletAddress } = await req.json();

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
      const REVENUE_WALLET = '0x4215C58fc9C67003447C10b4A728cdBf8606570b';
      const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';

      // Update weekly pool (tracking only)
      const pools = await getWeeklyPoolsCollection();
      await pools.updateOne(
        { weekId: game.weekId },
        {
          $inc: {
            totalLosses: game.betAmount,
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

      // Sync loss to contract (async - don't block response)
      debitLoss(walletAddress, game.betAmount).catch((error) => {
        console.error('❌ Failed to sync loss to contract:', error);
      });

      // Immediate burn: Send 50% to burn address
      if (lossDistribution.toBurn > 0) {
        const privateKey = process.env.WALLET_PRIVATE_KEY || process.env.PRIVATE_KEY;
        const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
        const qtTokenAddress = process.env.QT_TOKEN_ADDRESS;

        if (privateKey && qtTokenAddress) {
          try {
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const wallet = new ethers.Wallet(privateKey, provider);
            const tokenAbi = ['function transfer(address to, uint256 amount) returns (bool)'];
            const tokenContract = new ethers.Contract(qtTokenAddress, tokenAbi, wallet);
            const burnAmountWei = ethers.parseUnits(lossDistribution.toBurn.toString(), 18);
            
            const burnTx = await tokenContract.transfer(BURN_ADDRESS, burnAmountWei);
            console.log(`🔥 Burn transaction sent: ${burnTx.hash}`);
            // Don't wait for confirmation to avoid blocking response
            burnTx.wait().catch((error: any) => {
              console.error('❌ Burn transaction failed:', error);
            });
          } catch (error: any) {
            console.error('❌ Failed to burn tokens:', error);
          }
        }
      }

      // Immediate revenue transfer: Send 50% to revenue wallet
      if (lossDistribution.toPlatform > 0) {
        const privateKey = process.env.WALLET_PRIVATE_KEY || process.env.PRIVATE_KEY;
        const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
        const qtTokenAddress = process.env.QT_TOKEN_ADDRESS;

        if (privateKey && qtTokenAddress) {
          try {
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const wallet = new ethers.Wallet(privateKey, provider);
            const tokenAbi = ['function transfer(address to, uint256 amount) returns (bool)'];
            const tokenContract = new ethers.Contract(qtTokenAddress, tokenAbi, wallet);
            const revenueAmountWei = ethers.parseUnits(lossDistribution.toPlatform.toString(), 18);
            
            const revenueTx = await tokenContract.transfer(REVENUE_WALLET, revenueAmountWei);
            console.log(`💰 Revenue transaction sent: ${revenueTx.hash}`);
            // Don't wait for confirmation to avoid blocking response
            revenueTx.wait().catch((error: any) => {
              console.error('❌ Revenue transaction failed:', error);
            });
          } catch (error: any) {
            console.error('❌ Failed to transfer revenue:', error);
          }
        }
      }

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
      });
    }

    // Correct answer - check if it's Q10 (auto cash out)
    if (currentQ === 10) {
      // Auto cash out at Q10
      const payout = calculatePayout(game.betAmount, 10);
      const profit = payout - game.betAmount; // Profit = payout - betAmount

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

      // Sync winnings to contract (async - don't block response)
      // Only credit the profit, not the full payout (betAmount was already deducted)
      creditWinnings(walletAddress, profit).catch((error) => {
        console.error('❌ Failed to sync winnings to contract:', error);
      });


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


