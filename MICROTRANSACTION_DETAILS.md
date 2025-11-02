# 💰 Microtransaction Integration - Complete Details

This document provides **every detail** regarding microtransactions and how they're integrated in the Weekly and Timed mode buttons.

---

## 📋 **Overview**

The quiz trivia application uses **TWO types of microtransactions**:

1. **Blockchain Transactions** (on Base Mainnet) - Currently **FREE** (0 ETH)
2. **In-App Currency System** - Deducts virtual coins for entry

Both systems are integrated into the button click handlers for **Weekly Mode** and **Time Mode**.

---

## 🎯 **Microtransaction Architecture**

### **Dual Payment System**

Both Weekly and Timed modes implement a **dual payment verification**:
- ✅ **Blockchain verification** via smart contract (authentication + proof)
- ✅ **In-app currency deduction** (game economics)

This ensures users have both:
- A blockchain transaction record (on-chain proof)
- Sufficient in-app currency balance (game balance)

---

## 1️⃣ **Weekly Mode Microtransaction**

### **Location**: `src/components/ui/tabs/HomeTab.tsx` (Lines 352-373)

### **Integration Flow**:

```
User clicks "Weekly Quiz Challenge" button
    ↓
WeeklyQuizStartButton component handles click
    ↓
Shows details modal → User confirms → handleStartQuizConfirmed()
    ↓
1. Blockchain Transaction (via startQuizTransactionWithWagmi)
    ↓
2. In-App Currency Deduction (via /api/currency/spend)
    ↓
3. Quiz starts
```

### **A. Blockchain Transaction**

**Function**: `startQuizTransactionWithWagmi(QuizMode.CLASSIC, config, ...)`

**Location**: `src/lib/wallet.ts` (Lines 88-186)

**Contract Details**:
- **Contract Address**: `0xAa23aCDaf5B0B7C2eBF2ff0E059c85bbD33FA7fd`
- **Network**: Base Mainnet (Chain ID: 8453)
- **Function Called**: `startQuiz(QuizMode.CLASSIC)` (mode = 0)
- **Current Fee**: **0 ETH** (FREE)

**Implementation**:
```typescript
// src/components/WeeklyQuizStartButton.tsx (Lines 84-87)
const txHash = await startQuizTransactionWithWagmi(
  QuizMode.CLASSIC, 
  config, 
  (state) => {
    setTransactionState(state);
  }
);
```

**Transaction Flow**:
1. **CONNECTING** - Checks wallet connection
2. **CONFIRMING** - Sends transaction to Base Mainnet
3. **SUCCESS** - Transaction confirmed, emits `QuizStarted` event
4. **ERROR** - If transaction fails

**Transaction States**:
- `TransactionState.CONNECTING` 🔗
- `TransactionState.CONFIRMING` ⏳
- `TransactionState.SUCCESS` ✅
- `TransactionState.ERROR` ❌

**Smart Contract** (`contracts/QuizTriviaEntry.sol`):
```solidity
// Lines 36-38
uint256 public constant CLASSIC_FEE = 0.000000 ether;  // Currently FREE

// Lines 60-79
function startQuiz(QuizMode mode) external payable {
    uint256 requiredFee = getRequiredFee(mode);
    require(msg.value >= requiredFee, "Insufficient payment");
    
    // Update statistics
    userQuizCount[msg.sender]++;
    modeCount[mode]++;
    totalQuizzes++;
    totalFeesCollected += requiredFee;
    
    emit QuizStarted(msg.sender, uint256(mode), block.timestamp, requiredFee);
    
    // Refund excess payment
    if (msg.value > requiredFee) {
        payable(msg.sender).transfer(msg.value - requiredFee);
    }
}
```

**Gas Requirements**:
- Minimum balance: `0.00001 ETH` (for gas fees only)
- Base network has very cheap gas (~$0.00001 per transaction)

**Error Handling**:
- Wallet not connected
- Wrong network (must be Base Mainnet)
- Insufficient gas balance
- User rejection
- Network errors

### **B. In-App Currency Deduction**

**API Endpoint**: `/api/currency/spend`

**Location**: `src/app/api/currency/spend/route.ts`

**Amount**: **15 coins**

