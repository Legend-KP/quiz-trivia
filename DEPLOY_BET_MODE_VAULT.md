# 🚀 Deploy BetModeVault Contract to Base Mainnet

Complete step-by-step guide to deploy the BetModeVault smart contract.

---

## 📋 Prerequisites

1. **Node.js** and **npm** installed
2. **Hardhat** configured (already done)
3. **Base Mainnet** ETH for gas fees (at least 0.01 ETH recommended)
4. **QT Token Address** (already have: `0x541529ADB3f344128aa87917fd2926E7D240FB07`)
5. **Admin Signer Address** (the address that will sign withdrawal requests)

---

## 🔧 Step 1: Prepare Environment Variables

### Option A: Admin Signer is Same as Deployer

If your admin signer is the same wallet you're deploying from:

```bash
# Get the address from your private key
node -e "const { ethers } = require('ethers'); const wallet = new ethers.Wallet(process.env.PRIVATE_KEY); console.log('Admin Signer Address:', wallet.address);"
```

### Option B: Admin Signer is Different Wallet

If you have a separate wallet for admin signing:

1. Get the address of that wallet
2. Use that address as `ADMIN_SIGNER_ADDRESS`

### Update `.env` File

Add these to your `.env` file (or `.env.local`):

```env
# Your deployer private key (must have Base ETH for gas)
PRIVATE_KEY=0x...

# QT Token Address (already configured)
QT_TOKEN_ADDRESS=0x541529ADB3f344128aa87917fd2926E7D240FB07
NEXT_PUBLIC_QT_TOKEN_ADDRESS=0x541529ADB3f344128aa87917fd2926E7D240FB07

# Admin Signer Address (the address that will sign withdrawals)
ADMIN_SIGNER_ADDRESS=0x...

# Base RPC URL (already configured)
BASE_RPC_URL=https://mainnet.base.org
```

---

## 🚀 Step 2: Deploy the Contract

Run the deployment script:

```bash
npx hardhat run scripts/deploy-bet-mode-vault.cjs --network base
```

### Expected Output:

```
🚀 Deploying BetModeVault Contract to Base Mainnet...

📋 Deployment Details:
- Deployer Address: 0x...
- Deployer Balance: 0.05 ETH
- QT Token Address: 0x541529ADB3f344128aa87917fd2926E7D240FB07
- Admin Signer Address: 0x...
- Network: Base Mainnet (Chain ID: 8453)

📦 Compiling contract...
🚀 Deploying contract...
⏳ Waiting for deployment transaction to be mined...

✅ Deployment Successful!
📍 Contract Address: 0x...
🔗 BaseScan: https://basescan.org/address/0x...

🔍 Verifying deployment...
✅ QT Token Address: 0x541529ADB3f344128aa87917fd2926E7D240FB07
✅ Admin Signer Address: 0x...
✅ Min Deposit: 1000.0 QT
✅ Min Withdrawal: 1000.0 QT
✅ Owner: 0x...

📝 Next Steps:
1. Update your .env.local file:
   NEXT_PUBLIC_BET_MODE_VAULT_ADDRESS=0x...
   BET_MODE_VAULT_ADDRESS=0x...
...
```

---

## ✅ Step 3: Verify Contract on BaseScan

After deployment, verify the contract so it's readable on BaseScan:

```bash
npx hardhat run scripts/verify-bet-mode-vault.cjs --network base <CONTRACT_ADDRESS> <QT_TOKEN_ADDRESS> <ADMIN_SIGNER_ADDRESS>
```

Or use Hardhat directly:

```bash
npx hardhat verify --network base <CONTRACT_ADDRESS> <QT_TOKEN_ADDRESS> <ADMIN_SIGNER_ADDRESS>
```

**Example:**
```bash
npx hardhat verify --network base 0x1234... 0x541529ADB3f344128aa87917fd2926E7D240FB07 0x5678...
```

---

## 🔐 Step 4: Update Environment Variables

### Local Development (`.env.local`)

Add the contract address:

```env
NEXT_PUBLIC_BET_MODE_VAULT_ADDRESS=0x...
BET_MODE_VAULT_ADDRESS=0x...
ADMIN_SIGNER_ADDRESS=0x...
ADMIN_SIGNER_PRIVATE_KEY=0x...  # Private key of admin signer address
```

### Vercel Production

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:

