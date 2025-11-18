# 🎰 Bet Mode Setup Guide

Complete guide for setting up and configuring Bet Mode.

## 📋 Prerequisites

1. MongoDB database configured
2. Base L2 RPC URL configured
3. QT Token contract address
4. Platform wallet with QT tokens
5. Wallet private key for withdrawals/burns

## 🔧 Environment Variables

Add these to your `.env.local`:

```bash
# Existing variables
MONGODB_URI=your_mongodb_connection_string
BASE_RPC_URL=https://mainnet.base.org
QT_TOKEN_ADDRESS=0xYourQTTokenAddress
WALLET_PRIVATE_KEY=your_wallet_private_key

# NEW: Bet Mode specific
PLATFORM_WALLET_ADDRESS=0xYourPlatformHotWalletAddress
CRON_SECRET=your_random_secret_string_for_cron_auth
ADMIN_API_KEY=your_admin_api_key_for_manual_triggers
```

## 📊 Database Migration

### Step 1: Add QT fields to existing accounts

Run this migration script (or manually update):

```javascript
// scripts/migrate-bet-mode-accounts.js
const { MongoClient } = require('mongodb');

async function migrate() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'quiz_trivia');
  const accounts = db.collection('currency_accounts');

  const result = await accounts.updateMany(
    {},
    {
      $set: {
        qtBalance: 0,
        qtLockedBalance: 0,
        qtTotalDeposited: 0,
        qtTotalWithdrawn: 0,
        qtTotalWagered: 0,
        qtTotalWon: 0,
      },
    }
  );

  console.log(`✅ Updated ${result.modifiedCount} accounts`);
  await client.close();
}

migrate().catch(console.error);
```

### Step 2: Create collections

Collections are created automatically on first use, but you can verify:

- `bet_mode_questions` - Questions for Bet Mode
- `bet_mode_games` - Active and completed games
- `lottery_tickets` - User lottery tickets per week
- `weekly_pools` - Weekly lottery pools and burn tracking
- `qt_transactions` - All QT token transactions
- `burn_records` - Historical burn records

## 🎯 Question Setup

### Option 1: Use Admin API

```bash
# Seed questions via API
curl -X POST https://your-domain.com/api/admin/questions/seed \
  -H "x-admin-key: your_admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "id": "q1",
        "text": "What is the capital of France?",
        "options": ["London", "Berlin", "Paris", "Madrid"],
        "correctIndex": 2,
        "difficulty": "easy",
        "explanation": "Paris is the capital of France.",
        "isActive": true
      }
      // ... add 100+ more questions
    ]
  }'
```

### Option 2: Direct MongoDB Insert

```javascript
const questions = [
  // Your 100+ questions here
];

await db.collection('bet_mode_questions').insertMany(
  questions.map(q => ({
    ...q,
    createdAt: Date.now(),
  }))
);
```

### Question Difficulty Distribution

For proper game flow, ensure you have:
- **Easy/Medium**: 40+ questions (for Q1-Q4)
- **Hard**: 30+ questions (for Q5-Q7)
- **Expert**: 30+ questions (for Q8-Q10)

## ⚙️ Vercel Cron Setup

Cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/snapshot",
      "schedule": "0 11 * * 5"  // Friday 11 AM UTC
    },
    {
      "path": "/api/cron/lottery-draw",
      "schedule": "0 14 * * 5"  // Friday 2 PM UTC
    },
    {
      "path": "/api/cron/burn",
      "schedule": "30 14 * * 5"  // Friday 2:30 PM UTC
    }
  ]
}
```

**Important**: After deploying to Vercel, verify cron jobs are active in the Vercel dashboard.

## 🔐 Manual Trigger Endpoints

If cron fails, you can manually trigger:

```bash
# Snapshot
curl -X POST https://your-domain.com/api/admin/trigger-snapshot \
  -H "x-admin-key: your_admin_api_key"