**Integration**:
```typescript
// src/components/ui/tabs/HomeTab.tsx (Lines 354-370)
onQuizStart={async () => {
  try {
    const fid = context?.user?.fid;
    if (fid) {
      const res = await fetch('/api/currency/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fid, 
          amount: 15, 
          reason: 'weekly_entry' 
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d?.error || 'Insufficient balance');
        return;
      }
    }
  } catch (_e) {}
  onStartWeeklyQuiz();
}}
```

**API Implementation**:
```typescript
// src/app/api/currency/spend/route.ts (Lines 6-41)
export async function POST(request: Request) {
  const { fid, amount, reason, refId } = await request.json();
  
  // Validate
  if (!nfid || !namount || namount <= 0) {
    return NextResponse.json({ error: 'fid and positive amount required' }, { status: 400 });
  }

  // Get collections
  const accounts = await getCurrencyAccountsCollection();
  const txns = await getCurrencyTxnsCollection();

  // Ensure account exists (initialize with 50 if new)
  const acct = await accounts.findOne({ fid: nfid });
  if (!acct) {
    await accounts.insertOne({ 
      fid: nfid, 
      balance: 50, 
      dailyStreakDay: 0, 
      createdAt: now, 
      updatedAt: now 
    });
  }

  // Deduct balance atomically (only if sufficient balance)
  const updateResult = await accounts.updateOne(
    { fid: nfid, balance: { $gte: namount } },
    { $inc: { balance: -namount }, $set: { updatedAt: now } }
  );

  if (!updateResult.matchedCount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  // Record transaction
  await txns.insertOne({ 
    fid: nfid, 
    amount: -namount, 
    reason: reason || 'other', 
    refId, 
    createdAt: now 
  });

  const fresh = await accounts.findOne({ fid: nfid });
  return NextResponse.json({ 
    success: true, 
    balance: fresh?.balance ?? 0 
  });
}
```

**Transaction Record**:
- **Reason**: `'weekly_entry'`
- **Amount**: `-15` (deduction)
- **Timestamp**: Current timestamp
- **Reference ID**: Optional refId

**Database Collections**:
- `CurrencyAccountDocument` - User balances
- `CurrencyTxnDocument` - Transaction history

**Error Handling**:
- Invalid fid
- Insufficient balance
- Negative amount
- Database errors

### **C. Button Component**

**Component**: `WeeklyQuizStartButton`

**Location**: `src/components/WeeklyQuizStartButton.tsx`

**Button States**:
- **Upcoming**: `'Weekly Quiz Challenge 📅'` (purple gradient)
- **Live**: `'Weekly Quiz Challenge 🔴 LIVE'` (red gradient, pulsing animation)
- **Ended**: `'Weekly Quiz Challenge ⏹️'` (gray gradient)
- **Completed**: `'Weekly Quiz Challenge ✓'` (green gradient)

**Button Flow**:
1. User clicks button → Opens details modal
2. User clicks "Start Quiz" in modal → `handleStartQuizConfirmed()`
3. Blockchain transaction starts → Transaction modal shows progress
4. On success → Currency deduction happens in `onQuizStart` callback
5. Quiz screen loads → User starts quiz

**Visual Feedback**:
- Button shows transaction state icons: 🔗 ⏳ ✅ ❌
- Live state shows pulsing glow animation
- Transaction modal shows progress/errors

---

## 2️⃣ **Time Mode Microtransaction**

### **Location**: `src/components/QuizStartButton.tsx` + `src/components/ui/tabs/HomeTab.tsx`

### **Integration Flow**:

```
User clicks "Time Mode ⏱️" button
    ↓
QuizStartButton component handles click
    ↓
handleStartQuiz() called
    ↓
1. Blockchain Transaction (via startQuizTransactionWithWagmi)
    ↓
2. onStartTimeMode callback → TimeModePage loads
    ↓
3. startRun() in TimeModePage → In-App Currency Deduction (via /api/time/start)
    ↓
4. Quiz starts
```

### **A. Blockchain Transaction**

**Function**: `startQuizTransactionWithWagmi(QuizMode.TIME_MODE, config, ...)`

**Location**: `src/lib/wallet.ts` (Lines 88-186)

