import { NextRequest, NextResponse } from 'next/server';
import {
  getMasterUserDataCollection,
  getLeaderboardCollection,
  getCurrencyAccountsCollection,
  getBetModeGamesCollection,
  getTimeAttemptsCollection,
  getChallengesCollection,
  type MasterUserDataDocument,
} from '~/lib/mongodb';
import { getNeynarUser } from '~/lib/neynar';

export const runtime = 'nodejs';

/**
 * Sync Master User Data
 * Aggregates user information from multiple collections for airdrop identification
 * 
 * POST /api/admin/master-user-data/sync
 * 
 * Query params:
 * - fid: (optional) Sync specific user by FID
 * - all: (optional) Sync all users
 */
export async function POST(req: NextRequest) {
  try {
    // Check for admin secret
    const authHeader = req.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET;
    
    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fidParam = searchParams.get('fid');
    const syncAll = searchParams.get('all') === 'true';

    const masterCollection = await getMasterUserDataCollection();
    const leaderboardCollection = await getLeaderboardCollection();
    const accountsCollection = await getCurrencyAccountsCollection();
    const gamesCollection = await getBetModeGamesCollection();
    const timeAttemptsCollection = await getTimeAttemptsCollection();
    const challengesCollection = await getChallengesCollection();

    const now = Date.now();
    let synced = 0;
    let errors = 0;

    // Get list of users to sync
    let usersToSync: number[] = [];

    if (fidParam) {
      // Sync specific user
      const fid = Number(fidParam);
      if (Number.isNaN(fid)) {
        return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
      }
      usersToSync = [fid];
    } else if (syncAll) {
      // Get all unique FIDs from all collections
      const allFids = new Set<number>();

      // From leaderboard
      const leaderboardFids = await leaderboardCollection.distinct('fid');
      leaderboardFids.forEach((fid: number) => allFids.add(fid));

      // From currency accounts
      const accountFids = await accountsCollection.distinct('fid');
      accountFids.forEach((fid: number) => allFids.add(fid));

      // From bet mode games
      const gameFids = await gamesCollection.distinct('fid');
      gameFids.forEach((fid: number) => allFids.add(fid));

      // From time attempts
      const timeFids = await timeAttemptsCollection.distinct('fid');
      timeFids.forEach((fid: number) => allFids.add(fid));

      // From challenges
      const challengeFids = await challengesCollection.distinct('challengerFid');
      challengeFids.forEach((fid: number) => allFids.add(fid));
      const opponentFids = await challengesCollection.distinct('opponentFid');
      opponentFids.forEach((fid: number) => {
        if (fid) allFids.add(fid);
      });

      usersToSync = Array.from(allFids);
    } else {
      return NextResponse.json({ error: 'Must provide fid or all=true' }, { status: 400 });
    }

    console.log(`🔄 Syncing ${usersToSync.length} users...`);

    // Process each user
    for (const fid of usersToSync) {
      try {
        // Get user profile from Neynar
        let username = `user_${fid}`;
        let displayName: string | undefined;
        try {
          const neynarUser = await getNeynarUser(fid);
          if (neynarUser) {
            username = neynarUser.username || username;
            displayName = neynarUser.display_name;
          }
        } catch (err) {
          console.warn(`⚠️ Could not fetch Neynar user for fid ${fid}:`, err);
        }

        // Get wallet address from currency account
        const account = await accountsCollection.findOne({ fid });
        const walletAddress = account?.walletAddress || undefined;

        // Count quizzes from leaderboard
        const weeklyQuizzes = await leaderboardCollection.countDocuments({
          fid,
          mode: 'CLASSIC',
        });
        const timeModeQuizzes = await leaderboardCollection.countDocuments({
          fid,
          mode: 'TIME_MODE',
        });
        const challengeQuizzes = await leaderboardCollection.countDocuments({
          fid,
          mode: 'CHALLENGE',
        });
        const totalQuizzesPlayed = weeklyQuizzes + timeModeQuizzes + challengeQuizzes;

        // Count time attempts (additional Time Mode entries)
        const timeAttempts = await timeAttemptsCollection.countDocuments({ fid });
        // Add time attempts to total (they may not all be in leaderboard)
        const totalQuizzesWithAttempts = totalQuizzesPlayed + timeAttempts;

        // Get Bet Mode statistics
        const betModeGames = await gamesCollection.find({ fid }).toArray();
        const betModeGamesPlayed = betModeGames.length;
        const betModeGamesWon = betModeGames.filter(g => g.status === 'won' || g.status === 'cashed_out').length;
        const totalQTWagered = account?.qtTotalWagered || 0;
        const totalQTWon = account?.qtTotalWon || 0;

        // Calculate activity dates
        const allActivities: number[] = [];

        // From leaderboard
        const leaderboardEntries = await leaderboardCollection
          .find({ fid })
          .sort({ completedAt: 1 })
          .toArray();
        leaderboardEntries.forEach(entry => {
          if (entry.completedAt) allActivities.push(entry.completedAt);
        });

        // From time attempts
        const timeEntries = await timeAttemptsCollection
          .find({ fid })
          .sort({ createdAt: 1 })
          .toArray();
        timeEntries.forEach(entry => {
          if (entry.createdAt) allActivities.push(entry.createdAt);
        });

        // From bet mode games
        betModeGames.forEach(game => {
          if (game.startedAt) allActivities.push(game.startedAt);
          if (game.completedAt) allActivities.push(game.completedAt);
        });

        // From challenges
        const challenges = await challengesCollection.find({
          $or: [{ challengerFid: fid }, { opponentFid: fid }],
        }).toArray();
        challenges.forEach(challenge => {
          if (challenge.createdAt) allActivities.push(challenge.createdAt);
        });

        const firstActivityAt = allActivities.length > 0 ? Math.min(...allActivities) : now;
        const lastActivityAt = allActivities.length > 0 ? Math.max(...allActivities) : now;

        // Calculate unique days active
        const uniqueDays = new Set<string>();
        allActivities.forEach(timestamp => {
          const date = new Date(timestamp);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          uniqueDays.add(dateStr);
        });
        const daysActive = uniqueDays.size;

        // Determine airdrop eligibility and tier
        // Tier 1: High activity (100+ quizzes or 1M+ QT wagered)
        // Tier 2: Medium-high (50+ quizzes or 500K+ QT wagered)
        // Tier 3: Medium (25+ quizzes or 100K+ QT wagered)
        // Tier 4: Low-medium (10+ quizzes or 10K+ QT wagered)
        // Tier 5: Low (1+ quiz or any QT wagered)
        let airdropTier = 0;
        let eligibleForAirdrop = false;

        if (totalQuizzesWithAttempts >= 100 || totalQTWagered >= 1000000) {
          airdropTier = 1;
          eligibleForAirdrop = true;
        } else if (totalQuizzesWithAttempts >= 50 || totalQTWagered >= 500000) {
          airdropTier = 2;
          eligibleForAirdrop = true;
        } else if (totalQuizzesWithAttempts >= 25 || totalQTWagered >= 100000) {
          airdropTier = 3;
          eligibleForAirdrop = true;
        } else if (totalQuizzesWithAttempts >= 10 || totalQTWagered >= 10000) {
          airdropTier = 4;
          eligibleForAirdrop = true;
        } else if (totalQuizzesWithAttempts >= 1 || totalQTWagered > 0) {
          airdropTier = 5;
          eligibleForAirdrop = true;
        }

        // Calculate airdrop amount (placeholder - adjust based on your airdrop rules)
        let airdropAmount = 0;
        if (eligibleForAirdrop) {
          // Example calculation: base amount * tier multiplier
          const baseAmount = 1000; // Base airdrop amount
          const tierMultipliers = [0, 10, 5, 3, 2, 1]; // Tier 0 = 0, Tier 1 = 10x, etc.
          airdropAmount = baseAmount * (tierMultipliers[airdropTier] || 0);
        }

        // Create or update master user data
        const masterData: MasterUserDataDocument = {
          fid,
          username,
          displayName,
          walletAddress,
          totalQuizzesPlayed: totalQuizzesWithAttempts,
          weeklyQuizzesPlayed: weeklyQuizzes,
          timeModeQuizzesPlayed: timeModeQuizzes + timeAttempts,
          challengeQuizzesPlayed: challengeQuizzes,
          totalQTWagered,
          totalQTWon,
          betModeGamesPlayed,
          betModeGamesWon,
          firstActivityAt,
          lastActivityAt,
          daysActive,
          eligibleForAirdrop,
          airdropTier: eligibleForAirdrop ? airdropTier : undefined,
          airdropAmount: eligibleForAirdrop ? airdropAmount : undefined,
          updatedAt: now,
          lastSyncedAt: now,
        };

        // Check if document exists
        const existing = await masterCollection.findOne({ fid });
        
        if (existing) {
          // Update existing
          await masterCollection.updateOne(
            { fid },
            { $set: masterData }
          );
        } else {
          // Create new
          await masterCollection.insertOne({
            ...masterData,
            createdAt: now,
          });
        }

        synced++;
      } catch (err: any) {
        console.error(`❌ Error syncing user ${fid}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      errors,
      total: usersToSync.length,
      message: `Synced ${synced} users, ${errors} errors`,
    });
  } catch (error: any) {
    console.error('Error syncing master user data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get Master User Data
 * GET /api/admin/master-user-data?fid=12345
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fidParam = searchParams.get('fid');
    const eligibleOnly = searchParams.get('eligible') === 'true';

    const masterCollection = await getMasterUserDataCollection();

    if (fidParam) {
      // Get specific user
      const fid = Number(fidParam);
      if (Number.isNaN(fid)) {
        return NextResponse.json({ error: 'Invalid fid' }, { status: 400 });
      }

      const user = await masterCollection.findOne({ fid });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({ user });
    } else {
      // Get all users (with optional filter)
      const query = eligibleOnly ? { eligibleForAirdrop: true } : {};
      const users = await masterCollection.find(query).sort({ totalQuizzesPlayed: -1 }).toArray();
      const total = await masterCollection.countDocuments(query);

      return NextResponse.json({
        users,
        total,
      });
    }
  } catch (error: any) {
    console.error('Error fetching master user data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

