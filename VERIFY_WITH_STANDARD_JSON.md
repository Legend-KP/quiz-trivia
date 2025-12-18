# ✅ Verify Contract Using Standard JSON Input

The flattened file contains multiple contracts, so we'll use the **Standard JSON Input** method which is more reliable.

---

## 📋 Step-by-Step Instructions

### Step 1: Go to BaseScan

Visit: https://basescan.org/address/0xD9DaF0183265cf600F0e2df6aD2dE4F0334B15B3

### Step 2: Start Verification

1. Click the **"Contract"** tab
2. Click **"Verify and Publish"**

### Step 3: Select Verification Method

**Choose**: **"Solidity (Standard JSON Input)"** (NOT "Solidity (Single file)")

### Step 4: Upload Standard JSON Input

1. Click **"Choose File"** or drag and drop
2. Select the file: **`standard-json-input.json`** (in your project root)
3. This file contains all the compiler settings and source code

### Step 5: Enter Contract Details

**Contract Name**: `BetModeVault`

**Constructor Arguments (ABI-Encoded)**:
```
0x000000000000000000000000541529adb3f344128aa87917fd2926e7d240fb0700000000000000000000000055b2ed149545bb4af2977eeb0bff91f030b8bd5f
```

**Or decode it**:
- Parameter 1: `0x541529ADB3f344128aa87917fd2926E7D240FB07` (QT Token)
- Parameter 2: `0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F` (Admin Signer)

### Step 6: Submit

Click **"Verify and Publish"**

---

## ✅ Why This Works Better

- **Standard JSON Input** includes all compiler settings automatically
- BaseScan knows exactly which contract to verify
- No need to manually match compiler versions
- More reliable for contracts with imports

---

## 📝 Files Created

- ✅ `standard-json-input.json` - Standard JSON Input file (use this!)
- ✅ `contracts/BetModeVaultFlattened.sol` - Flattened file (not needed for this method)

---

## 🔍 If Verification Still Fails

1. **Check compiler version**: Make sure BaseScan shows `0.8.20`
2. **Check optimization**: Should be enabled with 200 runs
3. **Double-check constructor arguments**: They must match exactly
4. **Try again**: Sometimes BaseScan needs a few minutes to index

---

## 💡 Alternative: Try Hardhat Verify Again

You can also try automatic verification with the contract name specified:

```bash
npx hardhat verify --network base \
  0xD9DaF0183265cf600F0e2df6aD2dE4F0334B15B3 \
  0x541529ADB3f344128aa87917fd2926E7D240FB07 \
  0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F \
  --contract contracts/BetModeVault.sol:BetModeVault
```

But the Standard JSON Input method is usually more reliable!