**Contract Details**:
- **Contract Address**: `0xAa23aCDaf5B0B7C2eBF2ff0E059c85bbD33FA7fd`
- **Network**: Base Mainnet (Chain ID: 8453)
- **Function Called**: `startQuiz(QuizMode.TIME_MODE)` (mode = 1)
- **Current Fee**: **0 ETH** (FREE)

**Implementation**:
```typescript
// src/components/QuizStartButton.tsx (Lines 47-66)
const handleStartQuiz = async () => {
  try {
    setError('');
    setIsModalOpen(true);
    setTransactionState(TransactionState.CONNECTING);
    
    // Start the quiz with signature-based authentication (NO PAYMENT REQUIRED)
    const txHash = await startQuizTransactionWithWagmi(
      mode,  // QuizMode.TIME_MODE
      config, 
      (state) => {
        setTransactionState(state);
      }
    );
    
    setTransactionHash(txHash);
    
    // Wait a moment to show success state
    setTimeout(() => {
      setIsModalOpen(false);
      setTransactionState(TransactionState.IDLE);
      // Start the actual quiz
      onQuizStart();  // Calls onStartTimeMode
    }, 2000);
    
  } catch (err) {
    // Error handling...
  }
};
```

**Transaction States**: Same as Weekly Mode (CONNECTING → CONFIRMING → SUCCESS)

**Smart Contract**:
```solidity
// contracts/QuizTriviaEntry.sol (Lines 37-38)
uint256 public constant TIME_MODE_FEE = 0.000000 ether;  // Currently FREE
```

### **B. In-App Currency Deduction**

**API Endpoint**: `/api/time/start`

**Location**: `src/app/api/time/start/route.ts`

**Amount**: **10 coins**

**Integration**:
```typescript
// src/components/ui/tabs/HomeTab.tsx - TimeModePage (Lines 754-778)
const startRun = useCallback(async () => {
  try {
    setError(null);
    const res = await fetch('/api/time/start', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ fid: context?.user?.fid }) 
    });
    const d = await res.json();
    if (!res.ok || !d?.success) {
      setError(d?.error || 'Unable to start Time Mode');
      return;
    }
    setTimeLeft(d.durationSec || 45);
    setStarted(true);
    
    // Fetch and shuffle questions...
  } catch (_e) {
    setError('Network error');
  }
}, [context?.user?.fid, fetchMoreQuestions, questions.length, shuffleArray]);
```

**API Implementation**:
```typescript
// src/app/api/time/start/route.ts (Lines 6-42)
const ENTRY_COST = 10; // coins per Time Mode run

export async function POST(request: Request) {
  const { fid } = await request.json();
  
  // Validate
  if (!nfid || Number.isNaN(nfid)) {
    return NextResponse.json({ error: 'fid required' }, { status: 400 });
  }

  const accounts = await getCurrencyAccountsCollection();
  const txns = await getCurrencyTxnsCollection();

  // Ensure account exists (initialize with 50 if new)
  const acct = await accounts.findOne({ fid: nfid });
  if (!acct) {
    await accounts.insertOne({ 
      fid: nfid, 
      balance: 50, 
      dailyStreakDay: 0, 
      createdAt: now, 
      updatedAt: now 
    });
  }

  // Deduct balance atomically (only if sufficient balance)
  const updateResult = await accounts.updateOne(
    { fid: nfid, balance: { $gte: ENTRY_COST } },
    { $inc: { balance: -ENTRY_COST }, $set: { updatedAt: now } }
  );

  if (!updateResult.matchedCount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  // Record transaction
  const sessionId = `time_${nfid}_${now}`;
  await txns.insertOne({ 
    fid: nfid, 
    amount: -ENTRY_COST, 
    reason: 'time_entry', 
    refId: sessionId, 
    createdAt: now 
  });

  const fresh = await accounts.findOne({ fid: nfid });
  return NextResponse.json({ 
    success: true, 
    sessionId, 
    balance: fresh?.balance ?? 0, 
    durationSec: 45 
  });
}
```

**Transaction Record**:
- **Reason**: `'time_entry'`
- **Amount**: `-10` (deduction)
- **Session ID**: `time_{fid}_{timestamp}`
- **Reference ID**: Session ID used as refId

