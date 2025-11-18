import { NextRequest, NextResponse } from 'next/server';
import { GET as lotteryDrawGET } from '~/app/api/cron/lottery-draw/route';
import { GET as burnGET } from '~/app/api/cron/burn/route';

export const runtime = 'nodejs';

/**
 * Combined cron job that runs lottery draw and burn sequentially
 * Runs every Friday at 2:00 PM UTC
 * First executes lottery draw, then waits 30 seconds and executes burn
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Execute lottery draw
    console.log('🎲 Starting lottery draw...');
    const drawReq = new NextRequest(req.url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${cronSecret}`,
      },
    });

    const drawResponse = await lotteryDrawGET(drawReq);
    const drawResult = await drawResponse.json();

    if (!drawResponse.ok) {
      console.error('❌ Lottery draw failed:', drawResult);
      return NextResponse.json(
        { error: 'Lottery draw failed', details: drawResult },
        { status: drawResponse.status }
      );
    }

    console.log('✅ Lottery draw completed:', drawResult);

    // Step 2: Wait 30 seconds before burn (as per original schedule)
    console.log('⏳ Waiting 30 seconds before burn...');
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Step 3: Execute burn
    console.log('🔥 Starting burn...');
    const burnReq = new NextRequest(req.url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${cronSecret}`,
      },
    });

    const burnResponse = await burnGET(burnReq);
    const burnResult = await burnResponse.json();

    if (!burnResponse.ok) {
      console.error('❌ Burn failed:', burnResult);
      return NextResponse.json(
        {
          error: 'Burn failed',
          details: burnResult,
          lotteryDraw: drawResult,
        },
        { status: burnResponse.status }
      );
    }

    console.log('✅ Burn completed:', burnResult);

    return NextResponse.json({
      success: true,
      lotteryDraw: drawResult,
      burn: burnResult,
      message: 'Lottery draw and burn completed successfully',
    });
  } catch (error: any) {
    console.error('❌ Combined cron job error:', error);
    return NextResponse.json(
      { error: error.message || 'Combined cron job failed' },
      { status: 500 }
    );
  }
}

