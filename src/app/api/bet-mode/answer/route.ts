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
            let ownerWallet: ethers.Wallet | null = null;
            try {
              const provider = new ethers.JsonRpcProvider(rpcUrl);
              ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);
              const vaultAddress = getBetModeVaultAddress();
              const vaultContract = new ethers.Contract(vaultAddress, BET_MODE_VAULT_ABI, ownerWallet);
              const tokenContract = new ethers.Contract(qtTokenAddress, [
                'function transfer(address to, uint256 amount) returns (bool)',
                'function balanceOf(address account) view returns (uint256)'
              ], ownerWallet);
              
              console.log(`📊 Loss Distribution: ${game.betAmount} QT total`);
              console.log(`   - Burn: ${lossDistribution.toBurn} QT (50%)`);
              console.log(`   - Revenue: ${lossDistribution.toPlatform} QT (50%) to ${REVENUE_WALLET}`);
              console.log(`📍 Owner wallet: ${ownerWallet.address}`);
              
              // Check ETH balance for gas
              const ethBalance = await provider.getBalance(ownerWallet.address);
              console.log(`⛽ Owner wallet ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
              if (ethBalance < ethers.parseEther('0.001')) {
                console.warn(`⚠️ Low ETH balance! May not have enough for gas fees.`);
              }
              
              // Helper function to wait for transaction with retry
              const waitForTx = async (txPromise: Promise<any>, description: string, maxRetries = 3): Promise<{ tx: any; receipt: any }> => {
                for (let i = 0; i < maxRetries; i++) {
                  try {
                    const tx = await txPromise;
                    console.log(`📤 ${description} tx sent: ${tx.hash}`);
                    const receipt = await tx.wait();
                    if (receipt.status !== 1) {
                      throw new Error(`${description} transaction failed: ${tx.hash}`);
                    }
                    console.log(`✅ ${description} confirmed: ${tx.hash}`);
                    return { tx, receipt };
                  } catch (error: any) {
                    if (i === maxRetries - 1) throw error;
                    console.warn(`⚠️ ${description} attempt ${i + 1} failed, retrying...`, error.message);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
                  }
                }
                throw new Error(`${description} failed after ${maxRetries} attempts`);
              };

              // Step 1: Withdraw 50% for burn from contract to owner wallet
              if (lossDistribution.toBurn > 0) {
                try {
                  const burnAmountWei = ethers.parseEther(lossDistribution.toBurn.toString());
                  console.log(`🔄 [BURN] Withdrawing ${lossDistribution.toBurn} QT from contract...`);
                  
                  const { receipt: burnWithdrawReceipt } = await waitForTx(
                    vaultContract.ownerWithdraw(burnAmountWei),
                    'Burn withdrawal'
                  );
                  
                  // Wait a bit to avoid nonce issues
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Immediately transfer to burn address
                  console.log(`🔥 [BURN] Transferring ${lossDistribution.toBurn} QT to burn address ${BURN_ADDRESS}...`);
                  const { receipt: burnReceipt } = await waitForTx(
                    tokenContract.transfer(BURN_ADDRESS, burnAmountWei),
                    'Burn transfer'
                  );
                  console.log(`✅ [BURN] Complete! Hash: ${burnReceipt.hash || burnReceipt.transactionHash}`);
                  console.log(`🔗 View on BaseScan: https://basescan.org/tx/${burnReceipt.hash || burnReceipt.transactionHash}`);
                } catch (error: any) {
                  console.error(`❌ [BURN] Failed:`, error);
                  console.error(`❌ [BURN] Error stack:`, error.stack);
                  throw error; // Re-throw to be caught by outer catch
                }
              }
              
              // Step 2: Withdraw 50% for revenue from contract to owner wallet, then transfer to revenue wallet
              if (lossDistribution.toPlatform > 0) {
                try {
                  const revenueAmountWei = ethers.parseEther(lossDistribution.toPlatform.toString());
                  console.log(`🔄 [REVENUE] Withdrawing ${lossDistribution.toPlatform} QT from contract...`);
                  console.log(`📍 [REVENUE] Target wallet: ${REVENUE_WALLET}`);
                  
                  const { receipt: revenueWithdrawReceipt } = await waitForTx(
                    vaultContract.ownerWithdraw(revenueAmountWei),
                    'Revenue withdrawal'
                  );
                  
                  // Wait a bit to avoid nonce issues
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Check owner wallet balance before transfer
                  const ownerBalance = await tokenContract.balanceOf(ownerWallet.address);
                  console.log(`💰 [REVENUE] Owner wallet balance: ${ethers.formatEther(ownerBalance)} QT`);
                  
                  if (ownerBalance < revenueAmountWei) {
                    throw new Error(`Insufficient balance in owner wallet. Have: ${ethers.formatEther(ownerBalance)} QT, Need: ${lossDistribution.toPlatform} QT`);
                  }
                  
                  // Immediately transfer to revenue wallet
                  console.log(`💸 [REVENUE] Transferring ${lossDistribution.toPlatform} QT to revenue wallet ${REVENUE_WALLET}...`);
                  console.log(`💸 [REVENUE] Amount in wei: ${revenueAmountWei.toString()}`);
                  
                  const { receipt: revenueReceipt } = await waitForTx(
                    tokenContract.transfer(REVENUE_WALLET, revenueAmountWei),
                    'Revenue transfer'
                  );
                  
                  console.log(`✅ [REVENUE] Transfer confirmed! Hash: ${revenueReceipt.hash || revenueReceipt.transactionHash}`);
                  console.log(`✅ [REVENUE] Successfully sent ${lossDistribution.toPlatform} QT to ${REVENUE_WALLET}`);
                  console.log(`🔗 View on BaseScan: https://basescan.org/tx/${revenueReceipt.hash || revenueReceipt.transactionHash}`);
                  
                  // Verify transfer by checking revenue wallet balance
                  const revenueWalletBalance = await tokenContract.balanceOf(REVENUE_WALLET);
                  console.log(`✅ [REVENUE] Revenue wallet balance after transfer: ${ethers.formatEther(revenueWalletBalance)} QT`);
                } catch (error: any) {
                  console.error(`❌ [REVENUE] Failed:`, error);
                  console.error(`❌ [REVENUE] Error message:`, error.message);
                  console.error(`❌ [REVENUE] Error stack:`, error.stack);
                  throw error; // Re-throw to be caught by outer catch
                }
              }
            } catch (error: any) {
              console.error('❌❌❌ CRITICAL: Failed to distribute loss tokens ❌❌❌');
              console.error('Error message:', error.message || 'Unknown error');
              console.error('Error code:', error.code);
              console.error('Error data:', error.data);
              console.error('Error stack:', error.stack);
              console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
              
              // Try to send error notification (don't throw to avoid breaking the API response)
              try {
                const walletAddress = ownerWallet?.address || 'unknown';
                console.error(`⚠️ Tokens may be stuck in owner wallet: ${walletAddress}`);
                console.error(`⚠️ Please manually transfer:`);
                console.error(`   - ${lossDistribution.toBurn} QT to burn address: ${BURN_ADDRESS}`);
                console.error(`   - ${lossDistribution.toPlatform} QT to revenue wallet: ${REVENUE_WALLET}`);
              } catch (e) {
                // Ignore errors in error handling
              }
            }
          })();
        } else {
          console.warn('⚠️ Contract owner private key or QT token address not configured - skipping token distribution');
        }
      }

      // Sync loss to contract asynchronously (fire and forget)
      // This updates the balance tracking (debitLoss reduces userBalances and totalContractBalance)
      debitLoss(walletAddress, game.betAmount).catch((error) => {
        console.error('❌ Failed to sync loss to contract:', error);
      });

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