# Lottery Draw
curl -X POST https://your-domain.com/api/admin/trigger-lottery-draw \
  -H "x-admin-key: your_admin_api_key"

# Burn
curl -X POST https://your-domain.com/api/admin/trigger-burn \
  -H "x-admin-key: your_admin_api_key"
```

## 💰 Platform Wallet Setup

### 1. Create Hot Wallet

Use a secure wallet (multi-sig recommended) for:
- User withdrawals
- Lottery prize distribution
- Weekly burns

### 2. Fund Wallet

Deposit QT tokens to platform wallet:
- **Minimum**: 100-150M QT (for 2-3 bad weeks)
- **Recommended**: 200M+ QT (for safety buffer)

### 3. Configure Address

Set `PLATFORM_WALLET_ADDRESS` in environment variables.

## 🎮 Testing Checklist

### Before Launch:

- [ ] Database migration completed
- [ ] 100+ questions seeded
- [ ] Environment variables set
- [ ] Platform wallet funded
- [ ] Cron jobs verified in Vercel
- [ ] Test deposit flow
- [ ] Test withdrawal flow
- [ ] Test game flow (win/loss/cash-out)
- [ ] Test lottery ticket accumulation
- [ ] Test manual cron triggers
- [ ] Verify window open/close logic

### Test Scenarios:

1. **Deposit**: User sends QT → Verify balance updates
2. **Start Game**: Bet 10K QT → Verify balance locked
3. **Win Game**: Answer all 10 correctly → Verify payout
4. **Lose Game**: Wrong answer → Verify loss distribution
5. **Cash Out**: Cash out at Q7 → Verify payout
6. **Lottery**: Play multiple games → Verify tickets accumulate
7. **Withdrawal**: Withdraw QT → Verify blockchain transaction

## 📅 Weekly Schedule

- **Wednesday 11:00 AM UTC**: Window opens
- **Friday 11:00 AM UTC**: Window closes, snapshot taken
- **Friday 2:00 PM UTC**: Lottery draw
- **Friday 2:30 PM UTC**: Burn execution

## 🐛 Troubleshooting

### Cron Jobs Not Running

1. Check Vercel dashboard → Cron Jobs
2. Verify `CRON_SECRET` matches in env vars
3. Check cron logs in Vercel
4. Use manual triggers as backup

### Deposit Not Crediting

1. Verify transaction on Basescan
2. Check `PLATFORM_WALLET_ADDRESS` matches
3. Verify ERC20 transfer event parsing
4. Check transaction logs in database

### Withdrawal Failing

1. Verify platform wallet has QT balance
2. Check gas fees available
3. Verify `WALLET_PRIVATE_KEY` is correct
4. Check RPC connection

### Questions Not Loading

1. Verify questions exist in database
2. Check difficulty distribution
3. Verify `isActive: true` on questions
4. Check API logs for errors

## 📊 Monitoring

### Key Metrics to Track:

- Total QT wagered per week
- Win/loss ratio
- Lottery pool size
- Burn amounts
- Active users
- Average bet size

### Database Queries:

```javascript
// Weekly stats
db.weekly_pools.findOne({ weekId: "2025-W47" });

// User stats
db.currency_accounts.findOne({ fid: 12345 });

// Active games
db.bet_mode_games.find({ status: "active" });

// Lottery tickets
db.lottery_tickets.find({ weekId: "2025-W47" }).sort({ totalTickets: -1 });
```

## 🚀 Launch Checklist

1. ✅ All environment variables set
2. ✅ Database migrated
3. ✅ Questions seeded (100+)
4. ✅ Platform wallet funded (200M+ QT)
5. ✅ Cron jobs active
6. ✅ Test transactions successful
7. ✅ UI tested on mobile/desktop
8. ✅ Documentation shared with team

## 📞 Support

For issues or questions:
- Check API logs in Vercel
- Review database collections
- Test with manual triggers
- Verify blockchain transactions on Basescan

---

**Ready to launch! 🎰**

