# ✅ Standard JSON Input Verification (Recommended)

## 🎯 Why Use Standard JSON Input?

"Single file" verification can be finicky. **Standard JSON Input** is more reliable because it gives BaseScan:
- Complete compiler settings
- Source code mapping
- Better error messages

---

## 📋 Step-by-Step Instructions

### Step 1: Generate Standard JSON File

Run:
```bash
node scripts/generate-standard-json.cjs
```

This creates: `standard-json-input-betmode.json`

### Step 2: Go to BaseScan

Visit: https://basescan.org/address/0x5fD8503003efD9B9d558ca86De6da0c5BB00c263

### Step 3: Start Verification

1. Click **"Contract"** tab
2. Click **"Verify and Publish"**
3. Select **"Solidity (Standard JSON Input)"** ⭐ (NOT "Single file")

### Step 4: Upload JSON File

1. Click **"Choose File"** or drag and drop
2. Select: `standard-json-input-betmode.json`
3. File will be uploaded automatically

### Step 5: Fill Remaining Fields

**Compiler Version:**
```
v0.8.20+commit.a1b79de6
```

**Contract Name:**
```
BetModeVault
```

**Constructor Arguments (ABI-encoded):**
```
0x000000000000000000000000541529adb3f344128aa87917fd2926e7d240fb0700000000000000000000000055b2ed149545bb4af2977eeb0bff91f030b8bd5f
```

### Step 6: Submit

Click **"Verify and Publish"**

---

## ✅ Advantages of Standard JSON Input

- ✅ More reliable than "Single file"
- ✅ Includes all compiler settings
- ✅ Better error messages if something's wrong
- ✅ BaseScan can match bytecode more accurately

---

## 🆘 If Still Failing

If Standard JSON Input also fails, the issue might be:

1. **Compiler version mismatch** - Check BaseScan error for exact version
2. **Contract was deployed with different settings** - Check deployment transaction
3. **Source code changed** - Make sure you're verifying the right contract

**Check the deployment transaction** to see what compiler settings were actually used.

---

**Try Standard JSON Input - it's more reliable!** 🚀



