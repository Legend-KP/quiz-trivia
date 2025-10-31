# ⏱️ Weekly Mode Timer & Countdown - Complete Details

This document provides **every detail** related to timers and countdowns in Weekly Quiz mode.

> ⚠️ **Note**: Line numbers in this document are approximate and may vary based on code changes. Use code search to locate exact implementations.

> 📅 **Schedule Confirmation**: Quiz runs on **Tuesday & Friday** at **6 PM - 6 AM UTC** (12-hour windows)

---

## 📋 **Overview**

Weekly Quiz mode implements **multiple timer systems**:
1. **Per-Question Timer** - 45 seconds per question
2. **Inter-Question Countdown** - 10 seconds between questions
3. **Quiz State Countdowns** - For upcoming/live/ended states
4. **Total Duration Tracking** - Tracks total quiz completion time

---

## 1️⃣ **Per-Question Timer (45 seconds)**

### **Location**: `src/components/WeeklyQuizPage.tsx`

### **Implementation Details**:

**State Management**:
```typescript
const [timeLeft, setTimeLeft] = useState(config.questions[0].timeLimit);
```
- Initialized to first question's `timeLimit` (45 seconds)
- Reset to next question's `timeLimit` when advancing to next question

**Timer Configuration** (`weeklyQuiz.ts`):
```typescript
timeLimit: 45  // 45 seconds per question
```
- **All questions use 45 seconds**
- Defined in `QuizQuestion` interface

**Timer Logic**:
```typescript
useEffect(() => {
  if (!started) return;
  if (timeLeft > 0 && !showResult && !waitingForNext) {
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  } else if (timeLeft === 0 && !waitingForNext) {
    handleTimeUp();
  }
}, [timeLeft, showResult, waitingForNext, handleTimeUp, started]);
```

**How It Works**:
- ✅ Decrements every **1 second** (`setTimeout(..., 1000)`)
- ✅ Only runs when: `started === true`, `timeLeft > 0`, `!showResult`, `!waitingForNext`
- ✅ When `timeLeft === 0`, calls `handleTimeUp()` which submits `null` (timeout answer)

**Display**:
```typescript
<span className={timeLeft < 60 ? 'text-red-400 font-bold' : ''}>
  {formatTime(timeLeft)}
</span>
```
- Shows timer in header (with red color when < 60 seconds)
- Format: `MM:SS`

**Format Function**:
```typescript
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
```
- Converts seconds to `"0:45"`, `"0:30"`, `"0:05"` format

**Reset Logic**:
```typescript
setTimeLeft(config.questions[currentQuestion + 1].timeLimit);
```
- Resets to next question's `timeLimit` (always 45 seconds)
- Called when transitioning from inter-question countdown to next question

---

## 2️⃣ **Inter-Question Countdown (10 seconds)**

### **Location**: `src/components/WeeklyQuizPage.tsx`

### **Implementation Details**:

**State Management**:
```typescript
const [waitingForNext, setWaitingForNext] = useState(false);
const [nextQuestionTime, setNextQuestionTime] = useState<number | null>(null);
```

**Activation**:
```typescript
// Countdown for next question (10 seconds)
setTimeout(() => {
  setWaitingForNext(true);
  setNextQuestionTime(10);
}, 3000);
```
- ⏱️ **Waits 3 seconds** after showing result
- ⏱️ **Then starts 10-second countdown** to next question
- Only for questions that are **not the last question**

**Countdown Logic**:
```typescript
useEffect(() => {
  if (nextQuestionTime && nextQuestionTime > 0) {
    const timer = setTimeout(() => setNextQuestionTime(nextQuestionTime - 1), 1000);
    return () => clearTimeout(timer);
  } else if (nextQuestionTime === 0) {
    setCurrentQuestion(currentQuestion + 1);
    setTimeLeft(config.questions[currentQuestion + 1].timeLimit);
    setSelectedAnswer(null);
    setShowResult(false);
    setWaitingForNext(false);
    setNextQuestionTime(null);
  }
}, [nextQuestionTime, currentQuestion, config.questions]);
```

**How It Works**:
- ✅ Decrements every **1 second**
- ✅ When reaches `0`, advances to next question
- ✅ Resets all question state (answer, result, timer)

**Display**:
- Shows dedicated waiting screen
- Displays countdown: `"Next Question In: 0:10"`, `"0:09"`, etc.
- Shows current score and question progress