```
NEXT_PUBLIC_BET_MODE_VAULT_ADDRESS = 0x...
BET_MODE_VAULT_ADDRESS = 0x...
ADMIN_SIGNER_ADDRESS = 0x...
ADMIN_SIGNER_PRIVATE_KEY = 0x...
```

4. Select **Production**, **Preview**, and **Development** environments
5. Click **Save**
6. **Redeploy** your application

---

## 🧪 Step 5: Test the Deployment

### Test 1: Check Contract Info

Create a test script or use Hardhat console:

```bash
npx hardhat console --network base
```

Then in the console:

```javascript
const BetModeVault = await ethers.getContractFactory("BetModeVault");
const vault = BetModeVault.attach("YOUR_CONTRACT_ADDRESS");

// Check contract info
await vault.qtToken();
await vault.adminSigner();
await vault.MIN_DEPOSIT();
await vault.owner();
```

### Test 2: Test Deposit (Optional)

If you want to test a deposit:

1. Approve the contract to spend QT tokens
2. Call `deposit(amount)` on the contract
3. Check the `Deposited` event on BaseScan

---

## 📝 Step 6: Initialize Event Listeners

After deployment, make sure your backend starts listening to contract events.

The event listeners are already set up in `src/lib/contract-listeners.ts`. 

To initialize them, import the initialization function in your main server file:

```typescript
// In your main server file (e.g., src/app/api/... or server.ts)
import { initializeBetModeServices } from '~/lib/server-init';

// This will auto-start when imported on server-side
```

Or manually start them:

```typescript
import { startEventListeners } from '~/lib/contract-listeners';

if (process.env.BET_MODE_VAULT_ADDRESS) {
  startEventListeners();
}
```

---

## 🔍 Step 7: Verify Everything Works

1. **Check Contract on BaseScan**
   - Visit: `https://basescan.org/address/YOUR_CONTRACT_ADDRESS`
   - Verify contract is verified (shows source code)
   - Check contract has correct QT token address
   - Check admin signer address is correct

2. **Test Deposit Flow**
   - Open your app
   - Go to Bet Mode
   - Try depositing QT tokens
   - Check BaseScan for the transaction
   - Verify database is updated (check MongoDB)

3. **Test Withdrawal Flow**
   - Try withdrawing QT tokens
   - Check BaseScan for the transaction
   - Verify database is updated

---

## ⚠️ Important Notes

1. **Gas Fees**: Make sure your deployer wallet has enough Base ETH for gas fees (recommend at least 0.01 ETH)

2. **Admin Signer**: The admin signer address must be the address corresponding to `ADMIN_SIGNER_PRIVATE_KEY`. This is used to sign withdrawal requests.

3. **Contract Owner**: The deployer address becomes the contract owner. Only the owner can:
   - Withdraw funds (for burns, platform fees)
   - Update admin signer
   - Pause/unpause the contract

4. **Security**: 
   - Keep your private keys secure
   - Never commit `.env` files to Git
   - Use separate wallets for deployer and admin signer if possible

5. **Event Listeners**: Make sure event listeners are running, otherwise deposits/withdrawals won't sync to the database automatically.

---

## 🆘 Troubleshooting

### Error: "Insufficient funds for gas"
- **Solution**: Add more Base ETH to your deployer wallet

### Error: "Contract already verified"
- **Solution**: This is fine, the contract is already verified

### Error: "Invalid address"
- **Solution**: Check that `QT_TOKEN_ADDRESS` and `ADMIN_SIGNER_ADDRESS` are valid Ethereum addresses

### Events not syncing to database
- **Solution**: 
  1. Check `BET_MODE_VAULT_ADDRESS` is set in environment
  2. Check event listeners are initialized
  3. Check MongoDB connection
  4. Check user lookup logic (wallet address matching)

---

## ✅ Deployment Checklist

- [ ] Contract deployed successfully
- [ ] Contract verified on BaseScan
- [ ] Environment variables updated (local)
- [ ] Environment variables updated (Vercel)
- [ ] Event listeners initialized
- [ ] Test deposit flow works
- [ ] Test withdrawal flow works
- [ ] Database syncs correctly
- [ ] Contract owner address saved securely

---

## 🎉 Success!

Once deployed, your Bet Mode will use the smart contract for deposits and withdrawals. All transactions are transparent and verifiable on BaseScan!

**Contract Address**: `0x...` (save this!)
**BaseScan**: `https://basescan.org/address/0x...`