**Response**:
- `success`: Boolean
- `sessionId`: Unique session identifier
- `balance`: Updated balance
- `durationSec`: 45 seconds (quiz duration)

### **C. Button Component**

**Component**: `QuizStartButton`

**Location**: `src/components/QuizStartButton.tsx`

**Button Display**:
- **Text**: `'Time Mode ⏱️'`
- **Gradient**: Green to blue (`from-green-500 to-blue-600`)
- **Hover**: Darker gradient (`hover:from-green-600 hover:to-blue-700`)

**Button Flow**:
1. User clicks button → `handleStartQuiz()` called
2. Blockchain transaction starts → Transaction modal shows
3. On success → `onStartTimeMode()` callback (loads TimeModePage)
4. TimeModePage mounts → `startRun()` called automatically
5. Currency deduction happens → Quiz starts with 45-second timer

**Visual Feedback**:
- Button shows transaction state icons: 🔗 ⏳ ✅ ❌
- Transaction modal shows progress/errors
- Button disabled during transaction

---

## 3️⃣ **Microtransaction Comparison**

| Feature | Weekly Mode | Time Mode |
|---------|------------|-----------|
| **Blockchain Fee** | 0 ETH (FREE) | 0 ETH (FREE) |
| **In-App Currency Cost** | 15 coins | 10 coins |
| **Blockchain Network** | Base Mainnet (8453) | Base Mainnet (8453) |
| **Contract Mode** | CLASSIC (0) | TIME_MODE (1) |
| **Transaction Flow** | Button → Modal → Transaction → Currency → Quiz | Button → Transaction → Page → Currency → Quiz |
| **Currency API** | `/api/currency/spend` | `/api/time/start` |
| **Transaction Reason** | `'weekly_entry'` | `'time_entry'` |
| **Currency Deduction Timing** | After blockchain success | After page load |

---

## 4️⃣ **Smart Contract Details**

### **Contract**: `QuizTriviaEntry.sol`

**Location**: `contracts/QuizTriviaEntry.sol`

**Deployment**:
- **Address**: `0xAa23aCDaf5B0B7C2eBF2ff0E059c85bbD33FA7fd`
- **Network**: Base Mainnet
- **Chain ID**: 8453

**Entry Fees** (Currently all FREE):
```solidity
uint256 public constant CLASSIC_FEE = 0.000000 ether;      // ~$0.0000001
uint256 public constant TIME_MODE_FEE = 0.000000 ether;   // ~$0.0000001
uint256 public constant CHALLENGE_FEE = 0.000000 ether;    // ~$0.0000001
```

**Quiz Modes**:
```solidity
enum QuizMode {
    CLASSIC,    // 0
    TIME_MODE,  // 1
    CHALLENGE   // 2
}
```

**Events Emitted**:
```solidity
event QuizStarted(
    address indexed user,
    uint256 indexed mode,
    uint256 timestamp,
    uint256 feePaid
);
```

**Statistics Tracked**:
- `userQuizCount[address]` - Quizzes per user
- `modeCount[QuizMode]` - Quizzes per mode
- `totalQuizzes` - Total quizzes started
- `totalFeesCollected` - Total fees collected (currently 0)

**Function**: `startQuiz(QuizMode mode)`
- Requires: `msg.value >= getRequiredFee(mode)` (currently 0)
- Updates: Statistics and emits event
- Refunds: Excess payment if sent

---

## 5️⃣ **Currency System Details**

### **Database Collections**

**CurrencyAccountDocument**:
```typescript
interface CurrencyAccountDocument {
  fid: number;
  balance: number;
  dailyStreakDay: number;
  lastDailyBaseAt?: number;  // For daily 50 coin grant
  createdAt: number;
  updatedAt: number;
}
```

**CurrencyTxnDocument**:
```typescript
interface CurrencyTxnDocument {
  fid: number;
  amount: number;  // Positive or negative
  reason: 'time_entry' | 'challenge_entry' | 'win_reward' | 'daily_claim' | 
         'spin_wheel' | 'admin_adjust' | 'other' | 'weekly_entry';
  refId?: string;  // Optional reference (session ID, etc.)
  createdAt: number;
}
```

