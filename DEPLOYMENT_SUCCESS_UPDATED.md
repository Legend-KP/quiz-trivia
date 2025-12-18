# ✅ BetModeVault Contract Deployment - UPDATED VERSION

## 🎉 Deployment Successful!

**Contract Address**: `0x5fD8503003efD9B9d558ca86De6da0c5BB00c263`  
**Network**: Base Mainnet (Chain ID: 8453)  
**BaseScan**: https://basescan.org/address/0x5fD8503003efD9B9d558ca86De6da0c5BB00c263

**Deployment Date**: $(date)  
**Deployer Address**: `0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F`

---

## 📋 Contract Configuration

- **QT Token Address**: `0x541529ADB3f344128aa87917fd2926E7D240FB07`
- **Admin Signer Address**: `0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F`
- **Contract Owner**: `0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F`
- **Min Deposit**: 1,000 QT
- **Min Withdrawal**: 1,000 QT

---

## 🆕 New Features in This Deployment

This updated contract includes **admin functions for syncing game outcomes**:

1. **`creditWinnings(address user, uint256 amount)`**
   - Credits profit to user balance after game wins
   - Only owner can call
   - Emits `WinningsCredited` event

2. **`debitLoss(address user, uint256 amount)`**
   - Debits bet amount from user balance after game losses
   - Only owner can call
   - Emits `LossDebited` event

3. **`adjustBalance(address user, uint256 newBalance)`**
   - Adjusts user balance for reconciliation
   - Only owner can call
   - Emits `BalanceAdjusted` event

---

## 🔧 Next Steps

### 1. Update Environment Variables

#### Local Development (`.env.local`)

Add these variables:

```env
NEXT_PUBLIC_BET_MODE_VAULT_ADDRESS=0x5fD8503003efD9B9d558ca86De6da0c5BB00c263
BET_MODE_VAULT_ADDRESS=0x5fD8503003efD9B9d558ca86De6da0c5BB00c263
CONTRACT_OWNER_PRIVATE_KEY=your_owner_wallet_private_key
ADMIN_SIGNER_ADDRESS=0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F
ADMIN_SIGNER_PRIVATE_KEY=your_admin_signer_private_key
```

**Important**: 
- `CONTRACT_OWNER_PRIVATE_KEY` is the private key of the contract owner (deployer)
- This is used by the backend to call `creditWinnings()`, `debitLoss()`, and `adjustBalance()`
- Keep this secure and never commit it to Git

#### Vercel Production

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   - `NEXT_PUBLIC_BET_MODE_VAULT_ADDRESS` = `0x5fD8503003efD9B9d558ca86De6da0c5BB00c263`
   - `BET_MODE_VAULT_ADDRESS` = `0x5fD8503003efD9B9d558ca86De6da0c5BB00c263`
   - `CONTRACT_OWNER_PRIVATE_KEY` = (your owner wallet private key)
   - `ADMIN_SIGNER_ADDRESS` = `0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F`
   - `ADMIN_SIGNER_PRIVATE_KEY` = (your admin signer private key)
3. Select **Production**, **Preview**, and **Development** environments
4. Click **Save**
5. **Redeploy** your application

---

### 2. Verify Contract on BaseScan (Optional)

You can verify the contract manually on BaseScan:

1. Go to: https://basescan.org/address/0x5fD8503003efD9B9d558ca86De6da0c5BB00c263
2. Click **"Contract"** tab
3. Click **"Verify and Publish"**
4. Select **"Solidity (Standard JSON Input)"**
5. Upload the contract source code

Or use Hardhat (if API is fixed):
```bash
npx hardhat verify --network base 0x5fD8503003efD9B9d558ca86De6da0c5BB00c263 0x541529ADB3f344128aa87917fd2926E7D240FB07 0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F
```

---

### 3. Test the Contract

#### Test 1: Check Contract Info

```bash
npx hardhat console --network base
```

