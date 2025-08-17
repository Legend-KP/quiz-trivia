# Simple Neynar Notifications

This is a simplified notification system for your Quiz Trivia app using Neynar.

## 🎯 What You Get

### 1. **Manual Notifications** 
Send notifications to any user whenever you want.

### 2. **Automated Welcome Notifications**
When a user adds your frame, they automatically get a welcome message.

### 3. **Simple Setup**
Just 3 files and minimal configuration.

## ⚙️ Setup

### 1. Environment Variables
Create `.env.local` in your project root:
```bash
NEYNAR_API_KEY=7ED3805F-54E9-4285-8A33-B9665B0E1D7B
NEXT_PUBLIC_URL=https://quiz-trivia-mu.vercel.app/
```

### 2. Get Your Neynar API Key
- Go to [neynar.com](https://neynar.com)
- Sign up and get your API key
- Add it to your `.env.local` file

## 📁 Files

### `src/lib/neynar.ts`
- **Purpose**: Core Neynar integration
- **What it does**: 
  - Connects to Neynar API
  - Sends manual notifications
  - Sends welcome notifications

### `src/app/api/send-notification/route.ts`
- **Purpose**: API endpoint for manual notifications
- **What it does**: Receives notification requests and sends them via Neynar

### `src/app/api/webhook/route.ts`
- **Purpose**: Handles webhook events from Neynar
- **What it does**: Automatically sends welcome notifications when users add your frame

### `src/components/ui/SimpleNotificationTest.tsx`
- **Purpose**: Test component for manual notifications
- **What it does**: Simple form to test sending notifications to any user

## 🚀 How to Use

### 1. **Send Manual Notifications**
```typescript
import { sendManualNotification } from '~/lib/neynar';

// Send to any user
await sendManualNotification(
  12345, // User's FID
  "🎉 Quiz Completed!", // Title
  "Great job! You scored 8/10" // Message
);
```

### 2. **Via API**
```http
POST /api/send-notification
{
  "fid": 12345,
  "title": "🎉 Quiz Completed!",
  "body": "Great job! You scored 8/10"
}
```

### 3. **Test Component**
Add this to any page to test notifications:
```typescript
import { SimpleNotificationTest } from '~/components/ui/SimpleNotificationTest';

// In your component
<SimpleNotificationTest />
```

## 🔔 Automated Welcome Notifications

### **What Happens**
When a user adds your frame to their Farcaster client:
1. Neynar sends a webhook to your app
2. Your app automatically sends a welcome notification
3. User gets a friendly welcome message

### **Welcome Message Content**
- **Title**: "🎉 Welcome to Quiz Trivia!"
- **Body**: "Your mini app is now ready! Start testing your knowledge with our fun quizzes. 🧠✨"

### **How It Works**
1. User adds your frame
2. Neynar sends `frame_added` webhook event
3. Your webhook handler catches it
4. Automatically calls `sendWelcomeNotification(fid)`
5. User receives welcome notification

## 🌐 Webhook Setup

### **For Production**
1. Go to your Neynar dashboard
2. Set webhook URL to: `https://yourdomain.com/api/webhook`
3. Your app will automatically handle welcome notifications

### **For Development**
1. Use tools like ngrok to expose localhost
2. Set webhook URL to your ngrok URL + `/api/webhook`
3. Test locally with real webhook events

## 📝 Example Usage

### **Quiz Completion**
```typescript
// When user completes a quiz
await sendManualNotification(
  user.fid,
  "🎯 Quiz Complete!",
  `You scored ${score}/${totalQuestions}! ${score >= 8 ? 'Amazing!' : 'Good job!'}`
);
```

### **High Score**
```typescript
// When user gets new high score
await sendManualNotification(
  user.fid,
  "🏆 New High Score!",
  `Congratulations! You beat your previous best of ${previousScore} with ${newScore}!`
);
```

### **Daily Reminder**
```typescript
// Send daily reminder
await sendManualNotification(
  user.fid,
  "🧠 Daily Quiz Time!",
  "Ready for today's challenge? Test your knowledge!"
);
```

## 🔧 That's It!

This system gives you:
- ✅ Manual notifications to any user
- ✅ Automatic welcome messages
- ✅ Simple, clean code
- ✅ Easy to understand and modify
- ✅ No complex preferences or settings

Just set your API key and you're ready to send notifications! 🚀
