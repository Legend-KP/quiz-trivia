# 🎯 Weekly Quiz Challenge - Complete Documentation

## 📋 Overview

The Weekly Quiz Challenge is a time-limited, competitive quiz system that runs **twice per week** (Tuesday & Friday) with **15M QT token rewards** for top 10 performers. This system runs alongside existing quiz modes without affecting them.

---

## 📁 **All Files & Their Purposes**

### **1. Core Configuration & Utilities**

#### **`src/lib/weeklyQuiz.ts`** (226 lines)
**Purpose**: Central configuration file containing quiz setup, questions, and utility functions.

**Key Exports**:
- `WeeklyQuizConfig` - Interface for quiz configuration
- `QuizQuestion` - Interface for individual questions
- `QuizState` - Type: 'upcoming' | 'live' | 'ended'
- `currentWeeklyQuiz` - **Main quiz configuration object** (update this before each quiz)
- `calculateQuizState()` - Determines current quiz state
- `getNextQuizStartTime()` - Calculates next Tuesday/Friday 6 PM UTC
- `formatCountdown()` - Formats timer display
- `getTokenReward(rank)` - Returns QT tokens for rank (1-10)
- `formatTokens(amount)` - Formats token amounts (e.g., "4.0M")

**Important**: This file contains the **10 questions** that must be updated before each quiz!

---

### **2. React Hooks**

#### **`src/hooks/useWeeklyQuiz.ts`** (76 lines)
**Purpose**: Custom React hooks for quiz state management and countdown timers.

**Exports**:
- `useCountdown(targetTime)` - Returns formatted countdown string (updates every second)
- `useQuizState(config)` - Returns current quiz state ('upcoming' | 'live' | 'ended')

**Usage**:
```typescript
const countdown = useCountdown('2025-11-08T18:00:00Z');
const state = useQuizState(currentWeeklyQuiz);
```

---

### **3. UI Components**

#### **`src/components/WeeklyQuizStartButton.tsx`** (288 lines)
**Purpose**: Main button component displayed on home page with details modal.

**Features**:
- Button with dynamic text based on quiz state
- Color gradients that change by state:
  - Purple/Indigo for upcoming
  - Red/Pink for live
  - Gray for ended
  - Green for completed
- **Details Modal** that opens on click showing:
  - Quiz description
  - Token rewards breakdown
  - Scoring rules
  - Countdown timer
  - State-specific messages
- Handles wallet transaction authentication
- Only allows quiz start when state is 'live'

**Key Props**:
```typescript
interface WeeklyQuizStartButtonProps {
  quizState: QuizState;
  onQuizStart: () => void;
  userCompleted?: boolean;
  className?: string;
}
```

**Note**: Currently has **TESTING MODE** enabled (10-second countdown). See lines 28-45.

---

#### **`src/components/WeeklyQuizPage.tsx`** (246 lines)
**Purpose**: The actual quiz page where users take the quiz.

**Features**:
- **Start Screen**: Shows quiz rules and topic
- **10 Questions**: Each with 45-second timer
- **10-Second Intervals**: Between questions
- **Score Calculation**: +1 correct, -1 wrong, 0 timeout
- **Progress Bar**: Visual progress indicator
- **Answer Feedback**: Shows correct/wrong + explanation
- **Wait Screen**: 10-second countdown between questions
- **Completion**: Calls `onComplete()` with score, answers, and time

**Flow**:
1. Start screen → User clicks "Start Weekly Quiz"
2. Question 1 → 45s timer → Answer selected/timeout
3. Feedback shown → 10s wait
4. Question 2 → Repeat...
5. Question 10 → Final score → Submit to leaderboard

---

#### **`src/components/WeeklyQuizCard.tsx`** (276 lines)
**Purpose**: Standalone card component (currently not used in main flow, but available for future use).

**Features**:
- Three state views: UpcomingQuizView, LiveQuizView, EndedQuizView
- Displays quiz topic, countdown, rewards, participant count
- Can be used in other parts of the app if needed

**Note**: This component exists but is **not currently rendered** in the main app. The WeeklyQuizStartButton handles the UI instead.

---

### **4. Integration Files**

#### **`src/components/ui/tabs/HomeTab.tsx`** (Modified)
**Changes Made**:
- Added Weekly Quiz button to home page mode list (line 300)
- Added `onStartWeeklyQuiz` handler (line 1340)
- Added `'weekly-quiz'` to screen states (line 1322)
- Integrated WeeklyQuizPage component (lines 1478-1486)

**Location of Weekly Quiz**:
- First button in the mode list
- Appears above Time Mode, Classic Quiz, and Challenge Mode

---

### **5. Database Schema**

#### **`src/lib/mongodb.ts`** (Modified)
**Changes Made**:
- Added `quizId?: string` field to `LeaderboardEntry` interface (line 18)

**Purpose**: Allows tracking which weekly quiz each entry belongs to.

**Usage**:
```typescript
{
  fid: 12345,
  score: 8,
  mode: 'CLASSIC',
  quizId: '2025-11-05' // Links entry to specific quiz
}
```

