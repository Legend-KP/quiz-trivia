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
      // Ensure checksummed address for revenue wallet
      const REVENUE_WALLET_RAW = '0xa0722635A73361f0071EFa69b69C9773669Cb0CB';
      const REVENUE_WALLET = ethers.getAddress(REVENUE_WALLET_RAW);
      const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';
      
      // Log the revenue wallet address for verification
      console.log(`🎯 Revenue wallet (raw): ${REVENUE_WALLET_RAW}`);
      console.log(`🎯 Revenue wallet (checksummed): ${REVENUE_WALLET}`);
      console.log(`🎯 Expected revenue: ${lossDistribution.toPlatform} QT (50% of ${game.betAmount} QT)`);
      
      // Verify addresses match (case-insensitive)
      if (REVENUE_WALLET.toLowerCase() !== REVENUE_WALLET_RAW.toLowerCase()) {
        console.warn(`⚠️ Address checksum changed: ${REVENUE_WALLET_RAW} → ${REVENUE_WALLET}`);
      }

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
            try {
              console.log(`\n🚨 ========== CRITICAL: Starting Token Distribution ==========`);
              const provider = new ethers.JsonRpcProvider(rpcUrl);
              const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);
              const vaultAddress = getBetModeVaultAddress();
              const vaultContract = new ethers.Contract(vaultAddress, BET_MODE_VAULT_ABI, ownerWallet);
              const tokenContract = new ethers.Contract(qtTokenAddress, [
                'function transfer(address to, uint256 amount) returns (bool)',
                'function balanceOf(address account) view returns (uint256)'
              ], ownerWallet);
              
              console.log(`🚨 Owner wallet: ${ownerWallet.address}`);
              console.log(`🚨 Revenue wallet target: ${REVENUE_WALLET}`);
              console.log(`🚨 Burn address target: ${BURN_ADDRESS}`);
              
              // CRITICAL CHECK: Verify owner wallet is NOT the same as revenue wallet
              if (ownerWallet.address.toLowerCase() === REVENUE_WALLET.toLowerCase()) {
                console.error(`🚨 🚨 🚨 CONFIGURATION ERROR: Owner wallet and revenue wallet are the SAME! 🚨 🚨 🚨`);
                console.error(`🚨 Owner: ${ownerWallet.address}`);
                console.error(`🚨 Revenue: ${REVENUE_WALLET}`);
                console.error(`🚨 This means tokens will stay in owner wallet instead of being transferred!`);
                throw new Error(`CONFIGURATION ERROR: Owner wallet (${ownerWallet.address}) cannot be the same as revenue wallet (${REVENUE_WALLET})`);
              }
              
              // Check owner wallet ETH balance for gas
              const ownerEthBalance = await provider.getBalance(ownerWallet.address);
              console.log(`🚨 Owner wallet ETH balance: ${ethers.formatEther(ownerEthBalance)} ETH (for gas)`);
              if (ownerEthBalance < ethers.parseEther('0.001')) {
                console.warn(`⚠️ WARNING: Owner wallet has low ETH balance (${ethers.formatEther(ownerEthBalance)} ETH). Transfers may fail due to insufficient gas!`);
              }
              
              console.log(`📊 Loss Distribution: ${game.betAmount} QT total`);
              console.log(`   - Burn: ${lossDistribution.toBurn} QT (50%)`);
              console.log(`   - Revenue: ${lossDistribution.toPlatform} QT (50%) to ${REVENUE_WALLET}`);
              console.log(`🚨 ========================================================\n`);
              
              // Step 1: Withdraw 50% for burn from contract to owner wallet, then transfer to burn address
              if (lossDistribution.toBurn > 0) {
                const burnAmountWei = ethers.parseEther(lossDistribution.toBurn.toString());
                console.log(`🔄 Withdrawing ${lossDistribution.toBurn} QT from contract for burn...`);
                const burnWithdrawTx = await vaultContract.ownerWithdraw(burnAmountWei);
                const burnWithdrawReceipt = await burnWithdrawTx.wait();
                if (burnWithdrawReceipt.status !== 1) {
                  throw new Error(`Burn withdrawal transaction failed: ${burnWithdrawTx.hash}`);
                }
                console.log(`✅ Burn withdrawal confirmed: ${burnWithdrawTx.hash}`);
                
                // Verify owner wallet has the tokens before transferring
                const ownerBalanceBeforeBurn = await tokenContract.balanceOf(ownerWallet.address);
                console.log(`💰 Owner wallet balance after burn withdrawal: ${ethers.formatEther(ownerBalanceBeforeBurn)} QT`);
                
                if (ownerBalanceBeforeBurn < burnAmountWei) {
                  throw new Error(`Insufficient balance in owner wallet for burn. Have: ${ethers.formatEther(ownerBalanceBeforeBurn)} QT, Need: ${ethers.formatEther(burnAmountWei)} QT`);
                }
                
                // Immediately transfer to burn address
                console.log(`🔥 Transferring ${lossDistribution.toBurn} QT to burn address ${BURN_ADDRESS}...`);
                const burnTx = await tokenContract.transfer(BURN_ADDRESS, burnAmountWei);
                console.log(`⏳ Burn transfer transaction sent: ${burnTx.hash}, waiting for confirmation...`);
                
                const burnReceipt = await burnTx.wait();
                if (burnReceipt.status !== 1) {
                  throw new Error(`Burn transaction failed: ${burnTx.hash}`);
                }
                
                // Verify the burn succeeded by checking burn address balance
                const burnAddressBalance = await tokenContract.balanceOf(BURN_ADDRESS);
                console.log(`✅ Burn transaction confirmed: ${burnTx.hash} - Sent ${lossDistribution.toBurn} QT to ${BURN_ADDRESS}`);
                console.log(`🔥 Burn address balance: ${ethers.formatEther(burnAddressBalance)} QT`);
              }
              
              // Step 2: Withdraw 50% for revenue from contract to owner wallet, then transfer to revenue wallet
              if (lossDistribution.toPlatform > 0) {
                const revenueAmountWei = ethers.parseEther(lossDistribution.toPlatform.toString());
                console.log(`🔄 Withdrawing ${lossDistribution.toPlatform} QT from contract for revenue...`);
                console.log(`📍 Revenue wallet address (checksummed): ${REVENUE_WALLET}`);
                console.log(`📍 Owner wallet address: ${ownerWallet.address}`);
                
                // Check owner balance before revenue withdrawal
                const ownerBalanceBeforeRevenue = await tokenContract.balanceOf(ownerWallet.address);
                console.log(`💰 Owner wallet balance BEFORE revenue withdrawal: ${ethers.formatEther(ownerBalanceBeforeRevenue)} QT`);
                
                const revenueWithdrawTx = await vaultContract.ownerWithdraw(revenueAmountWei);
                const revenueWithdrawReceipt = await revenueWithdrawTx.wait();
                if (revenueWithdrawReceipt.status !== 1) {
                  throw new Error(`Revenue withdrawal transaction failed: ${revenueWithdrawTx.hash}`);
                }
                console.log(`✅ Revenue withdrawal confirmed: ${revenueWithdrawTx.hash}`);
                
                // Verify owner wallet has the tokens before transferring
                const ownerBalance = await tokenContract.balanceOf(ownerWallet.address);
                console.log(`💰 Owner wallet balance AFTER revenue withdrawal: ${ethers.formatEther(ownerBalance)} QT`);
                console.log(`💰 Expected balance increase: ${ethers.formatEther(revenueAmountWei)} QT`);
                
                if (ownerBalance < revenueAmountWei) {
                  throw new Error(`Insufficient balance in owner wallet. Have: ${ethers.formatEther(ownerBalance)} QT, Need: ${ethers.formatEther(revenueAmountWei)} QT`);
                }
                
                // Immediately transfer to revenue wallet
                console.log(`\n🚨 ========== CRITICAL: REVENUE TRANSFER STARTING ==========`);
                console.log(`💰 Transferring ${lossDistribution.toPlatform} QT to revenue wallet ${REVENUE_WALLET}...`);
                console.log(`📍 Transfer details: From ${ownerWallet.address} to ${REVENUE_WALLET}, Amount: ${ethers.formatEther(revenueAmountWei)} QT`);
                
                // Check revenue wallet balance before transfer
                const revenueWalletBalanceBefore = await tokenContract.balanceOf(REVENUE_WALLET);
                console.log(`📊 Revenue wallet balance BEFORE transfer: ${ethers.formatEther(revenueWalletBalanceBefore)} QT`);
                
                try {
                  // Double-check the parameters before transfer
                  console.log(`🔍 Pre-transfer verification:`);
                  console.log(`   - Token contract: ${qtTokenAddress}`);
                  console.log(`   - From: ${ownerWallet.address}`);
                  console.log(`   - To: ${REVENUE_WALLET}`);
                  console.log(`   - Amount (wei): ${revenueAmountWei.toString()}`);
                  console.log(`   - Amount (QT): ${ethers.formatEther(revenueAmountWei)}`);
                  
                  // CRITICAL: Log right before the transfer call
                  console.log(`🚨 ABOUT TO CALL: tokenContract.transfer("${REVENUE_WALLET}", ${revenueAmountWei})`);
                  console.log(`🚨 This transfer MUST succeed or tokens will remain in owner wallet!`);
                  
                  const revenueTx = await tokenContract.transfer(REVENUE_WALLET, revenueAmountWei);
                  console.log(`🚨 TRANSFER CALL COMPLETED - TX Hash: ${revenueTx.hash}`);
                  console.log(`⏳ Revenue transfer transaction sent: ${revenueTx.hash}, waiting for confirmation...`);
                  console.log(`📋 Transaction details: https://basescan.org/tx/${revenueTx.hash}`);
                  
                  const revenueReceipt = await revenueTx.wait();
                  if (revenueReceipt.status !== 1) {
                    throw new Error(`Revenue transaction failed: ${revenueTx.hash}`);
                  }
                  
                  // Verify the transfer succeeded by checking revenue wallet balance
                  const revenueWalletBalanceAfter = await tokenContract.balanceOf(REVENUE_WALLET);
                  const expectedBalance = revenueWalletBalanceBefore + revenueAmountWei;
                  const actualReceived = revenueWalletBalanceAfter - revenueWalletBalanceBefore;
                  
                  console.log(`✅ Revenue transaction confirmed: ${revenueTx.hash}`);
                  console.log(`✅ Revenue wallet balance AFTER transfer: ${ethers.formatEther(revenueWalletBalanceAfter)} QT`);
                  console.log(`✅ Expected increase: ${ethers.formatEther(revenueAmountWei)} QT`);
                  console.log(`✅ Actual received: ${ethers.formatEther(actualReceived)} QT`);
                  
                  if (actualReceived < revenueAmountWei) {
                    throw new Error(`Transfer incomplete! Expected ${ethers.formatEther(revenueAmountWei)} QT but only received ${ethers.formatEther(actualReceived)} QT`);
                  }
                  
                  console.log(`✅ Successfully sent ${lossDistribution.toPlatform} QT to ${REVENUE_WALLET}`);
                  console.log(`🚨 ========== REVENUE TRANSFER COMPLETE ==========\n`);
                } catch (transferError: any) {
                  console.error(`\n🚨 🚨 🚨 CRITICAL ERROR: Revenue Transfer Failed 🚨 🚨 🚨`);
                  console.error(`❌ Transfer to revenue wallet failed:`, transferError);
                  console.error(`❌ Error message:`, transferError.message);
                  console.error(`❌ Error code:`, transferError.code);
                  console.error(`❌ Error data:`, transferError.data);
                  console.error(`❌ Error stack:`, transferError.stack);
                  
                  // Check if tokens are still in owner wallet
                  try {
                    const ownerBalanceAfterError = await tokenContract.balanceOf(ownerWallet.address);
                    console.error(`❌ Owner wallet balance after failed transfer: ${ethers.formatEther(ownerBalanceAfterError)} QT`);
                    console.error(`❌ Tokens may be STUCK in owner wallet: ${ownerWallet.address}`);
                    console.error(`❌ Expected to transfer: ${ethers.formatEther(revenueAmountWei)} QT to ${REVENUE_WALLET}`);
                  } catch (balanceError: any) {
                    console.error(`❌ Could not check owner balance after error:`, balanceError.message);
                  }
                  
                  console.error(`🚨 🚨 🚨 =============================================== 🚨 🚨 🚨\n`);
                  throw transferError; // Re-throw to be caught by outer catch
                }
              }
              
              // Final verification summary
              const totalDistributed = lossDistribution.toBurn + lossDistribution.toPlatform;
              const totalExpected = game.betAmount;
              console.log(`\n✅ ========== LOSS DISTRIBUTION COMPLETE ==========`);
              console.log(`📊 Total Loss: ${totalExpected} QT`);
              console.log(`🔥 Burned: ${lossDistribution.toBurn} QT (50%) → ${BURN_ADDRESS}`);
              console.log(`💰 Revenue: ${lossDistribution.toPlatform} QT (50%) → ${REVENUE_WALLET}`);
              console.log(`📈 Total Distributed: ${totalDistributed} QT`);
              if (totalDistributed === totalExpected) {
                console.log(`✅ Distribution verified: 100% of loss distributed correctly`);
              } else {
                console.warn(`⚠️ Distribution mismatch: Expected ${totalExpected} QT, Distributed ${totalDistributed} QT`);
              }
              console.log(`✅ ================================================\n`);
            } catch (error: any) {
              console.error(`\n🚨 🚨 🚨 CRITICAL: Token Distribution Failed Completely 🚨 🚨 🚨`);
              console.error('❌ Failed to distribute loss tokens:', error);
              console.error('❌ Error type:', error?.constructor?.name || typeof error);
              console.error('❌ Error message:', error?.message || String(error));
              console.error('❌ Error code:', error?.code);
              console.error('❌ Error data:', error?.data);
              console.error('❌ Error stack:', error?.stack);
              console.error(`❌ Game ID: ${game?.gameId || 'unknown'}`);
              console.error(`❌ Loss amount: ${game?.betAmount || 'unknown'} QT`);
              console.error(`❌ Expected burn: ${lossDistribution?.toBurn || 'unknown'} QT`);
              console.error(`❌ Expected revenue: ${lossDistribution?.toPlatform || 'unknown'} QT`);
              console.error(`❌ Revenue wallet: ${REVENUE_WALLET}`);
              console.error(`🚨 🚨 🚨 =============================================== 🚨 🚨 🚨\n`);
              
              // Try to log to external service if available (optional)
              // This ensures errors are not lost even if console logs are cleared
              if (process.env.NODE_ENV === 'production') {
                // You could add Sentry or other error tracking here
                console.error('🚨 Production error - consider adding error tracking service');
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


