import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Contest Status API
 * Returns the contest end time and remaining time
 * This ensures all users see the same contest timeline
 */
export async function GET() {
  try {
    // ✅ CONTEST CONFIGURATION - Update these values for your contest
    // Contest starts: January 18, 2026 11:30 PM IST (6:00 PM UTC)
    const CONTEST_START_TIME = new Date('2026-01-18T18:00:00.000Z').getTime();
    const CONTEST_DURATION_HOURS = 72;
    const CONTEST_END_TIME = CONTEST_START_TIME + (CONTEST_DURATION_HOURS * 60 * 60 * 1000);
    
    const now = Date.now();
    const timeLeftMs = Math.max(0, CONTEST_END_TIME - now);
    const timeLeftSec = Math.floor(timeLeftMs / 1000);
    
    // Calculate time components
    const hours = Math.floor(timeLeftSec / 3600);
    const minutes = Math.floor((timeLeftSec % 3600) / 60);
    const seconds = timeLeftSec % 60;
    
    return NextResponse.json({
      success: true,
      contest: {
        startTime: CONTEST_START_TIME,
        endTime: CONTEST_END_TIME,
        durationHours: CONTEST_DURATION_HOURS,
        isActive: timeLeftSec > 0,
        hasStarted: now >= CONTEST_START_TIME,
        hasEnded: now >= CONTEST_END_TIME,
      },
      timeRemaining: {
        totalSeconds: timeLeftSec,
        totalMilliseconds: timeLeftMs,
        hours,
        minutes,
        seconds,
        formatted: `${hours}h ${minutes}m ${seconds}s`,
      },
      serverTime: now,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get contest status' 
      }, 
      { status: 500 }
    );
  }
}
