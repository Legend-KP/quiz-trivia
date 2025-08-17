import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import { APP_URL } from './constants';

let neynarClient: NeynarAPIClient | null = null;

export function getNeynarClient() {
  if (!neynarClient) {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      throw new Error('NEYNAR_API_KEY not configured');
    }
    const config = new Configuration({ apiKey });
    neynarClient = new NeynarAPIClient(config);
  }
  return neynarClient;
}

// Simple function to send manual notifications
export async function sendManualNotification(fid: number, title: string, body: string) {
  try {
    const client = getNeynarClient();
    const result = await client.publishFrameNotifications({ 
      targetFids: [fid], 
      notification: {
        title,
        body,
        target_url: APP_URL,
      }
    });
    
    console.log('Notification sent:', result);
    return { success: true };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error };
  }
}

// Automated welcome notification when user adds your frame
export async function sendWelcomeNotification(fid: number) {
  const title = "🎉 Welcome to Quiz Trivia!";
  const body = "Your mini app is now ready! Start testing your knowledge with our fun quizzes. 🧠✨";
  
  return sendManualNotification(fid, title, body);
} 