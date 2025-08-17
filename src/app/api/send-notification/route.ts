import { NextRequest } from "next/server";
import { sendManualNotification } from "~/lib/neynar";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, title, body: messageBody } = body;

    if (!fid || !title || !messageBody) {
      return Response.json(
        { success: false, error: 'Missing fid, title, or body' },
        { status: 400 }
      );
    }

    const result = await sendManualNotification(fid, title, messageBody);

    if (result.success) {
      return Response.json({ success: true, message: 'Notification sent successfully' });
    } else {
      return Response.json(
        { success: false, error: 'Failed to send notification' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
