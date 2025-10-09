# 🚀 Quiz Trivia Blockchain Deployment Guide

## 📋 Prerequisites

1. **MetaMask Wallet** with Base Sepolia testnet ETH
2. **Node.js** and npm installed
3. **Git** for version control

## 🔧 Step 1: Get Base Sepolia Testnet ETH

1. Go to [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
2. Connect your MetaMask wallet
3. Request testnet ETH (you'll get enough for many transactions)

## 🛠️ Step 2: Deploy Smart Contract

### Option A: Using Hardhat (Recommended)

1. **Set up environment variables:**
   ```bash
   # Create .env file in your project root
   echo "PRIVATE_KEY=your_wallet_private_key_here" > .env
   ```

2. **Deploy to Base Sepolia:**
   ```bash
   npx hardhat run scripts/deploy.ts --network baseSepolia
   ```

3. **Copy the contract address** from the output

### Option B: Using Remix IDE (Easier)

1. Go to [Remix IDE](https://remix.ethereum.org)
2. Create new file: `QuizTriviaEntry.sol`
3. Copy the contract code from `QuizTriviaEntry.sol`
4. Compile the contract
5. Deploy to Base Sepolia (make sure MetaMask is on Base Sepolia)
6. Copy the deployed contract address

## 🔗 Step 3: Update Contract Address

After deployment, update `src/lib/wallet.ts`:

```typescript
export const CONTRACT_ADDRESS = '0xYOUR_DEPLOYED_CONTRACT_ADDRESS';
```

## ✅ Step 4: Test the Integration

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test the flow:**
   - Click any quiz mode button
   - Connect MetaMask when prompted
   - Confirm the transaction (~$0.001 gas fee)
   - Quiz should start after transaction confirmation

## 🎯 What Happens Now

1. **User clicks "Start"** → Blockchain transaction modal appears
2. **User connects wallet** → MetaMask prompts for connection
3. **User confirms transaction** → Pays ~$0.001 gas fee
4. **Transaction confirmed** → Quiz starts with on-chain record
5. **Quiz completion** → Optional: Record completion on-chain

## 🔍 Verification

- Check your transaction on [Base Sepolia Explorer](https://sepolia.basescan.org)
- View contract interactions and events
- Verify quiz starts are recorded on-chain

## 🚨 Troubleshooting

### Common Issues:

1. **"MetaMask not installed"**
   - Install MetaMask browser extension
   - Refresh the page

2. **"Wrong network"**
   - Switch MetaMask to Base Sepolia
   - The app will prompt to switch networks

3. **"Insufficient funds"**
   - Get more testnet ETH from the faucet
   - Check you're on Base Sepolia (not mainnet)

4. **"Transaction failed"**
   - Check gas price settings
   - Try increasing gas limit
   - Ensure sufficient ETH balance

### Network Configuration:

- **Network Name:** Base Sepolia
- **RPC URL:** https://sepolia.base.org
- **Chain ID:** 84532
- **Currency Symbol:** ETH
- **Block Explorer:** https://sepolia.basescan.org

## 🎉 Success!

Your quiz trivia app now has blockchain integration! Users will:
- Pay a small fee to start quizzes
- Create permanent on-chain records
- Experience Web3 functionality seamlessly

## 📊 Smart Contract Features

- **Entry Fees:** 0.001 ETH (~$0.001) per quiz
- **Quiz Modes:** Classic, Time Mode, Challenge
- **Statistics:** Track total quizzes, user counts
- **Events:** Emit QuizStarted and QuizCompleted events
- **Owner Functions:** Withdraw fees, view statistics

## 🔄 Next Steps

1. Deploy to mainnet when ready
2. Add more quiz modes
3. Implement rewards system
4. Add NFT achievements
5. Create leaderboard on-chain

