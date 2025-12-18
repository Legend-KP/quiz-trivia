# Contract Verification Instructions for BaseScan

## Contract Details

- **Contract Address:** `0x8f8298D16dC4F192587e11a7a7C7F8c7F81A4C89`
- **Network:** Base Mainnet (Chain ID: 8453)
- **Contract Name:** `SpinWheelQTDistributor`
- **Compiler Version:** `0.8.20`
- **Optimization:** Enabled (200 runs)
- **EVM Version:** `paris`

## Constructor Arguments

- **QT Token Address:** `0x541529ADB3f344128aa87917fd2926E7D240FB07`

---

## Method 1: Manual Verification via BaseScan UI

### Step 1: Go to Contract Page
1. Navigate to: https://basescan.org/address/0x8f8298D16dC4F192587e11a7a7C7F8c7F81A4C89
2. Click on the **"Contract"** tab
3. Click **"Verify and Publish"**

### Step 2: Select Verification Method
1. Choose **"Via Standard JSON Input"** (recommended)
2. Or choose **"Via flattened source code"** (alternative)

### Step 3: If Using Standard JSON Input
1. **Compiler Type:** Solidity (Single file)
2. **Compiler Version:** `v0.8.20+commit.a1b79de6`
3. **Open Source License Type:** MIT
4. **Standard JSON Input:** Copy and paste the entire contents of `standard-json-input-spin-wheel.json`
5. Click **"Continue"**

### Step 4: If Using Flattened Source Code
1. **Compiler Type:** Solidity (Single file)
2. **Compiler Version:** `v0.8.20+commit.a1b79de6`
3. **Open Source License Type:** MIT
4. **Contract Name:** `SpinWheelQTDistributor`
5. **Constructor Arguments (ABI-encoded):**
   ```
   000000000000000000000000541529adb3f344128aa87917fd2926e7d240fb07
   ```
   (This is the QT token address padded to 32 bytes)
6. **Source Code:** Copy and paste the entire contract from `contracts/SpinWheelQTDistributor.sol`
7. Click **"Continue"**

### Step 5: Complete Verification
1. Review the information
2. Click **"Verify and Publish"**
3. Wait for verification to complete (usually takes 30-60 seconds)

---

## Method 2: Verification via Hardhat Command

### Using Hardhat Verify Plugin

```bash
npx hardhat verify --network base 0x8f8298D16dC4F192587e11a7a7C7F8c7F81A4C89 "0x541529ADB3f344128aa87917fd2926E7D240FB07"
```

**Note:** Make sure you have:
- `BASESCAN_API_KEY` set in your `.env` file
- The contract source code matches exactly
- The compiler settings match (optimizer enabled, 200 runs, EVM version: paris)

---

## Method 3: Using Standard JSON Input File

### Step 1: Prepare the JSON File
The file `standard-json-input-spin-wheel.json` is already prepared with:
- Complete contract source code
- Compiler settings (optimizer enabled, 200 runs)
- EVM version (paris)

### Step 2: Upload to BaseScan
1. Go to: https://basescan.org/address/0x8f8298D16dC4F192587e11a7a7C7F8c7F81A4C89#code
2. Click **"Verify and Publish"**
3. Select **"Via Standard JSON Input"**
4. Copy the entire contents of `standard-json-input-spin-wheel.json`
5. Paste into the text area
6. Click **"Continue"** and then **"Verify and Publish"**

---

## Constructor Arguments Encoding

The constructor takes one parameter:
- `address _qtTokenAddress = 0x541529ADB3f344128aa87917fd2926E7D240FB07`

**ABI-encoded format:**
```
000000000000000000000000541529adb3f344128aa87917fd2926e7d240fb07
```

**How to encode manually:**
1. Remove the `0x` prefix
2. Convert to lowercase: `541529adb3f344128aa87917fd2926e7d240fb07`
3. Pad to 32 bytes (64 hex characters): `000000000000000000000000541529adb3f344128aa87917fd2926e7d240fb07`

---

## Troubleshooting

### Error: "Bytecode does not match"
- **Solution:** Ensure compiler version, optimizer settings, and EVM version match exactly
- Check that the source code is identical to what was deployed

### Error: "Constructor arguments are invalid"
- **Solution:** Verify the constructor argument encoding is correct
- The address should be padded to 32 bytes (64 hex characters)

### Error: "Contract name does not match"
- **Solution:** Ensure the contract name is exactly `SpinWheelQTDistributor`

### Error: "Optimizer settings do not match"
- **Solution:** Verify optimizer is enabled with 200 runs
- EVM version should be `paris`

---

## Verification Checklist

- [ ] Contract address is correct: `0x8f8298D16dC4F192587e11a7a7C7F8c7F81A4C89`
- [ ] Network is Base Mainnet (Chain ID: 8453)
- [ ] Compiler version: `0.8.20`
- [ ] Optimizer: Enabled (200 runs)
- [ ] EVM Version: `paris`
- [ ] Constructor argument: `0x541529ADB3f344128aa87917fd2926E7D240FB07`
- [ ] Source code matches exactly
- [ ] License: MIT

---

## After Verification

Once verified, you'll be able to:
- ✅ View the contract source code on BaseScan
- ✅ Interact with the contract functions directly from BaseScan
- ✅ Verify function calls and events
- ✅ See contract ABI and documentation

---

## Links

- **Contract on BaseScan:** https://basescan.org/address/0x8f8298D16dC4F192587e11a7a7C7F8c7F81A4C89
- **Verification Page:** https://basescan.org/address/0x8f8298D16dC4F192587e11a7a7C7F8c7F81A4C89#code
- **QT Token:** https://basescan.org/token/0x541529ADB3f344128aa87917fd2926E7D240FB07

---

**Good luck with verification!** 🚀
