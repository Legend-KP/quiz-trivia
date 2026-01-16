/**
 * Admin Endpoint: Check Failed Token Distributions
 * 
 * This endpoint allows admins to view failed token distributions
 * that need manual processing or retry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '~/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    // Optional: Add admin authentication here
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const db = await getDb();
    const failedDistributions = await db
      .collection('failed_distributions')
      .find({ status: 'pending_retry' })
      .sort({ createdAt: -1 }) // Most recent first
      .toArray();

    // Calculate totals
    const totalFailed = failedDistributions.length;
    const totalAmount = failedDistributions.reduce((sum, dist) => sum + (dist.betAmount || 0), 0);
    const totalToBurn = failedDistributions.reduce((sum, dist) => sum + (dist.lossDistribution?.toBurn || 0), 0);
    const totalToRevenue = failedDistributions.reduce((sum, dist) => sum + (dist.lossDistribution?.toPlatform || 0), 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalFailed,
        totalAmount,
        totalToBurn,
        totalToRevenue,
      },
      failedDistributions: failedDistributions.map((dist) => ({
        gameId: dist.gameId,
        fid: dist.fid,
        betAmount: dist.betAmount,
        lossDistribution: dist.lossDistribution,
        weekId: dist.weekId,
        walletAddress: dist.walletAddress,
        error: dist.error,
        burnTxHash: dist.burnTxHash || null,
        revenueTxHash: dist.revenueTxHash || null,
        burnBlockNumber: dist.burnBlockNumber || null,
        status: dist.status,
        createdAt: dist.createdAt,
        updatedAt: dist.updatedAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch failed distributions' },
      { status: 500 }
    );
  }
}

/**
 * Mark a failed distribution as resolved
 */
export async function POST(req: NextRequest) {
  try {
    const { gameId, action } = await req.json();

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 });
    }

    const db = await getDb();
    const collection = db.collection('failed_distributions');

    if (action === 'mark_resolved') {
      const result = await collection.updateOne(
        { gameId, status: 'pending_retry' },
        {
          $set: {
            status: 'resolved',
            updatedAt: Date.now(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Failed distribution not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Failed distribution marked as resolved',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update failed distribution' },
      { status: 500 }
    );
  }
}