**Format Function**:
```typescript
const formatWaitTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
```

**Timing Sequence**:
1. User answers → Show result (3 seconds)
2. Wait screen appears → **10-second countdown** starts
3. After 10 seconds → Next question begins with fresh 45-second timer

---

## 3️⃣ **Quiz State Countdowns**

### **Location**: `src/hooks/useWeeklyQuiz.ts` (Hook) + `src/lib/weeklyQuiz.ts` (Format)

### **Three Different Countdowns Based on State**:

### **A. Upcoming State Countdown**
**When**: Quiz hasn't started yet
**Shows**: Time until quiz start (Tuesday/Friday 6 PM UTC)
**Target Time**: `config.startTime`

**Usage in `WeeklyQuizStartButton.tsx`**:
```typescript
const nextQuizTime = React.useMemo(() => {
  if (quizState === 'live') {
    return new Date(currentWeeklyQuiz.endTime);
  } else if (quizState === 'ended') {
    return getNextQuizStartTime();
  } else {
    // Upcoming: show time until this quiz starts
    return new Date(currentWeeklyQuiz.startTime);
  }
}, [quizState]);
```

**Countdown Hook** (`useWeeklyQuiz.ts`):
```typescript
export function useCountdown(targetTime: string | Date): string {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const target = typeof targetTime === 'string' 
        ? new Date(targetTime).getTime() 
        : targetTime.getTime();
      const diff = target - now;
      
      if (diff <= 0) return 'Starting...';
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    };
    
    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [targetTime]);
  
  return timeLeft;
}
```

**Format Examples**:
- `"3d 12h 45m 30s"` - 3 days, 12 hours, 45 minutes, 30 seconds
- `"2h 30m 15s"` - 2 hours, 30 minutes, 15 seconds
- `"45m 30s"` - 45 minutes, 30 seconds
- `"30s"` - 30 seconds
- `"Starting..."` - When time has passed

**Update Frequency**: Every **1 second** (`setInterval(..., 1000)`)

### **B. Live State Countdown**
**When**: Quiz is currently active
**Shows**: Time until quiz ends (6 AM UTC the next day)
**Target Time**: `config.endTime`

**Display in `WeeklyQuizStartButton.tsx`**:
```typescript
<p className={`text-xs font-medium ${stateInfo.textColor}`}>
  {stateInfo.message}: {countdown}
</p>
```
- Message: `"Ends in: 11h 30m 15s"`

**Display in `WeeklyQuizCard.tsx`**:
```typescript
<span className="text-red-600 font-bold text-lg">{countdown}</span>
```

#### **Grace Period Behavior (Live State)**

**When**: User starts quiz before 6 AM UTC but quiz is still in progress when window closes

**Behavior**:
- ✅ User who starts at 5:52 AM UTC can finish full quiz (~9 minutes total)
- ✅ Quiz completion at ~6:01 AM UTC still counts as valid submission
- ✅ No penalties or restrictions for finishing after window closes
- ✅ Leaderboard submission still valid if quiz was started during live window
- ✅ User gets full quiz duration regardless of window close time

**Implementation**: Once quiz starts, user gets full duration (10 questions × 45s + 9 × 10s waits ≈ 9 minutes) regardless of when the quiz window closes at 6 AM UTC.

**Example Timeline**:
- 5:52 AM UTC: User starts quiz
- 6:00 AM UTC: Quiz window closes (but user's quiz continues)
- ~6:01 AM UTC: User completes quiz
- ✅ Score is submitted to leaderboard (valid because started during live window)

### **C. Ended State Countdown**
**When**: Quiz has ended
**Shows**: Time until next quiz starts (next Tuesday or Friday)
**Target Time**: Result of `getNextQuizStartTime()`

**Calculation** (`weeklyQuiz.ts` - `getNextQuizStartTime()` function):
- **Production Mode** (ACTIVE): Calculates next Tuesday or Friday at 6 PM UTC
- Automatically determines next quiz day based on current date/time
- Handles all day transitions correctly (Sunday-Monday, Wednesday-Thursday, Saturday-Sunday)

**Display in `WeeklyQuizCard.tsx`**:
```typescript
<div className="text-blue-500 text-xs mt-1">Starts in: {countdown}</div>
```

---

## 4️⃣ **Total Duration Tracking**

### **Location**: `src/components/WeeklyQuizPage.tsx`

### **Implementation**:
```typescript
const [startTime] = useState<number>(Date.now());
```
- Captured when component mounts (quiz initialized)
- Used to calculate total time taken

**Calculation**:
```typescript
const totalTime = Math.floor((Date.now() - startTime) / 1000);
const timeString = `${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, '0')}`;
```

