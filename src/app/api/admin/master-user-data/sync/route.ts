import { NextRequest, NextResponse } from 'next/server';
import {
  getMasterUserDataCollection,
  getLeaderboardCollection,
  getCurrencyAccountsCollection,
  getBetModeGamesCollection,
  getTimeAttemptsCollection,
  getChallengesCollection,
  getAuditLogsCollection,
  type MasterUserDataDocument,
  type AuditLogDocument,
} from '~/lib/mongodb';
import { getNeynarUser } from '~/lib/neynar';
import {
  verifyAdminAuth,
  getClientIP,
  validateFID,
  sanitizeString,
  validateWalletAddress,
  checkRateLimit,
} from '~/lib/admin-auth';

export const runtime = 'nodejs';

// Rate limiting: 5 sync operations per hour per IP
const SYNC_RATE_LIMIT = 5;
const SYNC_RATE_WINDOW = 3600000; // 1 hour

/**
 * Audit log for master data operations
 */
async function logAuditEvent(
  action: string,
  ip: string,
  details: Record<string, any>,
  success: boolean,
  error?: string,
  userAgent?: string
) {
  try {
    const auditCollection = await getAuditLogsCollection();
    const auditLog: AuditLogDocument = {
      action,
      ip,
      userAgent: userAgent || undefined,
      details,
      success,
      error: error || undefined,
      timestamp: Date.now(),
    };

    // Store in audit collection (fire and forget - don't block request)
    auditCollection.insertOne(auditLog).catch(err => {
      console.error('Failed to store audit log:', err);
    });

    // Also log to console for immediate visibility
    console.log(`[AUDIT] ${action} | IP: ${ip} | Success: ${success}`, details);
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

/**
 * Sync Master User Data
 * Aggregates user information from multiple collections for airdrop identification
 * 
 * POST /api/admin/master-user-data/sync
 * 
 * Query params:
 * - fid: (optional) Sync specific user by FID
 * - all: (optional) Sync all users
 * 
 * Security:
 * - Requires ADMIN_SECRET authentication
 * - Rate limited: 5 requests per hour per IP
 * - Input validation on all parameters
 * - Audit logging for all operations
 */
export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || undefined;
  const startTime = Date.now();

  try {
    // 1. Authentication check
    const authResult = verifyAdminAuth(req);
    if (!authResult.valid) {
      await logAuditEvent('SYNC_ATTEMPT_UNAUTHORIZED', clientIP, {}, false, authResult.error, userAgent);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Rate limiting
    const rateLimit = checkRateLimit(`sync:${clientIP}`, SYNC_RATE_LIMIT, SYNC_RATE_WINDOW);
    if (!rateLimit.allowed) {
      await logAuditEvent('SYNC_RATE_LIMIT_EXCEEDED', clientIP, {
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      }, false, undefined, userAgent);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': SYNC_RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // 3. Input validation
    const { searchParams } = new URL(req.url);
    const fidParam = searchParams.get('fid');
    const syncAll = searchParams.get('all') === 'true';

    // Validate that either fid or all is provided, but not both
    if (!fidParam && !syncAll) {
      await logAuditEvent('SYNC_INVALID_PARAMS', clientIP, {}, false, 'Missing fid or all param', userAgent);
      return NextResponse.json(
        { error: 'Must provide fid or all=true' },
        { status: 400 }
      );
    }

    if (fidParam && syncAll) {
      await logAuditEvent('SYNC_INVALID_PARAMS', clientIP, {}, false, 'Both fid and all provided', userAgent);
      return NextResponse.json(
        { error: 'Cannot provide both fid and all=true' },
        { status: 400 }
      );
    }

    // Validate FID if provided
    let usersToSync: number[] = [];
    if (fidParam) {
      const fidValidation = validateFID(fidParam);
      if (!fidValidation.valid) {
        await logAuditEvent('SYNC_INVALID_FID', clientIP, { fid: fidParam }, false, fidValidation.error, userAgent);
        return NextResponse.json(
          { error: fidValidation.error },
          { status: 400 }
        );
      }
      usersToSync = [fidValidation.value!];
    }

    // 4. Initialize collections
    const masterCollection = await getMasterUserDataCollection();
    const leaderboardCollection = await getLeaderboardCollection();
    const accountsCollection = await getCurrencyAccountsCollection();
    const gamesCollection = await getBetModeGamesCollection();
    const timeAttemptsCollection = await getTimeAttemptsCollection();
    const challengesCollection = await getChallengesCollection();

    const now = Date.now();
    let synced = 0;
    let errors = 0;

    // 5. Get list of users to sync (if syncAll)
    if (syncAll) {
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
      opponentFids.forEach((fid: number | undefined) => {
        if (fid && typeof fid === 'number') allFids.add(fid);
      });

      usersToSync = Array.from(allFids);

      // Limit batch size for safety (prevent DoS)
      const MAX_BATCH_SIZE = 10000;
      if (usersToSync.length > MAX_BATCH_SIZE) {
        await logAuditEvent('SYNC_BATCH_TOO_LARGE', clientIP, {
          requested: usersToSync.length,
          max: MAX_BATCH_SIZE,
        }, false, 'Batch size exceeds maximum', userAgent);
        return NextResponse.json(
          {
            error: `Batch size too large. Maximum ${MAX_BATCH_SIZE} users per sync.`,
            requested: usersToSync.length,
            max: MAX_BATCH_SIZE,
          },
          { status: 400 }
        );
      }
    }

    console.log(`🔄 Syncing ${usersToSync.length} users... (IP: ${clientIP})`);

    // Process each user
    for (const fid of usersToSync) {
      try {
        // Get user profile from Neynar
        let username = `user_${fid}`;
        let displayName: string | undefined;
        try {
          const neynarUser = await getNeynarUser(fid);
          if (neynarUser) {
            username = sanitizeString(neynarUser.username || username, 100);
            displayName = neynarUser.display_name
              ? sanitizeString(neynarUser.display_name, 200)
              : undefined;
          }
        } catch (err) {
          console.warn(`⚠️ Could not fetch Neynar user for fid ${fid}:`, err);
        }

        // Get wallet address from currency account
        const account = await accountsCollection.findOne({ fid });
        let walletAddress: string | undefined = account?.walletAddress || undefined;
        
        // Validate wallet address format
        if (walletAddress && !validateWalletAddress(walletAddress)) {
          console.warn(`⚠️ Invalid wallet address format for fid ${fid}: ${walletAddress}`);
          walletAddress = undefined; // Don't store invalid addresses
        }

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

    const duration = Date.now() - startTime;
    
    // Log successful sync
    await logAuditEvent('SYNC_COMPLETED', clientIP, {
      synced,
      errors,
      total: usersToSync.length,
      duration,
    }, true, undefined, userAgent);

    return NextResponse.json({
      success: true,
      synced,
      errors,
      total: usersToSync.length,
      message: `Synced ${synced} users, ${errors} errors`,
      duration,
    }, {
      headers: {
        'X-RateLimit-Limit': SYNC_RATE_LIMIT.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toString(),
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('Error syncing master user data:', error);
    
    // Log error
    await logAuditEvent('SYNC_ERROR', clientIP, {
      error: error.message,
      duration,
    }, false, error.message, userAgent);

    // Don't leak internal error details
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get Master User Data
 * GET /api/admin/master-user-data?fid=12345
 * 
 * Security:
 * - Requires ADMIN_SECRET authentication
 * - Rate limited: 100 requests per minute per IP
 * - Input validation on all parameters
 * - Pagination support to prevent large responses
 * - Audit logging for all operations
 */
export async function GET(req: NextRequest) {
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || undefined;
  const startTime = Date.now();

  try {
    // 1. Authentication check
    const authResult = verifyAdminAuth(req);
    if (!authResult.valid) {
      await logAuditEvent('GET_ATTEMPT_UNAUTHORIZED', clientIP, {}, false, authResult.error, userAgent);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Rate limiting (more lenient for reads)
    const rateLimit = checkRateLimit(`get:${clientIP}`, 100, 60000); // 100 per minute
    if (!rateLimit.allowed) {
      await logAuditEvent('GET_RATE_LIMIT_EXCEEDED', clientIP, {}, false, undefined, userAgent);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      );
    }

    // 3. Input validation
    const { searchParams } = new URL(req.url);
    const fidParam = searchParams.get('fid');
    const eligibleOnly = searchParams.get('eligible') === 'true';
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Validate pagination parameters
    const limit = limitParam ? Math.min(Math.max(1, Number(limitParam)), 1000) : 100; // Max 1000
    const offset = offsetParam ? Math.max(0, Number(offsetParam)) : 0;

    const masterCollection = await getMasterUserDataCollection();

    if (fidParam) {
      // Get specific user
      const fidValidation = validateFID(fidParam);
      if (!fidValidation.valid) {
        await logAuditEvent('GET_INVALID_FID', clientIP, { fid: fidParam }, false, fidValidation.error, userAgent);
        return NextResponse.json(
          { error: fidValidation.error },
          { status: 400 }
        );
      }

      const user = await masterCollection.findOne({ fid: fidValidation.value });
      if (!user) {
        await logAuditEvent('GET_USER_NOT_FOUND', clientIP, { fid: fidValidation.value }, false, undefined, userAgent);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      await logAuditEvent('GET_USER_SUCCESS', clientIP, { fid: fidValidation.value }, true, undefined, userAgent);
      return NextResponse.json({ user });
    } else {
      // Get all users (with optional filter and pagination)
      const query = eligibleOnly ? { eligibleForAirdrop: true } : {};
      const total = await masterCollection.countDocuments(query);
      
      const users = await masterCollection
        .find(query)
        .sort({ totalQuizzesPlayed: -1 })
        .skip(offset)
        .limit(limit)
        .toArray();

      await logAuditEvent('GET_LIST_SUCCESS', clientIP, {
        eligibleOnly,
        limit,
        offset,
        returned: users.length,
        total,
      }, true, undefined, userAgent);

      return NextResponse.json({
        users,
        total,
        limit,
        offset,
        hasMore: offset + users.length < total,
      }, {
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        },
      });
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('Error fetching master user data:', error);
    
    await logAuditEvent('GET_ERROR', clientIP, {
      error: error.message,
      duration,
    }, false, error.message, userAgent);

    // Don't leak internal error details
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

