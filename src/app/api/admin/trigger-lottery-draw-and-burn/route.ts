import { NextRequest, NextResponse } from 'next/server';
import { GET as combinedGET } from '~/app/api/cron/lottery-draw-and-burn/route';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Verify admin key
    const adminKey = req.headers.get('x-admin-key');
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || adminKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a request with cron secret
    const cronReq = new NextRequest(req.url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    return await combinedGET(cronReq);
  } catch (error: any) {
    console.error('Admin trigger lottery draw and burn error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger lottery draw and burn' },
      { status: 500 }
    );
  }
}

