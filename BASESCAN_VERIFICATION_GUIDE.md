# BaseScan Manual Verification Guide

## ✅ Flattened Contract Ready

The contract has been flattened and cleaned. Use `BetModeVault_flat.sol` for manual verification.

---

## 📋 Step-by-Step Verification Instructions

### Step 1: Go to BaseScan Contract Page

Visit: https://basescan.org/address/0x5fD8503003efD9B9d558ca86De6da0c5BB00c263

### Step 2: Click "Contract" Tab

Then click **"Verify and Publish"**

### Step 3: Select Verification Method

Choose **"Solidity (Single file)"**

### Step 4: Fill in Contract Details

**Contract Address:**
```
0x5fD8503003efD9B9d558ca86De6da0c5BB00c263
```

**Compiler Type:**
```
Solidity (Single file)
```

**Compiler Version:**
```
v0.8.20+commit.a1b79de6
```

**Optimization:**
- **Enabled**: `Yes`
- **Runs**: `200`

**Contract Name:**
```
BetModeVault
```

### Step 5: Paste Source Code

Open `BetModeVault_flat.sol` and copy **ALL** its contents, then paste into the "Enter the Solidity Contract Code" field.

**Important**: The flattened file contains all OpenZeppelin code inlined - no imports needed!

### Step 6: Constructor Arguments

Your constructor signature:
```solidity
constructor(address _qtToken, address _adminSigner)
```

**Constructor Arguments** (enter as comma-separated addresses):
```
0x541529ADB3f344128aa87917fd2926E7D240FB07,0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F
```

**Or if BaseScan asks for ABI-encoded:**
```
000000000000000000000000541529adb3f344128aa87917fd2926e7d240fb0700000000000000000000000055b2ed149545bb4af2977eeb0bff91f030b8bd5f
```

### Step 7: Submit

Click **"Verify and Publish"**

---

## ✅ Expected Result

After successful verification, you should see:
- ✅ Contract verified
- ✅ Source code visible on BaseScan
- ✅ Contract functions readable
- ✅ Events visible

---

## 🆘 Troubleshooting

### Error: "Unable to find matching Contract Bytecode"

**Possible causes:**
1. **Wrong compiler version** - Make sure it's exactly `v0.8.20+commit.a1b79de6`
2. **Optimization mismatch** - Must be enabled with 200 runs
3. **Constructor args wrong** - Double-check the addresses
4. **File not fully copied** - Make sure you copied the entire `BetModeVault_flat.sol` file

**Solution:**
- Check the contract's bytecode on BaseScan (scroll down on contract page)
- Compare with your local compilation
- Ensure all settings match exactly

### Error: "ParserError" or "Syntax Error"

**Possible causes:**
- File wasn't cleaned properly
- Missing SPDX or pragma at top

**Solution:**
- Make sure file starts with:
  ```solidity
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.20;
  ```
- Re-run `node scripts/clean-flattened.js` if needed

### Error: "Constructor arguments mismatch"

**Solution:**
- Try both formats:
  1. Comma-separated: `0x...,0x...`
  2. ABI-encoded hex: `000000000000000000000000...`
- BaseScan sometimes accepts either format

---

## 📝 File Location

**Flattened Contract**: `BetModeVault_flat.sol` (in project root)

**Cleaned**: ✅ Yes (duplicate SPDX and pragma removed)

**Ready for Verification**: ✅ Yes

---

## 🎯 Quick Checklist

- [ ] Opened BaseScan contract page
- [ ] Clicked "Verify and Publish"
- [ ] Selected "Solidity (Single file)"
- [ ] Set compiler: `v0.8.20+commit.a1b79de6`
- [ ] Enabled optimization: `Yes` (200 runs)
- [ ] Pasted entire `BetModeVault_flat.sol` content
- [ ] Entered constructor args
- [ ] Clicked "Verify and Publish"

---

**Good luck!** The flattened file is ready - just copy and paste! 🚀