**When Calculated**:
- Only on **last question completion**
- After showing result for 3 seconds

**Format**:
- Seconds converted to `MM:SS` format
- Example: `"8:45"` = 8 minutes 45 seconds

**Passed to Callback**:
```typescript
onComplete(newScore, [...answers], timeString);
```
- Sent to parent component for leaderboard/result display

---

## 5️⃣ **Production Schedule & Timer Synchronization**

### ✅ **CURRENT STATE: Production Mode Active**

**Important Note**: The codebase **uses production mode** with real schedule. Testing mode has been removed.

**Production Mode** (ACTIVE in `src/lib/weeklyQuiz.ts`):

**Schedule**:
- **Quiz Days**: Tuesday & Friday
- **Start Time**: 6:00 PM UTC
- **End Time**: 6:00 AM UTC (next day)
- **Duration**: 12-hour quiz windows
- **Frequency**: 2 quizzes per week (104 per year)

**State Transitions**:
1. **UPCOMING**: Before quiz start → Countdown to 6 PM UTC
2. **LIVE**: 6 PM - 6 AM UTC → Countdown to quiz end
3. **ENDED**: After 6 AM UTC → Countdown to next quiz (Tuesday or Friday)

**Implementation Details**:
- Function: `getCurrentOrNextQuizDate()` - Calculates current live quiz or next upcoming quiz
- Function: `getNextQuizStartTime()` - Returns next Tuesday or Friday at 6 PM UTC
- Automatically handles quiz windows across midnight (Tuesday 6 PM → Wednesday 6 AM)
- **Implementation Location**: `src/lib/weeklyQuiz.ts`

---

## 6️⃣ **Timer Display Locations**

### **A. Quiz Page Header** (`WeeklyQuizPage.tsx`)
- Per-question timer (45 seconds countdown)
- Red text when < 60 seconds
- Format: `"0:45"`, `"0:30"`, `"0:05"`

### **B. Waiting Screen** (`WeeklyQuizPage.tsx`)
- Inter-question countdown (10 seconds)
- Format: `"Next Question In: 0:10"`

### **C. Start Button Details Modal** (`WeeklyQuizStartButton.tsx`)
- Quiz state countdown
- Shows: `"Starts in: 3d 12h 45m"` or `"Ends in: 11h 30m"`

### **D. Quiz Card Components** (`WeeklyQuizCard.tsx`)
- **Upcoming**: `"⏰ Starts In: 3d 12h"`
- **Live**: `"⏰ Ends In: 11h 30m"`
- **Ended**: `"Starts in: 2d 5h"`

---

## 7️⃣ **Timer Configuration Summary**

| Timer Type | Duration | Location | Update Frequency |
|------------|----------|----------|------------------|
| **Per-Question Timer** | 45 seconds | `WeeklyQuizPage.tsx` | Every 1 second |
| **Inter-Question Countdown** | 10 seconds | `WeeklyQuizPage.tsx` | Every 1 second |
| **Quiz State Countdown** | Variable | `useWeeklyQuiz.ts` | Every 1 second |
| **Total Duration** | Variable | `WeeklyQuizPage.tsx` | Calculated once at end |

---

## 8️⃣ **Timer-Related Functions**

### **formatTime()** (`WeeklyQuizPage.tsx`)
- Formats seconds to `MM:SS` for per-question timer
- Example: `45` → `"0:45"`

### **formatWaitTime()** (`WeeklyQuizPage.tsx`)
- Formats seconds to `MM:SS` for inter-question countdown
- Example: `10` → `"0:10"`

### **formatCountdown()** (`weeklyQuiz.ts`)
- Formats time difference to readable string
- Examples: `"3d 12h 45m 30s"`, `"2h 30m"`, `"45s"`

### **calculateTimeLeft()** (`useWeeklyQuiz.ts`)
- Calculates time remaining until target time
- Returns formatted countdown string

---

## 9️⃣ **Timer State Management**

### **Per-Question Timer States**:
```typescript
const [timeLeft, setTimeLeft] = useState(config.questions[0].timeLimit); // 45
const [showResult, setShowResult] = useState(false);
const [waitingForNext, setWaitingForNext] = useState(false);
```

