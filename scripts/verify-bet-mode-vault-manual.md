# Manual Contract Verification on BaseScan

Since automatic verification is having issues, here's how to verify manually:

## Step 1: Flatten the Contract

The contract has already been flattened to `contracts/BetModeVaultFlattened.sol`

## Step 2: Verify on BaseScan

1. Go to: https://basescan.org/address/0xD9DaF0183265cf600F0e2df6aD2dE4F0334B15B3
2. Click the **"Contract"** tab
3. Click **"Verify and Publish"**
4. Fill in the form:

### Contract Details:
- **Compiler Type**: Solidity (Single file)
- **Compiler Version**: `v0.8.20+commit.a1b79de6` (or select 0.8.20)
- **License**: MIT
- **Open Source License Type**: MIT License (MIT)

### Constructor Arguments:
```
000000000000000000000000541529adb3f344128aa87917fd2926e7d240fb0700000000000000000000000055b2ed149545bb4af2977eeb0bff91f030b8bd5f
```

This is the ABI-encoded constructor arguments:
- QT Token Address: `0x541529ADB3f344128aa87917fd2926E7D240FB07`
- Admin Signer Address: `0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F`

### Contract Source Code:
Copy the entire contents of `contracts/BetModeVaultFlattened.sol` and paste it into the "Enter the Solidity Contract Code below" field.

### Optimization:
- **Yes** (Optimization enabled)
- **Runs**: `200`

5. Click **"Verify and Publish"**

---

## Alternative: Use Hardhat Verify with Flattened Contract

If you want to try automatic verification again, you can use:

```bash
npx hardhat verify --network base 0xD9DaF0183265cf600F0e2df6aD2dE4F0334B15B3 0x541529ADB3f344128aa87917fd2926E7D240FB07 0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F --contract contracts/BetModeVault.sol:BetModeVault
```

But manual verification is usually more reliable for contracts with imports.


