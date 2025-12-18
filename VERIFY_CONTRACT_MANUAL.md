# 🔍 Manual Contract Verification Guide

The contract verification failed because BaseScan needs exact compiler settings. Here's how to verify manually:

## 📋 Contract Information

- **Contract Address**: `0xD9DaF0183265cf600F0e2df6aD2dE4F0334B15B3`
- **BaseScan Link**: https://basescan.org/address/0xD9DaF0183265cf600F0e2df6aD2dE4F0334B15B3

---

## 🔧 Step-by-Step Verification

### Step 1: Go to BaseScan

1. Visit: https://basescan.org/address/0xD9DaF0183265cf600F0e2df6aD2dE4F0334B15B3
2. Click the **"Contract"** tab
3. Click **"Verify and Publish"**

### Step 2: Fill in Contract Details

**Compiler Type**: Select **"Solidity (Single file)"**

**Compiler Version**: Select **"v0.8.20+commit.a1b79de6"** (or the latest 0.8.20 version)

**License**: Select **"MIT License (MIT)"**

**Open Source License Type**: Select **"MIT License (MIT)"**

### Step 3: Optimization Settings

- ✅ **Yes** (Optimization enabled)
- **Runs**: `200`

### Step 4: Contract Source Code

1. Open the file: `contracts/BetModeVaultFlattened.sol`
2. Copy **ALL** the contents
3. Paste into the "Enter the Solidity Contract Code below" field

### Step 5: Constructor Arguments

**ABI-Encoded Constructor Arguments**:

```
000000000000000000000000541529adb3f344128aa87917fd2926e7d240fb0700000000000000000000000055b2ed149545bb4af2977eeb0bff91f030b8bd5f
```

**Or decode it manually**:
- Parameter 1 (QT Token): `0x541529ADB3f344128aa87917fd2926E7D240FB07`
- Parameter 2 (Admin Signer): `0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F`

### Step 6: Submit

Click **"Verify and Publish"**

---

## 🔄 Alternative: Try Automatic Verification Again

If you want to try automatic verification, make sure you're using the exact same compiler settings:

```bash
npx hardhat verify --network base \
  0xD9DaF0183265cf600F0e2df6aD2dE4F0334B15B3 \
  0x541529ADB3f344128aa87917fd2926E7D240FB07 \
  0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F \
  --contract contracts/BetModeVault.sol:BetModeVault
```

---

## ⚠️ Common Issues

### Issue: "Bytecode doesn't match"

**Solution**: Make sure:
- Compiler version is exactly `0.8.20`
- Optimization is enabled with `200` runs
- You're using the flattened contract file
- Constructor arguments are correct

### Issue: "Constructor arguments don't match"

**Solution**: Double-check the ABI-encoded constructor arguments match:
- QT Token: `0x541529ADB3f344128aa87917fd2926E7D240FB07`
- Admin Signer: `0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F`

### Issue: "License doesn't match"

**Solution**: Make sure you select "MIT License (MIT)" in the verification form

---

## ✅ After Verification

Once verified, you'll be able to:
- View the contract source code on BaseScan
- Interact with the contract functions
- See all contract events
- Verify contract security

---

## 📝 Notes

- The flattened contract file is at: `contracts/BetModeVaultFlattened.sol`
- Manual verification is more reliable for contracts with OpenZeppelin imports
- Verification can take a few minutes to process