### **Inter-Question Countdown States**:
```typescript
const [nextQuestionTime, setNextQuestionTime] = useState<number | null>(null); // 10
```

### **Quiz State Management**:
```typescript
const quizState = useQuizState(config); // 'upcoming' | 'live' | 'ended'
const countdown = useCountdown(targetTime); // Formatted string
```

---

## 🔟 **Timer Behavior Flow**

### **Question Answering Flow**:
1. Question appears → **45-second timer starts**
2. Timer decrements: `45 → 44 → 43 → ... → 1 → 0`
3. If user answers → Timer stops, show result (3 seconds)
4. If timer reaches `0` → Auto-submit `null` (timeout)
5. After result shown → **10-second countdown starts**
6. Countdown decrements: `10 → 9 → 8 → ... → 1 → 0`
7. Next question appears → **45-second timer resets and starts**

### **Quiz State Flow**:
1. **Upcoming**: Countdown to `startTime` (Tuesday/Friday 6 PM UTC)
2. **Live**: Countdown to `endTime` (12 hours later, 6 AM UTC)
3. **Ended**: Countdown to next `startTime` (next Tuesday or Friday)

---

## 1️⃣1️⃣ **Important Notes**

### **Timer Precision**:
- All timers update every **1 second** (1000ms intervals)
- Uses `setTimeout` and `setInterval` for browser compatibility
- Timers clean up properly on unmount (`clearTimeout`, `clearInterval`)

### **Timer Stopping Conditions**:
- Per-question timer stops when: `showResult === true` OR `waitingForNext === true`
- Inter-question countdown stops when: `nextQuestionTime === 0` (advances question)

### **Timeout Handling**:
- When per-question timer reaches `0`:
  - Calls `handleTimeUp()` → `handleAnswerSubmit(null)`
  - Score: `+0` (no penalty, no reward)
  - Display: `"⏰ Time's up! (0 points)"`

### **Production Schedule** (ACTIVE):
- Runs on **Tuesday & Friday**, 6 PM - 6 AM UTC (12-hour windows)
- Countdown automatically calculates next quiz start time using `getNextQuizStartTime()`
- State transitions: UPCOMING → LIVE → ENDED → UPCOMING (cycle repeats)
- Grace period allows users who start before 6 AM UTC to complete full quiz even after window closes
- Quiz windows span midnight: Tuesday 6 PM → Wednesday 6 AM, Friday 6 PM → Saturday 6 AM

---

## 📁 **File Locations Reference**

| Component | File | Purpose |
|-----------|------|---------|
| **Per-Question Timer** | `src/components/WeeklyQuizPage.tsx` | 45-second countdown per question |
| **Inter-Question Countdown** | `src/components/WeeklyQuizPage.tsx` | 10-second wait between questions |
| **Countdown Hook** | `src/hooks/useWeeklyQuiz.ts` | Reusable countdown timer hook |
| **Quiz State Hook** | `src/hooks/useWeeklyQuiz.ts` | Quiz state management |
| **Timer Configuration** | `src/lib/weeklyQuiz.ts` | Question time limits (45s) |
| **Countdown Display** | `src/components/WeeklyQuizStartButton.tsx` | Quiz state countdowns |
| **Countdown Display** | `src/components/WeeklyQuizCard.tsx` | Quiz card countdowns |

---

## ✅ **Summary**

Weekly mode implements **4 distinct timer systems**:

1. **✅ Per-Question Timer**: 45 seconds, decrements every second, auto-submits on timeout
2. **✅ Inter-Question Countdown**: 10 seconds between questions, shows waiting screen
3. **✅ Quiz State Countdowns**: Shows time until quiz starts/ends (upcoming/live/ended)
4. **✅ Total Duration**: Tracks total time taken, calculated at quiz completion

All timers update every **1 second** and properly clean up on component unmount.

---

---

**Last Updated**: Based on current codebase state

**Current Status**:
- **Production Mode**: ✅ ACTIVE
- **Testing Mode**: ❌ REMOVED (no longer exists in code)

**Production Schedule** (ACTIVE):
- **Days**: Tuesday & Friday
- **Time**: 6 PM - 6 AM UTC (12-hour windows)
- **Frequency**: 2 quizzes per week (104 per year)
- **Grace Period**: Users who start before 6 AM UTC can complete full quiz even after window closes

