# 🔍 Manual Contract Verification Guide

## 📋 Contract Details
- **Contract Address**: `0xAdF6B40eB685b448C92d5D2c3f0C1ec997c269c2`
- **Network**: Base Mainnet
- **Explorer**: https://basescan.org/address/0xAdF6B40eB685b448C92d5D2c3f0C1ec997c269c2
- **API Key**: VMZ25B4ZKF49UPSI6J1QYM261DQ98C85N3

## 🚀 Method 1: BaseScan Web Interface (Easiest)

### Step 1: Go to BaseScan
1. Visit: https://basescan.org/address/0xAdF6B40eB685b448C92d5D2c3f0C1ec997c269c2
2. Click on the "Contract" tab
3. Click "Verify and Publish"

### Step 2: Fill in Contract Details
1. **Contract Address**: `0xAdF6B40eB685b448C92d5D2c3f0C1ec997c269c2`
2. **Compiler Type**: Solidity (Single file)
3. **Compiler Version**: v0.8.19+commit.7d6b6397
4. **License**: MIT
5. **Optimization**: Yes (200 runs)

### Step 3: Paste Contract Source Code
Copy the entire contract code from `contracts/QuizTriviaEntry.sol` and paste it into the "Enter the Solidity Contract Code" field.

### Step 4: Submit for Verification
1. Click "Verify and Publish"
2. Wait for verification to complete (usually 1-2 minutes)
3. Check the "Contract" tab to see verified source code

## 🔧 Method 2: Hardhat Verification (Alternative)

If the web interface doesn't work, try this command:

```bash
npx hardhat verify --network base 0xAdF6B40eB685b448C92d5D2c3f0C1ec997c269c2 --show-stack-traces
```

## 📊 Method 3: API Verification (Advanced)

### Step 1: Prepare Contract Source
Copy the contract code from `contracts/QuizTriviaEntry.sol`

### Step 2: Make API Request
```bash
curl -X POST "https://api.basescan.org/v2/api" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "apikey=VMZ25B4ZKF49UPSI6J1QYM261DQ98C85N3" \
  -d "module=contract" \
  -d "action=verifysourcecode" \
  -d "contractaddress=0xAdF6B40eB685b448C92d5D2c3f0C1ec997c269c2" \
  -d "sourceCode=YOUR_CONTRACT_SOURCE_CODE" \
  -d "contractname=QuizTriviaEntry" \
  -d "compilerversion=v0.8.19+commit.7d6b6397" \
  -d "optimizationUsed=1" \
  -d "runs=200" \
  -d "evmversion=paris"
```

## ✅ Verification Benefits

Once verified, your contract will have:
- ✅ **Readable source code** on BaseScan
- ✅ **Function signatures** and ABI visible
- ✅ **Constructor arguments** displayed
- ✅ **Professional appearance** for users
- ✅ **Easy debugging** and interaction

## 🎯 What to Expect

After successful verification:
1. **Contract tab** will show "Contract Source Code Verified"
2. **Read Contract** tab will be available
3. **Write Contract** tab will show all functions
4. **Events** tab will show contract events
5. **Contract ABI** will be available for integration

## 🚨 Troubleshooting

### Common Issues:
1. **Compiler version mismatch**: Use exact version v0.8.19+commit.7d6b6397
2. **Optimization settings**: Use "Yes" with 200 runs
3. **Source code formatting**: Ensure proper indentation
4. **License**: Use MIT license

### If Verification Fails:
1. Check compiler version matches deployment
2. Verify optimization settings (200 runs)
3. Ensure source code is complete and properly formatted
4. Try different compiler versions if needed

## 🎉 Success!

Once verified, your contract will be fully transparent and professional-looking on BaseScan! 🚀
