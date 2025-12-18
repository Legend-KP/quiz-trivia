# 🏦 Platform Wallet - Complete Explanation

## What is Platform Wallet?

The **Platform Wallet** is a **crypto wallet address** (on Base blockchain) that acts as the **central treasury** for Bet Mode deposits and withdrawals.

### 🎯 Purpose:

1. **Receives Deposits**: When users deposit QT tokens, they send them to this wallet address
2. **Holds Funds**: Stores all QT tokens that users have deposited
3. **Processes Withdrawals**: When users withdraw, tokens are sent from this wallet back to users
4. **Token Burns**: Weekly token burns are executed from this wallet
5. **Lottery Pool**: Holds the lottery pool funds

## 🔄 How It Works:

```
User's Wallet (QT tokens)
    ↓
    Transfer QT tokens
    ↓
Platform Wallet (PLATFORM_WALLET_ADDRESS)
    ↓
    System verifies transaction
    ↓
    Credits user's internal balance (in MongoDB)
```

## 📋 Why It's Needed:

### 1. **Deposit Verification**
- When a user deposits QT tokens, the system checks if the transaction was sent to the platform wallet
- Only transactions to the correct address are credited to user accounts

### 2. **Security**
- All user funds are held in one secure wallet
- Makes it easier to manage and audit transactions
- Prevents users from sending tokens to wrong addresses

### 3. **Withdrawals**
- When users want to withdraw, tokens are sent from the platform wallet
- Ensures there's always a source of funds for withdrawals

### 4. **Token Burns**
- Weekly burns are executed from this wallet
- 60% of lost tokens are burned from this wallet

## 🚨 Current Issue:

The error "Platform wallet not configured" means:
- The `PLATFORM_WALLET_ADDRESS` environment variable is **not set** in your Vercel deployment
- Without it, the system cannot:
  - Verify deposits
  - Show users where to send tokens
  - Process withdrawals

## ✅ How to Fix:

### Step 1: Create a Wallet (if you don't have one)

You need a wallet address on Base blockchain. Options:

**Option A: Use an existing wallet**
- If you already have a Base wallet, use that address

**Option B: Create a new wallet**
- Use MetaMask, Coinbase Wallet, or any wallet that supports Base
- Make sure it's on **Base Mainnet** (not Base Sepolia testnet)
- **IMPORTANT**: Keep the private key/seed phrase safe!

### Step 2: Get the Wallet Address

Your wallet address will look like:
```
0x1234567890abcdef1234567890abcdef12345678
```

### Step 3: Add to Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. Add:
   - **Key**: `PLATFORM_WALLET_ADDRESS`
   - **Value**: Your wallet address (e.g., `0x1234...`)
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application

### Step 4: Fund the Wallet (Important!)

After setting up the wallet, you need to:

1. **Add Base ETH** for gas fees:
   - Send some Base ETH (native token) to the wallet
   - Needed for transaction gas fees
   - Recommend: 0.01-0.1 Base ETH

2. **Add QT Tokens** (if needed for withdrawals):
   - Users will deposit QT tokens to this wallet
   - When users withdraw, tokens are sent from here
   - Start with some QT tokens for initial withdrawals

### Step 5: Verify It Works

After redeploying:
1. Open your app
2. Go to Bet Mode
3. Click "Deposit QT Tokens"
4. The error should be gone
5. You should see the platform wallet address displayed

## 🔒 Security Best Practices:

1. **Never share your private key**
2. **Use a dedicated wallet** for the platform (don't use your personal wallet)
3. **Keep backups** of your seed phrase in a secure location
4. **Monitor the wallet** regularly for unusual activity
5. **Set up alerts** for large transactions

## 📊 Wallet Management:

### Recommended Setup:

- **Hot Wallet**: For daily operations (deposits/withdrawals)
- **Cold Wallet**: For storing excess funds (more secure)
- **Multi-sig**: For additional security (optional)

### Monitoring:

- Check wallet balance regularly
- Monitor incoming deposits
- Track withdrawal requests
- Ensure sufficient gas (Base ETH) for transactions

## 🆘 Troubleshooting:

### Error: "Platform wallet not configured"
- **Solution**: Add `PLATFORM_WALLET_ADDRESS` to Vercel environment variables

### Error: "Invalid destination address"
- **Solution**: User sent tokens to wrong address - check the platform wallet address is correct

### Error: "Transaction not found"
- **Solution**: Transaction might be pending - wait a few minutes and try again

### Error: "Insufficient gas"
- **Solution**: Add more Base ETH to the platform wallet for gas fees

## 📝 Example Configuration:

```env
# .env.local (for local development)
PLATFORM_WALLET_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
BASE_RPC_URL=https://mainnet.base.org
QT_TOKEN_ADDRESS=0x541529ADB3f344128aa87917fd2926E7D240FB07
```

## 🎯 Summary:

- **Platform Wallet** = Central wallet for all Bet Mode transactions
- **Required** for deposits, withdrawals, and burns
- **Must be configured** in Vercel environment variables
- **Must be funded** with Base ETH for gas fees
- **Keep secure** - this wallet holds user funds!

