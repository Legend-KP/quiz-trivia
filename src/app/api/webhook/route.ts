import { NextRequest } from "next/server";
import { sendWelcomeNotification } from "~/lib/neynar";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    // Check if this is a frame_added event
    if (body.event === 'frame_added') {
      const fid = body.fid;
      console.log(`User ${fid} added your frame`);
      
      // Send welcome notification
      await sendWelcomeNotification(fid);
      console.log(`Welcome notification sent to user ${fid}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method for webhook verification
export async function GET() {
  return Response.json({ 
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
