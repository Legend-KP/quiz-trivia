# 🎁 Daily Reward Setup Guide - 1,000 QT Tokens

## 📋 Overview

This guide will help you deploy a new Daily Reward Distributor contract that gives users **1,000 QT tokens** per day for opening the app.

## 🎯 What You're Setting Up

- **Daily Reward**: 1,000 QT tokens per user per day
- **Total Supply**: 100 million QT tokens deposited to contract
- **Duration**: Supports ~100,000 daily claims (or ~100 days with 1,000 users/day)

## 🚀 Step-by-Step Deployment

### Step 1: Prerequisites

Make sure you have:
- Node.js and npm installed
- Hardhat configured
- Your `.env` file set up with:
  ```bash
  QT_TOKEN_ADDRESS=0x541529ADB3f344128aa87917fd2926E7D240FB07
  WALLET_PRIVATE_KEY=your_wallet_private_key
  RPC_URL=https://mainnet.base.org
  ```

### Step 2: Deploy the Contract

Run the deployment script:

```bash
npx hardhat run scripts/deploy-daily-reward-distributor.cjs --network base
```

**Important**: Save the contract address that gets printed! You'll need it for the next steps.

### Step 3: Update Environment Variables

Add the new contract address to your `.env` file:

```bash
QT_DISTRIBUTOR_ADDRESS=0xYourNewContractAddress
NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS=0xYourNewContractAddress
```

### Step 4: Deposit 100 Million QT Tokens

Make sure you have at least 100 million QT tokens in your wallet, then run:

```bash
DEPOSIT_AMOUNT=100000000 npx hardhat run scripts/deposit-daily-reward-tokens.cjs --network base
```

This will:
- Approve the contract to spend your tokens
- Deposit 100 million QT tokens to the contract
- Show you how many daily claims the contract can support

### Step 5: Verify on BaseScan

Visit your contract on BaseScan:
```
https://basescan.org/address/YOUR_CONTRACT_ADDRESS
```

You should see:
- Contract balance: 100,000,000 QT tokens
- Reward amount: 1,000 QT tokens

## 📊 Contract Details

### Reward Amount
- **1,000 QT tokens** per user per day
- Hardcoded in contract: `REWARD_AMOUNT = 1000 * 10**18`

### Contract Functions

**For Users:**
- `claimQTReward()` - Claim 1,000 QT tokens (once per day)
- `canClaimToday(address)` - Check if user can claim today

**For Owner:**
- `depositQTTokens(amount)` - Deposit more QT tokens
- `withdrawQTTokens(amount)` - Withdraw QT tokens
- `getQTBalance()` - Check contract balance

## 🔧 Frontend Integration

The frontend is already configured to use the contract address from `NEXT_PUBLIC_QT_DISTRIBUTOR_ADDRESS`. Once you:

1. Deploy the new contract
2. Set the environment variable
3. Deposit tokens

The daily claim button will automatically use the new contract with 1,000 QT rewards!

## 💰 Cost Estimates

- **Deployment**: ~0.001-0.005 ETH (one-time)
- **Token Deposit**: ~0.0001 ETH (one-time)
- **User Claims**: Users pay their own gas fees (~0.0001 ETH per claim)

## ✅ Verification Checklist

- [ ] Contract deployed successfully
- [ ] Contract address saved to `.env`
- [ ] 100 million QT tokens deposited
- [ ] Contract balance verified on BaseScan
- [ ] Frontend environment variable updated
- [ ] Test claim works correctly

## 🧪 Testing

After deployment, you can test by:

1. Connect your wallet in the app
2. Go to the Rewards tab
3. Click "Claim Daily Reward"
4. Verify you receive 1,000 QT tokens
5. Try claiming again (should show "Already Claimed Today")

## 📝 Important Notes

- Users can only claim **once per day** (resets at midnight UTC)
- The contract needs sufficient QT token balance to pay rewards
- You can deposit more tokens anytime using `depositQTTokens()`
- You can withdraw tokens using `withdrawQTTokens()` (owner only)

## 🆘 Troubleshooting

**"Insufficient QT tokens in contract"**
- Deposit more tokens to the contract

**"Already claimed today"**
- User must wait until the next day (UTC)

**Transaction fails**
- Check you have enough ETH for gas fees
- Verify contract has QT token balance
- Check BaseScan for error details

## 📞 Support

If you encounter issues:
1. Check BaseScan for transaction details
2. Verify environment variables are set correctly
3. Ensure contract has sufficient QT token balance

---

**Ready to deploy?** Start with Step 2! 🚀

