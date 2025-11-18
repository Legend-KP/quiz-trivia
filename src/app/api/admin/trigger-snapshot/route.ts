import { NextRequest, NextResponse } from 'next/server';
import { GET as snapshotGET } from '~/app/api/cron/snapshot/route';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Verify admin key
    const adminKey = req.headers.get('x-admin-key');
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || adminKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a request with cron secret for snapshot
    const cronReq = new NextRequest(req.url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    return await snapshotGET(cronReq);
  } catch (error: any) {
    console.error('Admin trigger snapshot error:', error);
    return NextResponse.json({ error: error.message || 'Failed to trigger snapshot' }, { status: 500 });
  }
}

