/**
 * Query Total Losses in Bet Mode
 * 
 * This script queries the database to show:
 * - Total losses across all weeks
 * - Total revenue collected (50% of losses)
 * - Total burned (50% of losses)
 * - Per-week breakdown
 * - Per-user breakdown (optional)
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'quiz_trivia';

async function queryTotalLosses() {
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(dbName);
    console.log('✅ Connected to database:', dbName);
    console.log('');

    // ===== METHOD 1: From Weekly Pools (Aggregated) =====
    const pools = db.collection('weekly_pools');
    const allPools = await pools.find({}).toArray();

    const totalLosses = allPools.reduce((sum, pool) => sum + (pool.totalLosses || 0), 0);
    const totalRevenue = allPools.reduce((sum, pool) => sum + (pool.platformRevenue || 0), 0);
    const totalBurned = allPools.reduce((sum, pool) => sum + (pool.toBurnAccumulated || 0), 0);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 TOTAL LOSSES SUMMARY (from weekly pools)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total Losses:     ${totalLosses.toLocaleString()} QT`);
    console.log(`   Total Revenue:    ${totalRevenue.toLocaleString()} QT (50%)`);
    console.log(`   Total Burned:     ${totalBurned.toLocaleString()} QT (50%)`);
    console.log('');

    // ===== METHOD 2: From Lost Games (Individual Records) =====
    const games = db.collection('bet_mode_games');
    const lostGames = await games.find({ status: 'lost' }).toArray();
    const totalFromGames = lostGames.reduce((sum, game) => sum + (game.betAmount || 0), 0);
    const lostGamesCount = lostGames.length;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 TOTAL LOSSES (from lost games)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total Lost Games: ${lostGamesCount.toLocaleString()}`);
    console.log(`   Total Losses:     ${totalFromGames.toLocaleString()} QT`);
    console.log('');

    // ===== METHOD 3: From Transactions (Transaction Log) =====
    const transactions = db.collection('qt_transactions');
    const lossTxs = await transactions
      .find({
        type: 'game_loss',
        status: 'completed',
      })
      .toArray();
    const totalFromTxs = lossTxs.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
    const lossTxCount = lossTxs.length;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 TOTAL LOSSES (from transaction log)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total Loss Transactions: ${lossTxCount.toLocaleString()}`);
    console.log(`   Total Losses:            ${totalFromTxs.toLocaleString()} QT`);
    console.log('');

    // ===== PER-WEEK BREAKDOWN =====
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📅 PER-WEEK BREAKDOWN');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (allPools.length === 0) {
      console.log('   No weekly pools found.');
    } else {
      // Sort by weekId
      const sortedPools = allPools.sort((a, b) => a.weekId.localeCompare(b.weekId));
      
      for (const pool of sortedPools) {
        const losses = pool.totalLosses || 0;
        const revenue = pool.platformRevenue || 0;
        const burned = pool.toBurnAccumulated || 0;
        
        console.log(`   ${pool.weekId}:`);
        console.log(`      Losses:  ${losses.toLocaleString()} QT`);
        console.log(`      Revenue: ${revenue.toLocaleString()} QT (50%)`);
        console.log(`      Burned:  ${burned.toLocaleString()} QT (50%)`);
      }
    }
    console.log('');

    // ===== TOP LOSERS (Optional) =====
    console.log('═══════════════════════════════════════════════════════════');
    console.log('👥 TOP 10 USERS BY TOTAL LOSSES');
    console.log('═══════════════════════════════════════════════════════════');
    
    const userLosses = {};
    for (const game of lostGames) {
      const fid = game.fid;
      if (!userLosses[fid]) {
        userLosses[fid] = { fid, totalLoss: 0, gamesLost: 0 };
      }
      userLosses[fid].totalLoss += game.betAmount || 0;
      userLosses[fid].gamesLost += 1;
    }

    const topLosers = Object.values(userLosses)
      .sort((a, b) => b.totalLoss - a.totalLoss)
      .slice(0, 10);

    if (topLosers.length === 0) {
      console.log('   No users with losses found.');
    } else {
      topLosers.forEach((user, index) => {
        console.log(`   ${index + 1}. FID ${user.fid}: ${user.totalLoss.toLocaleString()} QT (${user.gamesLost} games)`);
      });
    }
    console.log('');

    // ===== VERIFICATION =====
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════');
    
    const methodsMatch = Math.abs(totalLosses - totalFromGames) < 1 && Math.abs(totalLosses - totalFromTxs) < 1;
    
    if (methodsMatch) {
      console.log('   ✅ All three methods match! Data is consistent.');
    } else {
      console.log('   ⚠️  Methods show different totals:');
      console.log(`      Weekly Pools:  ${totalLosses.toLocaleString()} QT`);
      console.log(`      Lost Games:    ${totalFromGames.toLocaleString()} QT`);
      console.log(`      Transactions:  ${totalFromTxs.toLocaleString()} QT`);
    }
    
    // Check 50/50 split
    const expectedRevenue = Math.floor(totalLosses * 0.5);
    const expectedBurned = Math.floor(totalLosses * 0.5);
    const revenueMatch = Math.abs(totalRevenue - expectedRevenue) < 1;
    const burnedMatch = Math.abs(totalBurned - expectedBurned) < 1;
    
    if (revenueMatch && burnedMatch) {
      console.log('   ✅ Loss distribution (50/50) is correct.');
    } else {
      console.log('   ⚠️  Loss distribution may not match 50/50 split:');
      console.log(`      Expected Revenue: ${expectedRevenue.toLocaleString()} QT`);
      console.log(`      Actual Revenue:   ${totalRevenue.toLocaleString()} QT`);
      console.log(`      Expected Burned:  ${expectedBurned.toLocaleString()} QT`);
      console.log(`      Actual Burned:    ${totalBurned.toLocaleString()} QT`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error querying losses:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the query
queryTotalLosses().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

