import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  getBetModeGamesCollection,
  getCurrencyAccountsCollection,
  getWeeklyPoolsCollection,
  getQTTransactionsCollection,
  getBurnRecordsCollection,
  getDb,
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
      // Ensure proper checksummed address
      const REVENUE_WALLET = ethers.getAddress('0xa0722635A73361f0071EFa69b69C9773669Cb0CB');
      const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';

      // Update weekly pool (tracking only)
      const pools = await getWeeklyPoolsCollection();
      await pools.updateOne(
        { weekId: game.weekId },
        {
          $inc: {
            totalLosses: game.betAmount,
            platformRevenue: lossDistribution.toPlatform,
            toBurnAccumulated: lossDistribution.toBurn, // FIX: Add missing toBurnAccumulated
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

      // Immediate burn and revenue transfer: Run asynchronously in background
      // This allows the API to return quickly while token distribution happens in background
      if (lossDistribution.toBurn > 0 || lossDistribution.toPlatform > 0) {
        const ownerPrivateKey = process.env.CONTRACT_OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
        const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
        const qtTokenAddress = process.env.QT_TOKEN_ADDRESS;
        const { getBetModeVaultAddress, BET_MODE_VAULT_ABI } = await import('~/lib/betModeVault');

        if (ownerPrivateKey && qtTokenAddress) {
          // Run token distribution asynchronously - don't await
          (async () => {
            let burnTxHash: string | null = null;
            let revenueTxHash: string | null = null;
            let burnBlockNumber: number | null = null;
            
            try {
              const provider = new ethers.JsonRpcProvider(rpcUrl);
              const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);
              const vaultAddress = getBetModeVaultAddress();
              const vaultContract = new ethers.Contract(vaultAddress, BET_MODE_VAULT_ABI, ownerWallet);
              const tokenContract = new ethers.Contract(qtTokenAddress, [
                'function transfer(address to, uint256 amount) returns (bool)',
                'function balanceOf(address account) view returns (uint256)',
                'function estimateGas(address to, uint256 amount) view returns (uint256)',
              ], ownerWallet);
              
              
              // Check owner wallet ETH balance for gas
              const ownerEthBalance = await provider.getBalance(ownerWallet.address);
              if (ownerEthBalance < ethers.parseEther('0.001')) {
                throw new Error('Insufficient ETH in owner wallet for gas fees. Need at least 0.001 ETH.');
              }
              
              // Step 1: Withdraw 50% for burn from contract to owner wallet
              if (lossDistribution.toBurn > 0) {
                const burnAmountWei = ethers.parseEther(lossDistribution.toBurn.toString());
                
                // Estimate gas for burn withdrawal
                try {
                  const gasEstimate = await vaultContract.ownerWithdraw.estimateGas(burnAmountWei);
                } catch (gasError: any) {
                }
                
                const burnWithdrawTx = await vaultContract.ownerWithdraw(burnAmountWei);
                const burnWithdrawReceipt = await burnWithdrawTx.wait();
                if (burnWithdrawReceipt.status !== 1) {
                  throw new Error(`Burn withdrawal transaction failed: ${burnWithdrawTx.hash}`);
                }
                
                // Immediately transfer to burn address
                
                // Estimate gas for burn transfer
                try {
                  const gasEstimate = await tokenContract.transfer.estimateGas(BURN_ADDRESS, burnAmountWei);
                } catch (gasError: any) {
                  // If gas estimation fails, it might be due to insufficient balance or other issues
                  // Check owner wallet token balance
                  const ownerTokenBalance = await tokenContract.balanceOf(ownerWallet.address);
                  if (ownerTokenBalance < burnAmountWei) {
                    throw new Error(`Insufficient tokens in owner wallet for burn. Have: ${ethers.formatEther(ownerTokenBalance)} QT, Need: ${lossDistribution.toBurn} QT`);
                  }
                }
                
                const burnTx = await tokenContract.transfer(BURN_ADDRESS, burnAmountWei);
                burnTxHash = burnTx.hash;
                const burnReceipt = await burnTx.wait();
                if (burnReceipt.status !== 1) {
                  throw new Error(`Burn transaction failed: ${burnTxHash}`);
                }
                burnBlockNumber = burnReceipt.blockNumber;
                
                // FIX: Create burn record after successful burn
                if (burnTxHash && burnBlockNumber !== null) {
                  try {
                    const burnRecords = await getBurnRecordsCollection();
                    await burnRecords.insertOne({
                      weekId: game.weekId,
                      amount: lossDistribution.toBurn,
                      txHash: burnTxHash,
                      blockNumber: burnBlockNumber,
                      timestamp: Date.now(),
                    });
                  } catch (dbError: any) {
                    // Don't throw - burn succeeded, record creation is secondary
                  }
                }
              }
              
              // Step 2: Withdraw 50% for revenue from contract to owner wallet, then transfer to revenue wallet
              if (lossDistribution.toPlatform > 0) {
                const revenueAmountWei = ethers.parseEther(lossDistribution.toPlatform.toString());
                
                // Step 2a: Withdraw from contract to owner wallet
                // Estimate gas for revenue withdrawal
                try {
                  const gasEstimate = await vaultContract.ownerWithdraw.estimateGas(revenueAmountWei);
                } catch (gasError: any) {
                }
                
                const revenueWithdrawTx = await vaultContract.ownerWithdraw(revenueAmountWei);
                const revenueWithdrawReceipt = await revenueWithdrawTx.wait();
                if (revenueWithdrawReceipt.status !== 1) {
                  throw new Error(`Revenue withdrawal transaction failed: ${revenueWithdrawTx.hash}`);
                }
                
                // Step 2b: Verify owner wallet received the tokens
                const ownerBalance = await tokenContract.balanceOf(ownerWallet.address);
                if (ownerBalance < revenueAmountWei) {
                  throw new Error(`Owner wallet did not receive expected tokens. Have: ${ethers.formatEther(ownerBalance)} QT, Expected: ${lossDistribution.toPlatform} QT`);
                }
                
                // Step 2c: Immediately transfer from owner wallet to revenue wallet
                
                // Estimate gas for revenue transfer
                try {
                  const gasEstimate = await tokenContract.transfer.estimateGas(REVENUE_WALLET, revenueAmountWei);
                } catch (gasError: any) {
                  throw new Error(`Cannot estimate gas for revenue transfer: ${gasError.message}`);
                }
                
                const revenueTx = await tokenContract.transfer(REVENUE_WALLET, revenueAmountWei);
                revenueTxHash = revenueTx.hash;
                const revenueReceipt = await revenueTx.wait();
                if (revenueReceipt.status !== 1) {
                  throw new Error(`Revenue transfer transaction failed: ${revenueTxHash}`);
                }
                
                // Step 2d: Verify transfer by checking revenue wallet balance
                const revenueWalletBalance = await tokenContract.balanceOf(REVENUE_WALLET);
                const expectedBalance = ethers.formatEther(revenueWalletBalance);
                
                // Verify the amount was actually received
                const ownerBalanceAfter = await tokenContract.balanceOf(ownerWallet.address);
              }
              
              // FIX: Only call debitLoss() AFTER both distributions succeed
              await debitLoss(walletAddress, game.betAmount);
              
            } catch (error: any) {
              
              // FIX: Store failed distribution in database for manual processing
              try {
                const db = await getDb();
                await db.collection('failed_distributions').insertOne({
                  gameId,
                  fid: numFid,
                  betAmount: game.betAmount,
                  lossDistribution,
                  weekId: game.weekId,
                  walletAddress,
                  error: error.message || String(error),
                  burnTxHash: burnTxHash || null,
                  revenueTxHash: revenueTxHash || null,
                  burnBlockNumber: burnBlockNumber || null,
                  status: 'pending_retry',
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
              } catch (dbError: any) {
              }
              
              // Alert: Consider sending notification to admins
              // For now, just log the error
            }
          })();
        } else {
          
          // Store failed distribution due to missing config
          try {
            const db = await getDb();
            await db.collection('failed_distributions').insertOne({
              gameId,
              fid: numFid,
              betAmount: game.betAmount,
              lossDistribution,
              weekId: game.weekId,
              walletAddress,
              error: 'Missing CONTRACT_OWNER_PRIVATE_KEY or QT_TOKEN_ADDRESS environment variable',
              status: 'pending_retry',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          } catch (dbError: any) {
          }
        }
      } else {
        // No distribution needed, but still update contract balance
        debitLoss(walletAddress, game.betAmount).catch((error) => {
        });
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
    return NextResponse.json({ error: error.message || 'Failed to process answer' }, { status: 500 });
  }
}


