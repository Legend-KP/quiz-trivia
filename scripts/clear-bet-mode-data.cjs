/**
 * Clear All Bet Mode User Data
 * 
 * This script clears all Bet Mode related data for all users:
 * - All Bet Mode games
 * - All QT transactions (deposits, withdrawals, game wins/losses, lottery wins)
 * - All lottery tickets
 * - All weekly pools
 * - Resets Bet Mode balance fields in currency_accounts
 * 
 * ⚠️ WARNING: This is a destructive operation. Use with caution!
 * 
 * Usage: node scripts/clear-bet-mode-data.cjs
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'quiz_trivia';

async function clearBetModeData() {
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
    console.log('\n⚠️  WARNING: This will delete ALL Bet Mode data!');
    console.log('   - All games');
    console.log('   - All QT transactions');
    console.log('   - All lottery tickets');
    console.log('   - All weekly pools');
    console.log('   - Reset all Bet Mode balances\n');

    // Collections to clear
    const collections = {
      games: db.collection('bet_mode_games'),
      transactions: db.collection('qt_transactions'),
      tickets: db.collection('lottery_tickets'),
      pools: db.collection('weekly_pools'),
      accounts: db.collection('currency_accounts'),
    };

    // Get counts before deletion
    console.log('📊 Current data counts:');
    const gameCount = await collections.games.countDocuments();
    const transactionCount = await collections.transactions.countDocuments();
    const ticketCount = await collections.tickets.countDocuments();
    const poolCount = await collections.pools.countDocuments();
    const accountCount = await collections.accounts.countDocuments({
      $or: [
        { qtBalance: { $exists: true, $ne: 0 } },
        { qtLockedBalance: { $exists: true, $ne: 0 } },
        { qtTotalDeposited: { $exists: true, $ne: 0 } },
        { qtTotalWithdrawn: { $exists: true, $ne: 0 } },
        { qtTotalWagered: { $exists: true, $ne: 0 } },
        { qtTotalWon: { $exists: true, $ne: 0 } },
      ],
    });

    console.log(`   - Games: ${gameCount}`);
    console.log(`   - Transactions: ${transactionCount}`);
    console.log(`   - Lottery Tickets: ${ticketCount}`);
    console.log(`   - Weekly Pools: ${poolCount}`);
    console.log(`   - Accounts with Bet Mode data: ${accountCount}\n`);

    if (gameCount === 0 && transactionCount === 0 && ticketCount === 0 && poolCount === 0 && accountCount === 0) {
      console.log('✅ No Bet Mode data found. Nothing to clear.');
      await client.close();
      return;
    }

    // Confirm deletion
    console.log('🚨 Starting data deletion...\n');

    // 1. Delete all games
    console.log('1️⃣  Deleting all Bet Mode games...');
    const gamesResult = await collections.games.deleteMany({});
    console.log(`   ✅ Deleted ${gamesResult.deletedCount} games`);

    // 2. Delete all QT transactions
    console.log('2️⃣  Deleting all QT transactions...');
    const transactionsResult = await collections.transactions.deleteMany({});
    console.log(`   ✅ Deleted ${transactionsResult.deletedCount} transactions`);

    // 3. Delete all lottery tickets
    console.log('3️⃣  Deleting all lottery tickets...');
    const ticketsResult = await collections.tickets.deleteMany({});
    console.log(`   ✅ Deleted ${ticketsResult.deletedCount} lottery tickets`);

    // 4. Delete all weekly pools
    console.log('4️⃣  Deleting all weekly pools...');
    const poolsResult = await collections.pools.deleteMany({});
    console.log(`   ✅ Deleted ${poolsResult.deletedCount} weekly pools`);

    // 5. Reset Bet Mode fields in currency_accounts
    console.log('5️⃣  Resetting Bet Mode balances in currency_accounts...');
    const accountsResult = await collections.accounts.updateMany(
      {
        $or: [
          { qtBalance: { $exists: true } },
          { qtLockedBalance: { $exists: true } },
          { qtTotalDeposited: { $exists: true } },
          { qtTotalWithdrawn: { $exists: true } },
          { qtTotalWagered: { $exists: true } },
          { qtTotalWon: { $exists: true } },
        ],
      },
      {
        $set: {
          qtBalance: 0,
          qtLockedBalance: 0,
          qtTotalDeposited: 0,
          qtTotalWithdrawn: 0,
          qtTotalWagered: 0,
          qtTotalWon: 0,
          updatedAt: Date.now(),
        },
      }
    );
    console.log(`   ✅ Reset Bet Mode balances for ${accountsResult.modifiedCount} accounts`);

    // Verify deletion
    console.log('\n📊 Verification:');
    const finalGameCount = await collections.games.countDocuments();
    const finalTransactionCount = await collections.transactions.countDocuments();
    const finalTicketCount = await collections.tickets.countDocuments();
    const finalPoolCount = await collections.pools.countDocuments();
    const finalAccountCount = await collections.accounts.countDocuments({
      $or: [
        { qtBalance: { $exists: true, $ne: 0 } },
        { qtLockedBalance: { $exists: true, $ne: 0 } },
        { qtTotalDeposited: { $exists: true, $ne: 0 } },
        { qtTotalWithdrawn: { $exists: true, $ne: 0 } },
        { qtTotalWagered: { $exists: true, $ne: 0 } },
        { qtTotalWon: { $exists: true, $ne: 0 } },
      ],
    });

    console.log(`   - Games: ${finalGameCount} (was ${gameCount})`);
    console.log(`   - Transactions: ${finalTransactionCount} (was ${transactionCount})`);
    console.log(`   - Lottery Tickets: ${finalTicketCount} (was ${ticketCount})`);
    console.log(`   - Weekly Pools: ${finalPoolCount} (was ${poolCount})`);
    console.log(`   - Accounts with Bet Mode data: ${finalAccountCount} (was ${accountCount})`);

    if (
      finalGameCount === 0 &&
      finalTransactionCount === 0 &&
      finalTicketCount === 0 &&
      finalPoolCount === 0 &&
      finalAccountCount === 0
    ) {
      console.log('\n✅ Success! All Bet Mode data has been cleared.');
    } else {
      console.log('\n⚠️  Warning: Some data may still exist. Please check manually.');
    }

    console.log('\n📝 Note: Bet Mode questions were NOT deleted (they are reusable).');
    console.log('   Regular currency_accounts fields (balance, dailyStreakDay, etc.) were NOT affected.\n');
  } catch (error) {
    console.error('❌ Error clearing Bet Mode data:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed.');
  }
}

// Run the script
clearBetModeData()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

