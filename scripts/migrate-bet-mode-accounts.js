/**
 * Migration script to add QT balance fields to existing currency_accounts
 * Run: node scripts/migrate-bet-mode-accounts.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'quiz_trivia';

  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);
    const accounts = db.collection('currency_accounts');

    // Count existing accounts
    const totalAccounts = await accounts.countDocuments();
    console.log(`📊 Found ${totalAccounts} accounts to migrate`);

    // Update all accounts with QT fields
    const result = await accounts.updateMany(
      {},
      {
        $set: {
          qtBalance: 0,
          qtLockedBalance: 0,
          qtTotalDeposited: 0,
          qtTotalWithdrawn: 0,
          qtTotalWagered: 0,
          qtTotalWon: 0,
        },
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} accounts`);
    console.log(`📝 Matched ${result.matchedCount} accounts`);

    // Verify migration
    const sample = await accounts.findOne({});
    if (sample) {
      console.log('\n📋 Sample account structure:');
      console.log({
        fid: sample.fid,
        balance: sample.balance,
        qtBalance: sample.qtBalance,
        qtLockedBalance: sample.qtLockedBalance,
        qtTotalDeposited: sample.qtTotalDeposited,
        qtTotalWithdrawn: sample.qtTotalWithdrawn,
        qtTotalWagered: sample.qtTotalWagered,
        qtTotalWon: sample.qtTotalWon,
      });
    }

    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

migrate();

