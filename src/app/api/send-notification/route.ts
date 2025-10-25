import { NextResponse } from "next/server";
import { sendManualNotification } from "~/lib/neynar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/send-notification
// Body: { fid: number, title: string, body: string }
export async function POST(req: Request) {
  try {
    const { fid, title, body } = await req.json();

    if (!fid || !title || !body) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: fid, title, body" },
        { status: 400 }
      );
    }

    const result = await sendManualNotification(Number(fid), title, body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Failed to send notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
