/**
 * Export Airdrop Data Script
 * 
 * Exports master user data to CSV format for airdrop distribution.
 * 
 * Usage:
 *   node scripts/export-airdrop-data.cjs [--output=airdrop.csv] [--min-tier=1]
 * 
 * Options:
 *   --output=airdrop.csv    Output file path (default: airdrop.csv)
 *   --min-tier=1            Minimum airdrop tier to include (1-5)
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const API_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!ADMIN_SECRET) {
  console.error('❌ Error: ADMIN_SECRET environment variable is required');
  process.exit(1);
}

async function exportAirdropData(options = {}) {
  const { outputFile = 'airdrop.csv', minTier = 1 } = options;

  try {
    console.log('📥 Fetching eligible users...');
    const url = `${API_URL}/api/admin/master-user-data?eligible=true`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ADMIN_SECRET}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Quiz-Trivia-Export-Script/1.0',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    console.log(`✅ Found ${data.total} eligible users`);

    // Filter by minimum tier
    const filteredUsers = data.users.filter(user => {
      const tier = user.airdropTier || 0;
      return tier >= minTier && user.walletAddress;
    });

    console.log(`📊 ${filteredUsers.length} users meet criteria (tier >= ${minTier}, has wallet)`);

    // Generate CSV
    const csvHeader = 'FID,Username,Display Name,Wallet Address,Total Quizzes,QT Wagered,QT Won,Bet Mode Games,Airdrop Tier,Airdrop Amount\n';
    
    const csvRows = filteredUsers.map(user => {
      return [
        user.fid,
        `"${(user.username || '').replace(/"/g, '""')}"`,
        `"${(user.displayName || '').replace(/"/g, '""')}"`,
        user.walletAddress || '',
        user.totalQuizzesPlayed || 0,
        user.totalQTWagered || 0,
        user.totalQTWon || 0,
        user.betModeGamesPlayed || 0,
        user.airdropTier || 0,
        user.airdropAmount || 0,
      ].join(',');
    });

    const csvContent = csvHeader + csvRows.join('\n');

    // Write to file
    const outputPath = path.resolve(outputFile);
    fs.writeFileSync(outputPath, csvContent, 'utf8');

    console.log(`\n✅ Exported ${filteredUsers.length} users to: ${outputPath}`);

    // Display summary
    const tierCounts = {};
    let totalAmount = 0;
    filteredUsers.forEach(user => {
      const tier = user.airdropTier || 0;
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      totalAmount += user.airdropAmount || 0;
    });

    console.log('\n📈 Export Summary:');
    Object.keys(tierCounts).sort((a, b) => Number(b) - Number(a)).forEach(tier => {
      const count = tierCounts[tier];
      const tierUsers = filteredUsers.filter(u => (u.airdropTier || 0) === Number(tier));
      const tierAmount = tierUsers.reduce((sum, u) => sum + (u.airdropAmount || 0), 0);
      console.log(`   Tier ${tier}: ${count} users, ${tierAmount.toLocaleString()} tokens`);
    });
    console.log(`   Total: ${filteredUsers.length} users, ${totalAmount.toLocaleString()} tokens`);

    return {
      total: filteredUsers.length,
      file: outputPath,
      totalAmount,
    };
  } catch (error) {
    console.error('❌ Error exporting airdrop data:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  outputFile: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'airdrop.csv',
  minTier: Number(args.find(arg => arg.startsWith('--min-tier='))?.split('=')[1]) || 1,
};

// Run export
exportAirdropData(options)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