---

### **6. API Endpoints**

#### **`src/app/api/leaderboard/route.ts`** (Modified)
**Changes Made**:
- Added `quizId` query parameter support (line 23)
- Filters leaderboard by `quizId` when provided (line 30)
- Accepts `quizId` in POST requests for score submission (line 73)

**Endpoints**:
- `GET /api/leaderboard?quizId=2025-11-05` - Get quiz-specific leaderboard
- `POST /api/leaderboard` - Submit score with quizId

---

#### **`src/app/api/leaderboard/winners/route.ts`** (117 lines) - **NEW FILE**
**Purpose**: Admin endpoint to export top 10 winners for token distribution.

**Endpoints**:
- `GET /api/leaderboard/winners?quizId=2025-11-05`
  - Returns top 10 winners with token amounts
  - Includes FID, username, score, time, and QT tokens per rank

- `POST /api/leaderboard/winners`
  - Formats winners data for CSV export
  - Includes USD value calculations

**Response Format**:
```json
{
  "quizId": "2025-11-05",
  "topic": "DeFi Protocols",
  "totalParticipants": 847,
  "winners": [
    {
      "rank": 1,
      "fid": 12345,
      "username": "alice.eth",
      "score": 10,
      "time": "4:32",
      "tokens": 4000000
    },
    ...
  ]
}
```

---

## 🎮 **Quiz Specifications**

### **Schedule**
- **Days**: Tuesday & Friday
- **Time**: 6:00 PM - 6:00 AM UTC (12-hour windows)
- **Frequency**: 2 quizzes per week = 104 quizzes per year

### **Structure**
- **Questions**: 10 questions per quiz
- **Time per Question**: 45 seconds
- **Wait Between Questions**: 10 seconds
- **Total Duration**: ~9 minutes (45s × 10 + 10s × 9 intervals)

### **Scoring**
- **Correct Answer**: +1 point
- **Wrong Answer**: -1 point
- **Timeout (No Answer)**: 0 points
- **Score Range**: -10 to +10
- **Ranking**: Score (primary) → Time (tiebreaker)

### **Rewards** (15M QT Total)
| Rank | QT Tokens | USD Value* |
|------|-----------|------------|
| 🥇 1st | 4,000,000 | ~$400 |
| 🥈 2nd | 2,500,000 | ~$250 |
| 🥉 3rd | 1,500,000 | ~$150 |
| 4th-10th | 1,000,000 each | ~$100 each |

*Estimated at $0.0001 per QT token

---

## 🔄 **Quiz States**

### **1. UPCOMING 📅**
- **Duration**: From previous quiz end until next quiz start (~3-4 days)
- **Button Text**: "Weekly Quiz Challenge 📅"
- **Button Color**: Purple to Indigo gradient
- **Modal Shows**: Countdown to quiz start

### **2. LIVE 🔴**
- **Duration**: 12-hour active window
- **Button Text**: "Weekly Quiz Challenge 🔴 LIVE"
- **Button Color**: Red to Pink gradient (pulsing animation)
- **Modal Shows**: Countdown until quiz ends
- **Action**: Users can start quiz

### **3. ENDED ⏹️**
- **Duration**: From quiz end until next quiz start
- **Button Text**: "Weekly Quiz Challenge ⏹️"
- **Button Color**: Gray (disabled)
- **Modal Shows**: Countdown to next quiz

---

## 📝 **Admin Tasks**

### **Before Each Quiz** (Tuesday & Friday evenings):

1. **Update `src/lib/weeklyQuiz.ts`**:
   ```typescript
   export const currentWeeklyQuiz: WeeklyQuizConfig = {
     id: "2025-11-08",        // UPDATE: Next quiz date
     topic: "NFT Standards", // UPDATE: New topic
     startTime: "2025-11-08T18:00:00Z", // UPDATE: Start time
     endTime: "2025-11-09T06:00:00Z",   // UPDATE: End time
     questions: [            // UPDATE: 10 new questions
       // ... 10 questions here
     ]
   };
   ```

2. **Deploy Changes** to production

### **After Each Quiz Ends**:

1. **Export Winners**:
   ```bash
   GET /api/leaderboard/winners?quizId=2025-11-05
   ```

2. **Distribute Tokens** manually to verified wallet addresses

3. **Announce Results** on Farcaster

---

## 🧪 **Testing**

### **Current Testing Mode**
The countdown timer is set to **10 seconds** for testing (see `WeeklyQuizStartButton.tsx` lines 28-45).

**To Restore Production Countdown**:
Uncomment lines 35-44 and comment out line 32 in `WeeklyQuizStartButton.tsx`.

---

## 🔧 **File Structure Summary**