Then in console:
```javascript
const BetModeVault = await ethers.getContractFactory("contracts/BetModeVault.sol:BetModeVault");
const vault = BetModeVault.attach("0x5fD8503003efD9B9d558ca86De6da0c5BB00c263");

// Check contract info
await vault.qtToken();
await vault.adminSigner();
await vault.MIN_DEPOSIT();
await vault.owner();
```

#### Test 2: Test Deposit Flow

1. User approves contract to spend QT tokens
2. User calls `deposit(amount)` on the contract
3. Check BaseScan for the `Deposited` event
4. Verify database is updated

#### Test 3: Test Game Outcome Sync

1. User wins a game → Backend calls `creditWinnings()`
2. User loses a game → Backend calls `debitLoss()`
3. Check BaseScan for events
4. Verify contract balance matches database balance

---

## 🔄 How Game Outcome Sync Works

### When User Wins:

1. **Database Update**: Backend credits `qtBalance` with payout
2. **Contract Sync**: Backend calls `creditWinnings(userAddress, profit)`
   - `profit = payout - betAmount` (only profit is credited)
   - Contract balance increases by profit amount
3. **Event**: `WinningsCredited` event is emitted

### When User Loses:

1. **Database Update**: Backend releases `qtLockedBalance` (bet is lost)
2. **Contract Sync**: Backend calls `debitLoss(userAddress, betAmount)`
   - Contract balance decreases by bet amount
3. **Event**: `LossDebited` event is emitted

### Reconciliation:

If balances get out of sync, use `adjustBalance()` to fix:
```javascript
await vault.adjustBalance(userAddress, newBalance);
```

---

## ⚠️ Important Security Notes

1. **Contract Owner**: The deployer address (`0x55b2ED149545bb4AF2977eeb0bfF91f030b8BD5F`) is the contract owner
   - Only this address can call `creditWinnings()`, `debitLoss()`, and `adjustBalance()`
   - Keep the private key secure!

2. **Admin Signer**: Used for signing withdrawal requests
   - Can be different from contract owner
   - Keep the private key secure!

3. **Gas Costs**: Each `creditWinnings()` and `debitLoss()` call costs gas
   - Paid by contract owner
   - Consider batching updates for high-volume scenarios

4. **Error Handling**: Contract sync failures are logged but don't block game flow
   - Add reconciliation job to catch missed syncs
   - Monitor contract events for discrepancies

---

## 📊 Contract Functions Summary

### User Functions:
- `deposit(uint256 amount)` - Deposit QT tokens
- `withdraw(uint256 amount, uint256 nonce, bytes signature)` - Withdraw QT tokens

### Owner Functions:
- `creditWinnings(address user, uint256 amount)` - Credit winnings after game win
- `debitLoss(address user, uint256 amount)` - Debit loss after game loss
- `adjustBalance(address user, uint256 newBalance)` - Adjust balance for reconciliation
- `ownerWithdraw(uint256 amount)` - Owner withdraws funds
- `updateAdminSigner(address newSigner)` - Update admin signer
- `pause()` / `unpause()` - Emergency pause/unpause

### View Functions:
- `getBalance(address user)` - Get user balance
- `getUserStats(address user)` - Get user statistics
- `getContractBalance()` - Get total contract balance
- `checkBalanceIntegrity()` - Check if balances match

---

## ✅ Deployment Checklist

- [x] Contract deployed successfully
- [ ] Contract verified on BaseScan (optional)
- [ ] Environment variables updated (local)
- [ ] Environment variables updated (Vercel)
- [ ] `CONTRACT_OWNER_PRIVATE_KEY` set in environment
- [ ] Event listeners initialized
- [ ] Test deposit flow works
- [ ] Test withdrawal flow works
- [ ] Test game win sync works
- [ ] Test game loss sync works
- [ ] Database syncs correctly

---

## 🎉 Success!

Your updated BetModeVault contract is now deployed and ready to sync game outcomes!

**Contract Address**: `0x5fD8503003efD9B9d558ca86De6da0c5BB00c263`  
**BaseScan**: https://basescan.org/address/0x5fD8503003efD9B9d558ca86De6da0c5BB00c263

Make sure to update your environment variables and redeploy your application!

