# 🚀 Base Mainnet Deployment Guide

## ⚠️ Important: This is for PRODUCTION deployment

Base Mainnet uses **real ETH**, not testnet tokens. Make sure you have:
- Real ETH on Base Mainnet
- Sufficient balance for gas fees
- Your private key securely stored

## 🔧 Prerequisites

1. **Base Mainnet ETH**: You need real ETH on Base Mainnet
2. **Private Key**: Your wallet's private key
3. **BaseScan API Key**: For contract verification (optional but recommended)

## 📋 Step-by-Step Deployment

### Step 1: Prepare Environment

1. **Add your private key to .env file:**
   ```bash
   echo "PRIVATE_KEY=your_private_key_here" > .env
   ```

2. **Optional: Add BaseScan API key for verification:**
   ```bash
   echo "BASESCAN_API_KEY=your_api_key_here" >> .env
   ```

### Step 2: Deploy to Base Mainnet

```bash
npx hardhat run scripts/deploy-base-mainnet.cjs --network base
```

### Step 3: Verify Contract (Optional but Recommended)

After deployment, verify the contract on BaseScan:

```bash
npx hardhat verify --network base <CONTRACT_ADDRESS>
```

### Step 4: Test Contract Functions

```bash
CONTRACT_ADDRESS=0xYourDeployedAddress npx hardhat run scripts/verify-base-mainnet.cjs --network base
```

### Step 5: Update Your App

1. **Open `src/lib/wallet.ts`**
2. **Update the contract address:**
   ```typescript
   export const CONTRACT_ADDRESS = '0xYourDeployedContractAddress';
   ```

3. **Update network configuration for Base Mainnet:**
   ```typescript
   export const NETWORK_CONFIG = {
     chainId: '0x2105', // 8453 in hex
     chainName: 'Base',
     rpcUrls: ['https://mainnet.base.org'],
     blockExplorerUrls: ['https://basescan.org'],
     nativeCurrency: {
       name: 'Ethereum',
       symbol: 'ETH',
       decimals: 18
     }
   };
   ```

## 🎯 Complete Deployment Commands

Here are the exact commands to run:

### 1. Deploy Contract
```bash
npx hardhat run scripts/deploy-base-mainnet.cjs --network base
```

### 2. Verify Contract (replace with your contract address)
```bash
npx hardhat verify --network base 0xYourContractAddress
```

### 3. Test Contract Functions
```bash
CONTRACT_ADDRESS=0xYourContractAddress npx hardhat run scripts/verify-base-mainnet.cjs --network base
```

### 4. Update App Configuration
```bash
# Update src/lib/wallet.ts with your contract address
# Update src/lib/wallet.ts with Base Mainnet network config
```

### 5. Test Your App
```bash
npm run dev
```

## 🔍 Verification Steps

After deployment, verify everything works:

1. **Check contract on BaseScan**: https://basescan.org/address/YOUR_CONTRACT_ADDRESS
2. **Test contract functions**: Run the verification script
3. **Test your app**: Start the dev server and test quiz functionality

## 💰 Cost Estimation

- **Deployment**: ~0.001-0.005 ETH (gas fees)
- **Quiz Entry**: 0.001 ETH per quiz
- **Gas Fees**: Very low on Base (~$0.001 per transaction)

## 🚨 Important Notes

- **Real Money**: Base Mainnet uses real ETH
- **Permanent**: Deployed contracts are permanent
- **Security**: Keep your private key secure
- **Testing**: Test on Base Sepolia first if possible

## 🎉 Success!

After deployment, your Quiz Trivia app will have:
- **Real blockchain integration** on Base Mainnet
- **Permanent on-chain records** of quiz participation
- **Low-cost transactions** (~$0.001 per quiz)
- **Professional Web3 experience**

## 🔄 Network Configuration

### Base Mainnet
- **RPC URL**: https://mainnet.base.org
- **Chain ID**: 8453
- **Explorer**: https://basescan.org
- **Currency**: ETH (real)

### Base Sepolia (Testnet)
- **RPC URL**: https://sepolia.base.org
- **Chain ID**: 84532
- **Explorer**: https://sepolia.basescan.org
- **Currency**: ETH (testnet)

## 🎯 What Happens After Deployment

1. **Users click "Start"** → Blockchain transaction modal
2. **Users connect MetaMask** → One-time wallet setup
3. **Users confirm transaction** → Pay 0.001 ETH + gas
4. **Quiz starts** → With permanent on-chain record
5. **Quiz completion** → Optional on-chain completion record

Your Quiz Trivia app will be fully integrated with Base Mainnet! 🚀
