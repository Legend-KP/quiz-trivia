# Weekly Quiz Challenge System

## 🎯 Overview

The Weekly Quiz Challenge is a time-limited, competitive quiz system that runs twice per week with token rewards for top performers. This system runs alongside the existing Classic mode without affecting it.

## 📅 Schedule

- **Days**: Tuesday & Friday
- **Time**: 6:00 PM - 6:00 AM UTC (12-hour windows)
- **Frequency**: 2 quizzes per week = 104 quizzes per year

## 🎮 Quiz Structure

- **Questions**: 10 questions (increased from 4)
- **Time per Question**: 45 seconds (reduced from 60s)
- **Wait Between Questions**: 10 seconds (reduced from 30s)
- **Total Duration**: ~9 minutes
- **Scoring**: +1 for correct, -1 for wrong, 0 for timeout
- **Score Range**: -10 to +10

## 🏆 Token Rewards

Total Pool: **15 Million QT tokens** distributed to top 10 winners:

| Rank | QT Tokens | USD Value* | Percentage |
|------|-----------|------------|-----------|
| 🥇 1st | 4,000,000 | ~$400 | 26.7% |
| 🥈 2nd | 2,500,000 | ~$250 | 16.7% |
| 🥉 3rd | 1,500,000 | ~$150 | 10.0% |
| 4th-10th | 1,000,000 each | ~$100 each | 6.7% each |

*Estimated value based on $0.0001 per QT token

## 🔄 Quiz States

### 1. UPCOMING 📅
- **Duration**: From previous quiz end until next quiz start (~3-4 days)
- **Display**: Next quiz topic, countdown timer, token rewards
- **User Actions**: View countdown, view previous results
- **Button**: Disabled "Starts in X hours"

### 2. LIVE 🔴
- **Duration**: 12-hour active window
- **Display**: "LIVE NOW" badge, START button, participant count
- **User Actions**: Start quiz (one attempt only)
- **Button**: Green "START QUIZ NOW" (pulsing animation)

### 3. ENDED ⏹️
- **Duration**: From quiz end until next quiz start
- **Display**: Top 3 winners preview, full leaderboard link
- **User Actions**: View leaderboard, see next quiz countdown
- **Button**: "Quiz Ended" (disabled)

## 🛠️ Technical Implementation

### Files Created/Modified

1. **`src/lib/weeklyQuiz.ts`** - Core configuration and utilities
2. **`src/hooks/useWeeklyQuiz.ts`** - React hooks for countdown and state
3. **`src/components/WeeklyQuizCard.tsx`** - Main quiz card component
4. **`src/components/WeeklyQuizPage.tsx`** - Quiz page with 10 questions
5. **`src/components/WeeklyQuizStartButton.tsx`** - State-aware start button
6. **`src/app/api/leaderboard/winners/route.ts`** - Winner export endpoint
7. **`src/lib/mongodb.ts`** - Extended with `quizId` field
8. **`src/app/api/leaderboard/route.ts`** - Added quizId filtering
9. **`src/components/ui/tabs/HomeTab.tsx`** - Integrated weekly quiz

### Database Schema

```typescript
interface LeaderboardEntry {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  score: number;
  time: string;
  timeInSeconds: number;
  completedAt: number;
  rank?: number;
  mode: 'CLASSIC' | 'TIME_MODE' | 'CHALLENGE';
  quizId?: string; // NEW: Weekly quiz identifier
}
```

### API Endpoints

- **GET** `/api/leaderboard?quizId=2025-11-05` - Get quiz-specific leaderboard
- **GET** `/api/leaderboard/winners?quizId=2025-11-05` - Export top 10 winners
- **POST** `/api/leaderboard` - Submit score with quizId

## 📝 Admin Tasks

### Before Each Quiz (Tuesday & Friday evenings):

1. **Update Quiz Configuration** in `src/lib/weeklyQuiz.ts`:
   ```typescript
   export const currentWeeklyQuiz: WeeklyQuizConfig = {
     id: "2025-11-08", // Update date
     topic: "NFT Standards", // Update topic
     startTime: "2025-11-08T18:00:00Z", // Update start time
     endTime: "2025-11-09T06:00:00Z", // Update end time
     questions: [
       // Update with 10 new questions
     ]
   };
   ```

2. **Deploy Changes** to production

### After Each Quiz Ends:

1. **Export Winners** via `/api/leaderboard/winners?quizId=2025-11-05`
2. **Distribute Tokens** manually to verified wallet addresses
3. **Announce Results** on Farcaster

## 🧪 Testing

### Test Different States:

1. **Upcoming State**: Set `startTime` to future date
2. **Live State**: Set `startTime` to past, `endTime` to future
3. **Ended State**: Set `endTime` to past date

### Test Quiz Flow:

1. Start quiz during live state
2. Complete all 10 questions
3. Verify score submission with quizId
4. Check leaderboard filtering

## 🚀 Usage

The Weekly Quiz system is now integrated into the main app:

1. **Home Page**: Shows Weekly Quiz Card with current state
2. **Quiz Page**: 10 questions with 45s timing
3. **Results**: Submits score with quizId for tracking
4. **Leaderboard**: Filters by quizId for weekly results

## 📊 Monitoring

- **Participant Count**: Tracked in real-time
- **Quiz State**: Automatically calculated based on time
- **Winner Export**: CSV format for token distribution
- **Leaderboard**: Separate tracking per quiz

## 🔧 Configuration

### Timezone Handling:
- All times stored in UTC
- Browser automatically converts to user's local timezone
- Countdown shows user's local time
- Handles daylight saving time automatically

### Edge Cases Handled:
- Late start (grace period)
- Post-deadline start attempts
- Multiple perfect scores (time tiebreaker)
- User refreshes mid-quiz (restart required)
- Participant count edge cases

## 📈 Future Enhancements

- [ ] Admin interface for question management
- [ ] Automated token distribution
- [ ] Push notifications for quiz start
- [ ] Quiz analytics dashboard
- [ ] Social sharing improvements
- [ ] Mobile app integration