**Allowed Reasons**:
- `'time_entry'` - Time Mode entry (10 coins)
- `'weekly_entry'` - Weekly Mode entry (15 coins)
- `'challenge_entry'` - Challenge Mode entry
- `'win_reward'` - Prize winnings
- `'daily_claim'` - Daily coin claim
- `'spin_wheel'` - Spin the wheel reward
- `'admin_adjust'` - Admin adjustment
- `'other'` - Other transactions

**Account Initialization**:
- New accounts start with **50 coins**
- Applied automatically on first transaction
- Daily grant of 50 coins available via `/api/currency/balance`

---

## 6️⃣ **Transaction Flow Diagrams**

### **Weekly Mode Flow**:

```
┌─────────────────────────────────────────────────┐
│  User clicks "Weekly Quiz Challenge" button   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  WeeklyQuizStartButton: handleStartQuiz()       │
│  → Opens details modal                         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  User clicks "Start Quiz" in modal             │
│  → handleStartQuizConfirmed()                  │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Blockchain Transaction                         │
│  startQuizTransactionWithWagmi(CLASSIC)        │
│  → Transaction State: CONNECTING                │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Transaction State: CONFIRMING                  │
│  → Transaction sent to Base Mainnet             │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Transaction State: SUCCESS                      │
│  → Transaction confirmed on blockchain         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  onQuizStart callback (HomeTab.tsx)            │
│  → Calls /api/currency/spend                    │
│  → Deducts 15 coins                            │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Quiz Starts                                     │
│  → WeeklyQuizPage loads                         │
└─────────────────────────────────────────────────┘
```

### **Time Mode Flow**:

```
┌─────────────────────────────────────────────────┐
│  User clicks "Time Mode ⏱️" button              │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  QuizStartButton: handleStartQuiz()             │
│  → Opens transaction modal                      │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Blockchain Transaction                         │
│  startQuizTransactionWithWagmi(TIME_MODE)       │
│  → Transaction State: CONNECTING                │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Transaction State: CONFIRMING                  │
│  → Transaction sent to Base Mainnet             │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Transaction State: SUCCESS                      │
│  → Transaction confirmed on blockchain         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  onStartTimeMode callback (HomeTab.tsx)         │
│  → Sets currentScreen to 'time'                 │
│  → TimeModePage component loads                 │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  TimeModePage: startRun()                       │
│  → Calls /api/time/start                        │
│  → Deducts 10 coins                             │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Quiz Starts                                     │
│  → 45-second timer starts                       │
└─────────────────────────────────────────────────┘
```

---

## 7️⃣ **Error Handling**

### **Blockchain Transaction Errors**:

**Wallet Not Connected**:
- Error: `"Please connect your wallet first"`
- Solution: User must connect wallet (MetaMask, Farcaster Frame Wallet, etc.)

**Wrong Network**:
- Error: `"Please switch to Base Mainnet to start a quiz"`
- Solution: User must switch to Base Mainnet (Chain ID: 8453)

**Insufficient Gas Balance**:
- Error: `"Insufficient balance for gas fees. You need at least 0.00001 ETH for transaction gas."`
- Solution: User needs ETH for gas (Base network is very cheap!)

**User Rejection**:
- Error: `"You rejected the transaction. Please try again and approve the transaction."`
- Solution: User must approve transaction in wallet

**Network Errors**:
- Error: `"Network error. Please check your connection and try again."`
- Solution: Check internet connection, retry

### **Currency System Errors**:

**Insufficient Balance**:
- Error: `"Insufficient balance"`
- Solution: User needs more coins (earn via daily claim, spin wheel, etc.)

**Invalid FID**:
- Error: `"fid required"` or `"Invalid fid"`
- Solution: User must be authenticated (Farcaster user)

**Database Errors**:
- Error: `"Failed to spend"` or `"Failed to start time mode"`
- Solution: Server-side issue, retry later

---

## 8️⃣ **Button Component Details**

### **WeeklyQuizStartButton**

**File**: `src/components/WeeklyQuizStartButton.tsx`

**Props**:
```typescript
interface WeeklyQuizStartButtonProps {
  quizState: QuizState;  // 'upcoming' | 'live' | 'ended'
  onQuizStart: () => void;
  userCompleted?: boolean;
  className?: string;
}
```

