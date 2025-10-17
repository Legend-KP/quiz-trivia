# 🪙 QT Token Smart Contract Setup Guide

## 📋 **What We've Created:**

### 1. **Smart Contract** (`contracts/QTRewardDistributor.sol`)
- **Automatic QT token distribution** (10,000 QT per user per day)
- **Built-in security** with ReentrancyGuard and Ownable
- **Daily claim limits** to prevent abuse
- **Owner functions** for depositing/withdrawing QT tokens

### 2. **Deployment Script** (`scripts/deploy-qt-distributor.cjs`)
- **One-command deployment** to Base Mainnet
- **Automatic verification** of deployment
- **Environment variable setup** instructions

### 3. **Management Scripts**
- **`scripts/manage-qt-distributor.cjs`** - Check contract status
- **`scripts/deposit-qt-tokens.cjs`** - Deposit QT tokens to contract

### 4. **Updated API** (`src/app/api/qt-token/transfer/route.ts`)
- **Smart contract integration** instead of direct transfers
- **Automatic claim validation** (once per day per user)
- **Better error handling** and security

## 🚀 **Setup Instructions:**

### **Step 1: Install Dependencies**
```bash
npm install @openzeppelin/contracts
```

### **Step 2: Environment Variables**
Add to your `.env` file:
```bash
# Your existing variables
QT_TOKEN_ADDRESS=0xYourQTTokenContractAddress
WALLET_PRIVATE_KEY=your_wallet_private_key
RPC_URL=https://mainnet.base.org

# New variables (will be set after deployment)
QT_DISTRIBUTOR_ADDRESS=0xYourDeployedContractAddress
```

### **Step 3: Deploy the Contract**
```bash
npx hardhat run scripts/deploy-qt-distributor.cjs --network base
```

### **Step 4: Deposit QT Tokens**
```bash
# Deposit 1 million QT tokens (adjust amount as needed)
DEPOSIT_AMOUNT=1000000 npx hardhat run scripts/deposit-qt-tokens.cjs --network base
```

### **Step 5: Update Your App**
The API is already updated to use the smart contract!

## 🔧 **Contract Functions:**

### **For Users:**
- `claimQTReward()` - Claim 10,000 QT tokens (once per day)
- `canClaimToday(address)` - Check if user can claim today

### **For Owner (You):**
- `depositQTTokens(amount)` - Deposit QT tokens to contract
- `withdrawQTTokens(amount)` - Withdraw QT tokens from contract
- `getQTBalance()` - Check contract's QT token balance

## 💰 **How It Works:**

1. **You deposit QT tokens** to the smart contract
2. **Users spin the wheel** and land on QT token option
3. **Smart contract automatically** transfers 10,000 QT tokens to user
4. **Once per day limit** prevents abuse
5. **No manual intervention** needed!

## 🎯 **Benefits:**

✅ **Secure**: No private keys in API  
✅ **Automated**: No manual token transfers  
✅ **Scalable**: Handle unlimited users  
✅ **Cost-effective**: One-time setup  
✅ **Transparent**: All transactions on-chain  

## 📊 **Costs:**

- **Deployment**: ~0.001-0.005 ETH (one-time)
- **Deposit**: ~0.0001 ETH per deposit
- **User Claims**: ~0.0001 ETH per claim (paid by your wallet)
- **Total per 1000 users**: ~0.1 ETH in gas fees

## 🔍 **Monitoring:**

```bash
# Check contract status
npx hardhat run scripts/manage-qt-distributor.cjs --network base

# View on BaseScan
https://basescan.org/address/YOUR_CONTRACT_ADDRESS
```

## ❓ **What I Need From You:**

1. **QT Token Contract Address** (from your Clanker deployment)
2. **Your wallet private key** (for deployment and management)
3. **How many QT tokens** you want to deposit initially
4. **Confirmation** that you want to proceed with this approach

## 🚨 **Important Notes:**

- **Your private key** is only used for deployment and management
- **Users don't need wallets** - they just need to connect their Farcaster account
- **Contract is secure** - users can only claim once per day
- **You control the funds** - you can withdraw QT tokens anytime

Would you like me to proceed with this smart contract approach? It's much more secure and scalable than the current direct transfer method!
