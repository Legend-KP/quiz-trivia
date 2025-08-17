import { NextResponse } from 'next/server';
import { getNeynarFrameManifest } from '~/lib/utils';

export async function GET() {
  try {
    const config = await getNeynarFrameManifest();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error generating metadata:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
