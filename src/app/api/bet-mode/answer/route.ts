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
              
              console.log(`📊 Loss Distribution: ${game.betAmount} QT total`);
              console.log(`   - Burn: ${lossDistribution.toBurn} QT (50%)`);
              console.log(`   - Revenue: ${lossDistribution.toPlatform} QT (50%) to ${REVENUE_WALLET}`);
              
              // Check owner wallet ETH balance for gas
              const ownerEthBalance = await provider.getBalance(ownerWallet.address);
              console.log(`⛽ Owner wallet ETH balance: ${ethers.formatEther(ownerEthBalance)} ETH`);
              if (ownerEthBalance < ethers.parseEther('0.001')) {
                throw new Error('Insufficient ETH in owner wallet for gas fees. Need at least 0.001 ETH.');
              }
              
              // Step 1: Withdraw 50% for burn from contract to owner wallet
              if (lossDistribution.toBurn > 0) {
                const burnAmountWei = ethers.parseEther(lossDistribution.toBurn.toString());
                console.log(`🔄 Withdrawing ${lossDistribution.toBurn} QT from contract for burn...`);
                
                // Estimate gas for burn withdrawal
                try {
                  const gasEstimate = await vaultContract.ownerWithdraw.estimateGas(burnAmountWei);
                  console.log(`⛽ Estimated gas for burn withdrawal: ${gasEstimate.toString()}`);
                } catch (gasError: any) {
                  console.warn(`⚠️ Gas estimation failed for burn withdrawal:`, gasError.message);
                }
                
                const burnWithdrawTx = await vaultContract.ownerWithdraw(burnAmountWei);
                const burnWithdrawReceipt = await burnWithdrawTx.wait();
                if (burnWithdrawReceipt.status !== 1) {
                  throw new Error(`Burn withdrawal transaction failed: ${burnWithdrawTx.hash}`);
                }
                console.log(`✅ Burn withdrawal confirmed: ${burnWithdrawTx.hash}`);
                
                // Immediately transfer to burn address
                console.log(`🔥 Transferring ${lossDistribution.toBurn} QT to burn address...`);
                
                // Estimate gas for burn transfer
                try {
                  const gasEstimate = await tokenContract.transfer.estimateGas(BURN_ADDRESS, burnAmountWei);
                  console.log(`⛽ Estimated gas for burn transfer: ${gasEstimate.toString()}`);
                } catch (gasError: any) {
                  console.warn(`⚠️ Gas estimation failed for burn transfer:`, gasError.message);
                  // If gas estimation fails, it might be due to insufficient balance or other issues
                  // Check owner wallet token balance
                  const ownerTokenBalance = await tokenContract.balanceOf(ownerWallet.address);
                  if (ownerTokenBalance < burnAmountWei) {
                    throw new Error(`Insufficient tokens in owner wallet for burn. Have: ${ethers.formatEther(ownerTokenBalance)} QT, Need: ${lossDistribution.toBurn} QT`);
                  }
                }
                
                const burnTx = await tokenContract.transfer(BURN_ADDRESS, burnAmountWei);
                burnTxHash = burnTx.hash;
                console.log(`📤 Burn transfer tx sent: ${burnTxHash}`);
                const burnReceipt = await burnTx.wait();
                if (burnReceipt.status !== 1) {
                  throw new Error(`Burn transaction failed: ${burnTxHash}`);
                }
                burnBlockNumber = burnReceipt.blockNumber;
                console.log(`✅ Burn transaction confirmed: ${burnTxHash}`);
                console.log(`🔗 View on BaseScan: https://basescan.org/tx/${burnTxHash}`);
                
                // FIX: Create burn record after successful burn
                try {
                  const burnRecords = await getBurnRecordsCollection();
                  await burnRecords.insertOne({
                    weekId: game.weekId,
                    amount: lossDistribution.toBurn,
                    txHash: burnTxHash,
                    blockNumber: burnBlockNumber,
                    timestamp: Date.now(),
                  });
                  console.log(`✅ Burn record created in database`);
                } catch (dbError: any) {
                  console.error('❌ Failed to create burn record:', dbError);
                  // Don't throw - burn succeeded, record creation is secondary
                }
              }
              
              // Step 2: Withdraw 50% for revenue from contract to owner wallet, then transfer to revenue wallet
              if (lossDistribution.toPlatform > 0) {
                const revenueAmountWei = ethers.parseEther(lossDistribution.toPlatform.toString());
                console.log(`🔄 [REVENUE] Withdrawing ${lossDistribution.toPlatform} QT from contract to owner wallet...`);
                console.log(`📍 [REVENUE] Target revenue wallet: ${REVENUE_WALLET}`);
                
                // Step 2a: Withdraw from contract to owner wallet
                // Estimate gas for revenue withdrawal
                try {
                  const gasEstimate = await vaultContract.ownerWithdraw.estimateGas(revenueAmountWei);
                  console.log(`⛽ Estimated gas for revenue withdrawal: ${gasEstimate.toString()}`);
                } catch (gasError: any) {
                  console.warn(`⚠️ Gas estimation failed for revenue withdrawal:`, gasError.message);
                }
                
                const revenueWithdrawTx = await vaultContract.ownerWithdraw(revenueAmountWei);
                console.log(`📤 [REVENUE] Withdrawal tx sent: ${revenueWithdrawTx.hash}`);
                const revenueWithdrawReceipt = await revenueWithdrawTx.wait();
                if (revenueWithdrawReceipt.status !== 1) {
                  throw new Error(`Revenue withdrawal transaction failed: ${revenueWithdrawTx.hash}`);
                }
                console.log(`✅ [REVENUE] Withdrawal confirmed: ${revenueWithdrawTx.hash}`);
                
                // Step 2b: Verify owner wallet received the tokens
                const ownerBalance = await tokenContract.balanceOf(ownerWallet.address);
                console.log(`💰 [REVENUE] Owner wallet balance after withdrawal: ${ethers.formatEther(ownerBalance)} QT`);
                if (ownerBalance < revenueAmountWei) {
                  throw new Error(`Owner wallet did not receive expected tokens. Have: ${ethers.formatEther(ownerBalance)} QT, Expected: ${lossDistribution.toPlatform} QT`);
                }
                
                // Step 2c: Immediately transfer from owner wallet to revenue wallet
                console.log(`💸 [REVENUE] Transferring ${lossDistribution.toPlatform} QT from owner wallet to revenue wallet ${REVENUE_WALLET}...`);
                console.log(`💸 [REVENUE] Amount: ${revenueAmountWei.toString()} wei`);
                
                // Estimate gas for revenue transfer
                try {
                  const gasEstimate = await tokenContract.transfer.estimateGas(REVENUE_WALLET, revenueAmountWei);
                  console.log(`⛽ Estimated gas for revenue transfer: ${gasEstimate.toString()}`);
                } catch (gasError: any) {
                  console.error(`⚠️ Gas estimation failed for revenue transfer:`, gasError.message);
                  throw new Error(`Cannot estimate gas for revenue transfer: ${gasError.message}`);
                }
                
                const revenueTx = await tokenContract.transfer(REVENUE_WALLET, revenueAmountWei);
                revenueTxHash = revenueTx.hash;
                console.log(`📤 [REVENUE] Transfer tx sent: ${revenueTxHash}`);
                const revenueReceipt = await revenueTx.wait();
                if (revenueReceipt.status !== 1) {
                  throw new Error(`Revenue transfer transaction failed: ${revenueTxHash}`);
                }
                console.log(`✅ [REVENUE] Transfer confirmed: ${revenueTxHash}`);
                console.log(`✅ [REVENUE] Successfully sent ${lossDistribution.toPlatform} QT to ${REVENUE_WALLET}`);
                console.log(`🔗 [REVENUE] View on BaseScan: https://basescan.org/tx/${revenueTxHash}`);
                
                // Step 2d: Verify transfer by checking revenue wallet balance
                const revenueWalletBalance = await tokenContract.balanceOf(REVENUE_WALLET);
                const expectedBalance = ethers.formatEther(revenueWalletBalance);
                console.log(`✅ [REVENUE] Revenue wallet (${REVENUE_WALLET}) balance: ${expectedBalance} QT`);
                
                // Verify the amount was actually received
                const ownerBalanceAfter = await tokenContract.balanceOf(ownerWallet.address);
                console.log(`💰 [REVENUE] Owner wallet balance after transfer: ${ethers.formatEther(ownerBalanceAfter)} QT`);
              }
              
              // FIX: Only call debitLoss() AFTER both distributions succeed
              console.log('✅ All token distributions completed successfully');
              console.log('🔄 Updating contract balance tracking...');
              await debitLoss(walletAddress, game.betAmount);
              console.log('✅ Contract balance updated successfully');
              
            } catch (error: any) {
              console.error('❌ Failed to distribute loss tokens:', error);
              console.error('Error details:', error.message || error);
              console.error('Game ID:', gameId);
              console.error('FID:', numFid);
              console.error('Bet Amount:', game.betAmount);
              console.error('Loss Distribution:', lossDistribution);
              
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
                console.log('✅ Failed distribution logged to database for manual processing');
              } catch (dbError: any) {
                console.error('❌ Failed to log failed distribution to database:', dbError);
              }
              
              // Alert: Consider sending notification to admins
              // For now, just log the error
            }
          })();
        } else {
          console.warn('⚠️ Contract owner private key or QT token address not configured - skipping token distribution');
          
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
            console.error('❌ Failed to log failed distribution:', dbError);
          }
        }
      } else {
        // No distribution needed, but still update contract balance
        debitLoss(walletAddress, game.betAmount).catch((error) => {
          console.error('❌ Failed to sync loss to contract:', error);
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