**States**:
- `transactionState` - Blockchain transaction state
- `isModalOpen` - Transaction modal visibility
- `isDetailsModalOpen` - Details modal visibility
- `error` - Error message
- `transactionHash` - Blockchain transaction hash

**Features**:
- Details modal showing quiz info, rewards, scoring rules
- Transaction modal showing blockchain progress
- State-based button text and styling
- Pulsing glow animation for live quiz state
- Farcaster frame transaction support

### **QuizStartButton**

**File**: `src/components/QuizStartButton.tsx`

**Props**:
```typescript
interface QuizStartButtonProps {
  mode: QuizMode;
  modeName: string;
  onQuizStart: () => void;
  className?: string;
}
```

**States**:
- `transactionState` - Blockchain transaction state
- `isModalOpen` - Transaction modal visibility
- `error` - Error message
- `transactionHash` - Blockchain transaction hash

**Features**:
- Transaction modal showing blockchain progress
- Mode-based button text and styling
- Farcaster frame transaction support
- Automatic quiz start after transaction success

---

## 9️⃣ **API Endpoints Summary**

### **Blockchain Transaction**
- **Function**: `startQuizTransactionWithWagmi()`
- **Location**: `src/lib/wallet.ts`
- **Type**: Client-side wallet interaction
- **Network**: Base Mainnet (8453)

### **Currency Spending - Weekly Mode**
- **Endpoint**: `POST /api/currency/spend`
- **Location**: `src/app/api/currency/spend/route.ts`
- **Request**:
  ```json
  {
    "fid": 12345,
    "amount": 15,
    "reason": "weekly_entry"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "balance": 35
  }
  ```

### **Currency Spending - Time Mode**
- **Endpoint**: `POST /api/time/start`
- **Location**: `src/app/api/time/start/route.ts`
- **Request**:
  ```json
  {
    "fid": 12345
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "sessionId": "time_12345_1704067200000",
    "balance": 40,
    "durationSec": 45
  }
  ```

---

## 🔟 **Key Implementation Files**

| Component/Function | File | Purpose |
|-------------------|------|---------|
| **WeeklyQuizStartButton** | `src/components/WeeklyQuizStartButton.tsx` | Weekly mode button with blockchain + currency |
| **QuizStartButton** | `src/components/QuizStartButton.tsx` | Time mode button with blockchain transaction |
| **Blockchain Transaction** | `src/lib/wallet.ts` | Smart contract interaction |
| **Currency Spend API** | `src/app/api/currency/spend/route.ts` | Weekly mode currency deduction |
| **Time Start API** | `src/app/api/time/start/route.ts` | Time mode currency deduction |
| **Smart Contract** | `contracts/QuizTriviaEntry.sol` | On-chain quiz entry contract |
| **Home Page** | `src/components/ui/tabs/HomeTab.tsx` | Button integration and callbacks |
| **Transaction Modal** | `src/components/TransactionModal.tsx` | UI for transaction progress |

---

## 1️⃣1️⃣ **Summary**

### **Weekly Mode**:
- ✅ Blockchain transaction: **FREE** (0 ETH)
- ✅ In-app currency: **15 coins**
- ✅ Transaction flow: Button → Modal → Blockchain → Currency → Quiz

### **Time Mode**:
- ✅ Blockchain transaction: **FREE** (0 ETH)
- ✅ In-app currency: **10 coins**
- ✅ Transaction flow: Button → Blockchain → Page → Currency → Quiz

### **Both Modes**:
- ✅ Use Base Mainnet smart contract for blockchain verification
- ✅ Use MongoDB for in-app currency tracking
- ✅ Require sufficient balance for both blockchain gas and in-app currency
- ✅ Provide visual feedback during transaction processing
- ✅ Handle errors gracefully with user-friendly messages

---

**Last Updated**: Based on current codebase state

**Current Status**:
- **Blockchain Fees**: ✅ FREE (0 ETH) - Only gas required
- **Currency Costs**: ✅ Active (15 coins for Weekly, 10 coins for Time)
- **Network**: ✅ Base Mainnet (Chain ID: 8453)
- **Contract**: ✅ Deployed at `0xAa23aCDaf5B0B7C2eBF2ff0E059c85bbD33FA7fd`

