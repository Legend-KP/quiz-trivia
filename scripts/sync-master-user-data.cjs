/**
 * Sync Master User Data Script
 * 
 * This script syncs master user data from all collections for airdrop identification.
 * 
 * Usage:
 *   node scripts/sync-master-user-data.cjs [--all] [--fid=12345] [--eligible-only]
 * 
 * Options:
 *   --all              Sync all users
 *   --fid=12345        Sync specific user by FID
 *   --eligible-only    Only export eligible users
 */

require('dotenv').config({ path: '.env.local' });

const API_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!ADMIN_SECRET) {
  console.error('❌ Error: ADMIN_SECRET environment variable is required');
  process.exit(1);
}

async function syncMasterUserData(options = {}) {
  const { all = false, fid = null, eligibleOnly = false } = options;

  try {
    let url = `${API_URL}/api/admin/master-user-data/sync`;
    const params = new URLSearchParams();

    if (fid) {
      params.append('fid', fid.toString());
    } else if (all) {
      params.append('all', 'true');
    } else {
      console.error('❌ Error: Must provide --all or --fid');
      process.exit(1);
    }

    if (params.toString()) {
      url += '?' + params.toString();
    }

    console.log('🔄 Syncing master user data...');
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_SECRET}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Quiz-Trivia-Sync-Script/1.0',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    console.log('✅ Sync completed!');
    console.log(`   Synced: ${data.synced} users`);
    console.log(`   Errors: ${data.errors} users`);
    console.log(`   Total: ${data.total} users`);

    // If eligible-only, also fetch and display eligible users
    if (eligibleOnly) {
      console.log('\n📊 Fetching eligible users...');
      const eligibleUrl = `${API_URL}/api/admin/master-user-data?eligible=true`;
      const eligibleResponse = await fetch(eligibleUrl, {
        headers: {
          'Authorization': `Bearer ${ADMIN_SECRET}`,
        },
      });

      if (eligibleResponse.ok) {
        const eligibleData = await eligibleResponse.json();
        console.log(`\n✅ Found ${eligibleData.total} eligible users for airdrop`);
        
        // Display summary by tier
        const tierCounts = {};
        eligibleData.users.forEach(user => {
          const tier = user.airdropTier || 0;
          tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        });

        console.log('\n📈 Airdrop Tier Distribution:');
        Object.keys(tierCounts).sort((a, b) => Number(b) - Number(a)).forEach(tier => {
          console.log(`   Tier ${tier}: ${tierCounts[tier]} users`);
        });
      }
    }

    return data;
  } catch (error) {
    console.error('❌ Error syncing master user data:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  all: args.includes('--all'),
  fid: args.find(arg => arg.startsWith('--fid='))?.split('=')[1],
  eligibleOnly: args.includes('--eligible-only'),
};

// Run sync
syncMasterUserData(options)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