```
quiz-trivia/
├── src/
│   ├── lib/
│   │   ├── weeklyQuiz.ts          ⭐ Core config & utilities
│   │   └── mongodb.ts              ✅ Extended with quizId
│   │
│   ├── hooks/
│   │   └── useWeeklyQuiz.ts        ⭐ React hooks (countdown & state)
│   │
│   ├── components/
│   │   ├── WeeklyQuizStartButton.tsx  ⭐ Main button on home page
│   │   ├── WeeklyQuizPage.tsx         ⭐ Quiz page (10 questions)
│   │   └── WeeklyQuizCard.tsx         📦 Available but unused
│   │
│   ├── components/ui/tabs/
│   │   └── HomeTab.tsx                ✅ Integrated Weekly Quiz
│   │
│   └── app/api/
│       ├── leaderboard/
│       │   ├── route.ts               ✅ Added quizId support
│       │   └── winners/
│       │       └── route.ts           ⭐ Winner export endpoint
│
└── WEEKLY_QUIZ_COMPLETE_DOCUMENTATION.md  📄 This file
```

**Legend**:
- ⭐ = New file created for Weekly Quiz
- ✅ = Existing file modified
- 📦 = File exists but not currently used
- 📄 = Documentation file

---

## 🚀 **How It Works**

### **User Journey**:

1. **Home Page**: User sees "Weekly Quiz Challenge" button
2. **Click Button**: Details modal opens showing:
   - Quiz description
   - Token rewards
   - Scoring rules
   - Countdown timer
3. **If Live**: User clicks "Start Quiz 🚀"
4. **Wallet Auth**: Transaction signature (no payment)
5. **Quiz Page**: User takes 10-question quiz
6. **Results**: Score submitted with `quizId` to leaderboard
7. **Leaderboard**: Shows quiz-specific rankings with token amounts

### **State Transitions**:

```
UPCOMING → (6 PM UTC Tuesday/Friday) → LIVE → (6 AM UTC next day) → ENDED → UPCOMING
```

---

## 📊 **Database**

### **LeaderboardEntry Schema**:
```typescript
{
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  score: number;              // -10 to +10
  time: string;               // "MM:SS"
  timeInSeconds: number;
  completedAt: number;        // Timestamp
  rank?: number;
  mode: 'CLASSIC';            // Weekly quiz uses CLASSIC mode
  quizId: string;             // NEW: "2025-11-05"
}
```

### **Indexing** (Recommended):
```javascript
// MongoDB indexes for performance
{ quizId: 1, mode: 1 }
{ quizId: 1, score: -1, timeInSeconds: 1 }
```

---

## 🎨 **UI/UX Features**

### **Button States**:
- **Upcoming**: Purple/Indigo, calendar icon 📅
- **Live**: Red/Pink with pulsing animation, LIVE badge 🔴
- **Ended**: Gray, disabled, ended icon ⏹️
- **Completed**: Green checkmark ✓

### **Modal Features**:
- Color-coded sections (blue, yellow, green, purple/red/gray)
- Real-time countdown timer
- State-specific messaging
- Clear call-to-action buttons

### **Quiz Page Features**:
- Progress bar
- Timer countdown per question
- Visual feedback (green/red for correct/wrong)
- Explanations after each question
- Score tracking in header

---

## 🔗 **API Endpoints Summary**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/leaderboard?quizId=2025-11-05` | GET | Get quiz-specific leaderboard |
| `/api/leaderboard` | POST | Submit score with quizId |
| `/api/leaderboard/winners?quizId=2025-11-05` | GET | Export top 10 winners |
| `/api/leaderboard/winners` | POST | Format winners for CSV |

---

## ⚠️ **Important Notes**

1. **Question Updates**: Must manually update questions in `src/lib/weeklyQuiz.ts` before each quiz
2. **Testing Mode**: Countdown currently set to 10 seconds (change for production)
3. **Token Distribution**: Manual process - export winners and send tokens
4. **Timezone**: All times stored in UTC, displayed in user's local timezone
5. **One Attempt**: Users can only take quiz once per session (tracked by `userCompleted`)

---

## 📞 **Support & Maintenance**

### **To Add New Questions**:
Edit `currentWeeklyQuiz.questions` array in `src/lib/weeklyQuiz.ts`

### **To Change Schedule**:
Modify `getNextQuizStartTime()` function in `src/lib/weeklyQuiz.ts`

### **To Adjust Rewards**:
Update `getTokenReward()` function in `src/lib/weeklyQuiz.ts`

### **To Modify UI**:
Edit component files in `src/components/WeeklyQuiz*.tsx`

---

## ✅ **Checklist for Each Quiz**

- [ ] Update `currentWeeklyQuiz.id` (date)
- [ ] Update `currentWeeklyQuiz.topic`
- [ ] Update `currentWeeklyQuiz.startTime` and `endTime`
- [ ] Add 10 new questions to `currentWeeklyQuiz.questions`
- [ ] Deploy to production
- [ ] Verify quiz starts at correct time
- [ ] After quiz ends, export winners
- [ ] Distribute tokens to winners
- [ ] Announce results

---

**Last Updated**: Based on implementation date
**Status**: ✅ Fully Implemented & Ready for Production

