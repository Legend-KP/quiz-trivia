# 💰 Bet Mode Winnings - How It Works

## ❌ **NO - Winnings are NOT Automatically Sent On-Chain**

When a user wins in Bet Mode, **the tokens do NOT automatically go from your platform wallet to the user's wallet**.

## ✅ **How It Actually Works:**

### **1. Winnings are Stored Internally (Custodial System)**

When a user wins:
- ✅ Winnings are **credited to their internal balance** in MongoDB (`qtBalance`)
- ✅ The balance is stored **off-chain** in your database
- ✅ **No blockchain transaction** happens automatically
- ✅ **No tokens are sent** from your platform wallet

### **2. Two-Step Process:**

```
Step 1: User Wins
    ↓
Winnings credited to internal balance (MongoDB)
    ↓
User sees new balance in app
    ↓
Step 2: User Withdraws (Optional)
    ↓
User clicks "Withdraw" button
    ↓
Tokens sent FROM platform wallet TO user's wallet
```

## 📊 **Detailed Flow:**

### **When User Wins:**

1. **Cash Out (Mid-Game)**:
   - User cashes out at Q5-Q9
   - Winnings credited to `qtBalance` in MongoDB
   - No blockchain transaction

2. **Complete Q10**:
   - User answers all 10 questions correctly
   - Maximum winnings (10x bet) credited to `qtBalance`
   - No blockchain transaction

3. **Lottery Win**:
   - User wins weekly lottery
   - Prize credited to `qtBalance` in MongoDB
   - No blockchain transaction

### **When User Withdraws:**

1. User clicks "Withdraw" button
2. User enters amount and wallet address
3. **NOW** tokens are sent from platform wallet to user's wallet
4. User's internal balance is deducted
5. Transaction recorded on blockchain

## 🔄 **Complete Transaction Flow:**

### **Deposit Flow:**
```
User's Wallet
    ↓ (sends QT tokens)
Platform Wallet (0x55b2...)
    ↓ (verified on-chain)
User's Internal Balance (MongoDB)
```

### **Win Flow:**
```
User Wins Game
    ↓
Internal Balance Updated (MongoDB)
    ↓
NO BLOCKCHAIN TRANSACTION
```

### **Withdrawal Flow:**
```
User Clicks Withdraw
    ↓
Platform Wallet (0x55b2...)
    ↓ (sends QT tokens)
User's Wallet
```

## 💡 **Why This Design?**

### **Advantages:**

1. **No Gas Fees for Winnings**: Users don't pay gas when they win
2. **Instant Credits**: Winnings appear immediately
3. **Lower Costs**: You only pay gas when users withdraw
4. **Better UX**: Users can play multiple games without waiting for transactions
5. **Flexibility**: Users can withdraw anytime or keep playing

### **Your Platform Wallet Role:**

Your platform wallet (`0x55b2ed149545bb4af2977eeb0bff91f030b8bd5f`) is used for:

1. ✅ **Receiving Deposits**: Users send tokens TO this wallet
2. ✅ **Processing Withdrawals**: Tokens sent FROM this wallet when users withdraw
3. ✅ **Token Burns**: Weekly burns sent FROM this wallet to burn address
4. ❌ **NOT for automatic winnings**: Winnings are internal only

## 📈 **Balance Management:**

### **Internal Balance (MongoDB):**
- `qtBalance`: Total balance (deposits + winnings - withdrawals)
- `qtLockedBalance`: Amount locked in active game
- `qtTotalWon`: Total winnings earned
- `qtTotalDeposited`: Total deposited
- `qtTotalWithdrawn`: Total withdrawn

### **On-Chain Balance:**
- Platform wallet holds all deposited tokens
- When users withdraw, tokens are sent from platform wallet
- Platform wallet balance = All user deposits - All withdrawals - All burns

## ⚠️ **Important Considerations:**

### **1. Platform Wallet Must Have Sufficient Balance:**

Your platform wallet needs enough QT tokens to cover:
- User withdrawals
- Weekly token burns (60% of losses)

**Example:**
- Users deposit: 1,000,000 QT
- Users win: 500,000 QT (internal balance)
- Users withdraw: 300,000 QT
- Platform wallet needs: 300,000 QT minimum

### **2. Liquidity Management:**

You need to ensure:
- Platform wallet has enough QT for withdrawals
- Monitor withdrawal requests
- Keep some reserve for unexpected withdrawals

### **3. No Automatic Payouts:**

- Winnings are **not** automatically sent
- Users must **manually withdraw** if they want tokens
- This is by design - it's a custodial system

## 🎯 **Summary:**

| Action | On-Chain Transaction? | From Platform Wallet? |
|--------|----------------------|---------------------|
| User Deposits | ✅ Yes | ❌ No (TO platform wallet) |
| User Wins | ❌ No | ❌ No (internal only) |
| User Withdraws | ✅ Yes | ✅ Yes (FROM platform wallet) |
| Token Burn | ✅ Yes | ✅ Yes (FROM platform wallet) |

## 🔒 **Security:**

- All winnings are tracked in MongoDB
- Withdrawals require user action
- Platform wallet private key is secure
- All transactions are logged

## 💰 **Your Responsibility:**

1. **Fund Platform Wallet**: Keep enough QT tokens for withdrawals
2. **Monitor Balance**: Track platform wallet balance
3. **Process Withdrawals**: System handles automatically when users request
4. **Manage Burns**: Weekly burns happen automatically via cron

---

**Bottom Line**: Winnings are stored internally. Users must withdraw manually to receive tokens on-chain. Your platform wallet is only used for deposits, withdrawals, and burns - NOT for automatic winnings distribution.

