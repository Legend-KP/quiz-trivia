# 🎰 Bet Mode Implementation Summary

## ✅ What's Been Built

### 1. **Database Schemas** ✅
- Extended `currency_accounts` with QT balance fields
- Created collections:
  - `bet_mode_questions` - Game questions
  - `bet_mode_games` - Active/completed games
  - `lottery_tickets` - User lottery tickets
  - `weekly_pools` - Weekly lottery pools
  - `qt_transactions` - Transaction history
  - `burn_records` - Burn history

### 2. **Core API Endpoints** ✅
- `/api/bet-mode/start` - Start a new game
- `/api/bet-mode/answer` - Answer a question
- `/api/bet-mode/cash-out` - Cash out early
- `/api/bet-mode/status` - Get user status
- `/api/bet-mode/deposit/verify` - Verify deposit transaction
- `/api/bet-mode/withdraw` - Withdraw QT tokens

### 3. **Lottery System** ✅
- Ticket accumulation (bet-based + game-based)
- Streak bonuses (3-day +10%, 7-day +50%)
- Weekly snapshot (Friday 11 AM UTC)
- Provably fair draw (Friday 2 PM UTC)
- Prize distribution (31 winners + consolation)

### 4. **Burn Mechanism** ✅
- Weekly accumulation (60% of losses)
- Batch burn execution (Friday 2:30 PM UTC)
- Blockchain verification

### 5. **Cron Jobs** ✅
- `/api/cron/snapshot` - Friday 11 AM UTC
- `/api/cron/lottery-draw` - Friday 2 PM UTC
- `/api/cron/burn` - Friday 2:30 PM UTC
- Manual trigger endpoints for admin

### 6. **UI Components** ✅
- Entry screen (bet selection)
- Game screen (questions with timer)
- Cash out screen (winning)
- Loss screen (with loss distribution)
- Lottery screen (ticket info)
- Closed screen (countdown to next window)

### 7. **Navigation** ✅
- Added Bet Mode tab to bottom navigation
- Integrated with existing app structure

## 📁 Files Created/Modified

### New Files:
- `src/lib/betMode.ts` - Utility functions
- `src/app/api/bet-mode/start/route.ts`
- `src/app/api/bet-mode/answer/route.ts`
- `src/app/api/bet-mode/cash-out/route.ts`
- `src/app/api/bet-mode/status/route.ts`
- `src/app/api/bet-mode/deposit/verify/route.ts`
- `src/app/api/bet-mode/withdraw/route.ts`
- `src/app/api/cron/snapshot/route.ts`
- `src/app/api/cron/lottery-draw/route.ts`
- `src/app/api/cron/burn/route.ts`
- `src/app/api/admin/trigger-snapshot/route.ts`
- `src/app/api/admin/trigger-lottery-draw/route.ts`
- `src/app/api/admin/trigger-burn/route.ts`
- `src/app/api/admin/questions/seed/route.ts`
- `src/app/api/admin/questions/list/route.ts`
- `src/components/ui/tabs/BetModeTab.tsx`
- `scripts/migrate-bet-mode-accounts.js`
- `BET_MODE_SETUP_GUIDE.md`

### Modified Files:
- `src/lib/mongodb.ts` - Added Bet Mode schemas
- `src/components/ui/tabs/index.ts` - Export BetModeTab
- `src/components/App.tsx` - Added Bet Mode tab
- `src/components/ui/BottomNavigation.tsx` - Added Bet Mode button
- `vercel.json` - Added cron jobs

## 🚀 Next Steps

### 1. **Environment Variables**
Add to `.env.local`:
```bash
PLATFORM_WALLET_ADDRESS=0xYourPlatformWallet
CRON_SECRET=random_secret_string
ADMIN_API_KEY=admin_secret_key
```

### 2. **Database Migration**
Run migration script:
```bash
node scripts/migrate-bet-mode-accounts.js
```

### 3. **Seed Questions**
Add 100+ questions via admin API or direct MongoDB insert.
See `BET_MODE_SETUP_GUIDE.md` for details.

### 4. **Fund Platform Wallet**
Deposit 200M+ QT tokens to platform wallet for:
- User withdrawals
- Lottery prizes
- Weekly burns

### 5. **Test Everything**
- [ ] Test deposit flow
- [ ] Test game flow (win/loss/cash-out)
- [ ] Test withdrawal flow
- [ ] Test lottery ticket accumulation
- [ ] Test manual cron triggers
- [ ] Verify window open/close logic

### 6. **Deploy to Vercel**
- Push to GitHub
- Deploy to Vercel
- Verify cron jobs are active
- Test in production

## 📊 Key Features

### Game Mechanics:
- ✅ Bet: 10K - 500K QT
- ✅ 10 questions (progressive difficulty)
- ✅ Cash out from Q5+
- ✅ Auto cash out at Q10 (20x)
- ✅ One wrong = lose all
- ✅ 30-second timer per question

### Loss Distribution:
- ✅ 60% burned 🔥
- ✅ 35% to lottery 🎰
- ✅ 5% to platform 💼

### Lottery System:
- ✅ Tickets = (Wagered ÷ 10K) + (Games × 0.5)
- ✅ Streak bonuses
- ✅ 31 winners + consolation
- ✅ Provably fair randomness

### Weekly Schedule:
- ✅ Wednesday 11 AM UTC: Window opens
- ✅ Friday 11 AM UTC: Window closes, snapshot
- ✅ Friday 2 PM UTC: Lottery draw
- ✅ Friday 2:30 PM UTC: Burn execution

## 🔧 Configuration

### Bet Limits:
- Min: 10,000 QT
- Max: 500,000 QT
- Min balance: 2x bet amount

### Multipliers:
- Q1: 1.1x
- Q2: 1.3x
- Q3: 1.6x
- Q4: 2.2x
- Q5: 3.0x
- Q6: 4.2x
- Q7: 6.5x
- Q8: 7.2x
- Q9: 8.5x
- Q10: 10.0x (auto cash out)

### Prize Tiers:
- Tier 1: 25% (1 winner)
- Tier 2: 10% each (2 winners)
- Tier 3: 6% each (3 winners)
- Tier 4: 3% each (5 winners)
- Tier 5: 1.2% each (10 winners)
- Tier 6: 1% each (10 winners)
- Consolation: ~5% split equally

## 📝 Notes

1. **Questions**: You need to provide 100+ questions. The system will shuffle them each game.

2. **Deposits**: Users submit transaction hash after depositing QT to platform wallet.

3. **Withdrawals**: Platform wallet sends QT directly to user's wallet.

4. **Cron Jobs**: Vercel cron runs automatically. Manual triggers available as backup.

5. **Window Management**: Automatically opens/closes based on UTC time.

6. **Balance System**: All balances are internal (database). Only deposits/withdrawals touch blockchain.

## 🐛 Known Issues / TODO

- [ ] Add deposit address display in UI
- [ ] Add withdrawal UI form
- [ ] Add question management UI
- [ ] Add admin dashboard
- [ ] Add Farcaster winner announcements
- [ ] Add transaction history view
- [ ] Add leaderboard for Bet Mode

## 📞 Support

For issues:
1. Check `BET_MODE_SETUP_GUIDE.md`
2. Review API logs in Vercel
3. Check database collections
4. Verify blockchain transactions on Basescan

---

**Implementation Complete! 🎉**

Ready for testing and deployment.

