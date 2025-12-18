# QT Token Placement Details

## Overview
This document details where QT (Quiz Trivia) tokens are placed/stored across the entire system.

**QT Token Contract Address:** `0x541529ADB3f344128aa87917fd2926E7D240FB07`  
**Blockchain:** Base (Layer 2 of Ethereum)  
**Total Supply:** 100,000,000,000 QT (100 billion tokens)  
**Decimals:** 18

---

## 📍 QT Token Storage Locations

### 1. **BetModeVault Smart Contract** 🏦
**Contract Address:** `0x9e64C4FAc590Cb159988B5b62655BBd16aeE8621`  
**BaseScan:** https://basescan.org/address/0x9e64C4FAc590Cb159988B5b62655BBd16aeE8621

**Purpose:** Custodial vault that holds ALL user-deposited QT tokens for Bet Mode gameplay.

**Key Details:**
- **Minimum Deposit:** 1,000 QT (1K QT)
- **Minimum Withdrawal:** 1,000 QT (1K QT)
- **Storage Type:** Fully custodial - contract holds all user funds
- **Total Balance:** Tracked via `totalContractBalance` state variable
- **User Balances:** Tracked via `userBalances` mapping

**How It Works:**
1. Users deposit QT tokens → Tokens are transferred to the contract
2. Contract tracks each user's balance internally
3. Users can withdraw with admin signature authorization
4. Owner can withdraw funds (for burns, platform fees, etc.)

**Current Status:**
- Contract balance can be checked via `qtToken.balanceOf(address(this))`
- Database syncs with contract events for balance tracking
- Reconciliation cron job ensures database matches contract

---

### 2. **QTRewardDistributor Smart Contract** 🎁
**Purpose:** Distributes QT tokens as rewards for quiz achievements.

**Key Details:**
- **Reward Amount:** 10,000 QT per claim
- **Claim Frequency:** Once per day per user
- **Storage:** Contract holds QT tokens that are distributed to users

**How It Works:**
1. Owner deposits QT tokens into the contract
2. Users claim rewards (10,000 QT each)
3. Contract transfers QT to user's wallet
4. Tracks last claim date per user

**Current Status:**
- Contract balance checked via `getQTBalance()` function
- Requires sufficient QT tokens in contract for claims
- Owner can deposit/withdraw QT tokens

---

### 3. **DailyRewardDistributor Smart Contract** 📅
**Purpose:** Distributes daily QT token rewards to users.

**Key Details:**
- **Reward Amount:** 1,000 QT per claim
- **Claim Frequency:** Once per day per user
- **Storage:** Contract holds QT tokens for daily distribution

**How It Works:**
1. Owner deposits QT tokens into the contract
2. Users claim daily reward (1,000 QT each)
3. Contract transfers QT to user's wallet
4. Tracks last claim date per user

**Current Status:**
- Contract balance checked via `getQTBalance()` function
- Requires sufficient QT tokens in contract for claims
- Owner can deposit/withdraw QT tokens

---

### 4. **User Wallets (On-Chain)** 💼
**Purpose:** Users' personal QT token balances stored on the Base blockchain.

**Key Details:**
- **Storage Type:** Decentralized - users control their own wallets
- **Balance Check:** Via `balanceOf(address)` on QT token contract
- **Access:** Users control via MetaMask, Coinbase Wallet, etc.

**How It Works:**
1. Users receive QT tokens from:
   - Daily rewards (1,000 QT)
   - Quiz rewards (10,000 QT)
   - Bet Mode withdrawals
   - Direct transfers from other users
2. Users can:
   - Transfer QT to other addresses
   - Deposit to BetModeVault
   - Trade on DEXs (Uniswap, Aerodrome)
   - Hold in wallet

**Current Status:**
- Balance checked via API: `/api/bet-mode/status?fid={fid}&walletAddress={address}`
- Real-time on-chain balance via RPC calls

---

### 5. **MongoDB Database (Internal Tracking)** 🗄️
**Collection:** `currency_accounts`

**Purpose:** Tracks internal QT balances, deposits, withdrawals, and game statistics.

**Key Fields:**
```typescript
{
  fid: number;                    // Farcaster ID
  qtBalance: number;              // Internal QT balance (deposited to platform)
  qtLockedBalance: number;        // QT locked in active games
  qtTotalDeposited: number;       // Real QT deposited from blockchain
  qtTotalWithdrawn: number;       // Real QT withdrawn to blockchain
  qtTotalWagered: number;         // Total bet in Bet Mode
  qtTotalWon: number;             // Total won in Bet Mode
}
```

**How It Works:**
1. **qtBalance:** Internal balance after depositing to BetModeVault
   - Increases when user deposits
   - Decreases when user withdraws or bets
2. **qtLockedBalance:** QT locked in active Bet Mode games
   - Increases when game starts
   - Decreases when game ends (win/loss)
3. **qtTotalDeposited:** Lifetime total of QT deposited to contract
4. **qtTotalWithdrawn:** Lifetime total of QT withdrawn from contract
5. **qtTotalWagered:** Total QT bet across all games
6. **qtTotalWon:** Total QT won across all games

**Current Status:**
- Synced with BetModeVault contract events
- Reconciliation cron job ensures accuracy
- API endpoint: `/api/bet-mode/status?fid={fid}`

---

## 💰 QT Token Flow

### **Deposit Flow (User → BetModeVault)**
```
User Wallet (QT tokens)
    ↓ [Approve + Transfer]
BetModeVault Contract (Holds tokens)
    ↓ [Event: Deposited]
MongoDB Database (Updates qtBalance, qtTotalDeposited)
```

### **Withdrawal Flow (BetModeVault → User)**
```
BetModeVault Contract (Holds tokens)
    ↓ [Admin Signature + Transfer]
User Wallet (Receives QT tokens)
    ↓ [Event: Withdrawn]
MongoDB Database (Updates qtBalance, qtTotalWithdrawn)
```

### **Reward Distribution Flow**
```
QTRewardDistributor Contract (Holds QT)
    ↓ [User Claims]
User Wallet (Receives 10,000 QT)

DailyRewardDistributor Contract (Holds QT)
    ↓ [User Claims]
User Wallet (Receives 1,000 QT)
```

---

## 💰 Intended QT Funding Amounts (From Scripts)

Based on the funding scripts in the codebase, here are the **intended amounts** to be sent to each contract:

| Contract | Script Default Amount | Purpose | Notes |
|----------|---------------------|---------|-------|
| **BetModeVault** | **200,000,000 QT** (200M) | Initial platform funding | From `fund-bet-mode-vault.cjs` |
| **QTRewardDistributor** | **1,000,000 QT** (1M) | Quiz achievement rewards | From `deposit-qt-tokens.cjs` (default, can be overridden) |
| **DailyRewardDistributor** | **100,000,000 QT** (100M) | Daily claim rewards | From `deposit-daily-reward-tokens.cjs` (default, can be overridden) |

**⚠️ Important:** These are the **script defaults**. Actual amounts may differ if:
- Scripts were executed with different `DEPOSIT_AMOUNT` environment variables
- Additional deposits were made after initial funding
- Tokens were withdrawn from contracts

**Total Intended Funding:** ~301,000,000 QT (301 million QT)

---

## 📊 Current QT Distribution (Estimated)

Based on the codebase structure:

| Location | Purpose | Estimated Amount | Notes |
|----------|---------|-----------------|-------|
| **Uniswap V4 Pool** | Trading liquidity | ~65.7B QT (65.72%) | DEX liquidity pool |
| **User Wallets** | Community holdings | ~22B QT (22.31%) | Early buyers, traders |
| **Creator Wallet** | Creator allocation | ~7B QT (6.97%) | Unlocked tokens |
| **Clanker Vault** | Locked creator tokens | 5B QT (5.00%) | Vesting (30-day lock + 30-day vest) |
| **BetModeVault** | Bet Mode deposits | Variable | User deposits + initial funding (200M intended) |
| **QTRewardDistributor** | Quiz rewards | Variable | Needs funding for 10K QT rewards (1M intended) |
| **DailyRewardDistributor** | Daily rewards | Variable | Needs funding for 1K QT rewards (100M intended) |

---

## 🔍 How to Check QT Balances

### **1. Check BetModeVault Contract Balance**
```bash
# Via BaseScan
https://basescan.org/address/0x9e64C4FAc590Cb159988B5b62655BBd16aeE8621

# Via API
GET /api/bet-mode/status?fid={fid}
```

### **2. Check User Wallet Balance**
```bash
# Via BaseScan
https://basescan.org/token/0x541529ADB3f344128aa87917fd2926E7D240FB07?a={walletAddress}

# Via API
GET /api/bet-mode/status?fid={fid}&walletAddress={address}
```

### **3. Check Database Balance**
```bash
# Via API
GET /api/bet-mode/status?fid={fid}
# Returns: qtBalance, qtLockedBalance, availableBalance, etc.
```

### **4. Check Reward Distributor Balances**

**QTRewardDistributor:**
```bash
# Check on BaseScan (need contract address from deployment)
# Or use contract's getQTBalance() function
```

**DailyRewardDistributor:**
```bash
# Check on BaseScan (need contract address from deployment)
# Or use contract's getQTBalance() function
```

**Note:** Contract addresses for reward distributors need to be retrieved from deployment scripts or environment variables.

---

## ⚠️ Important Notes

1. **BetModeVault is Custodial:**
   - Contract holds ALL user-deposited QT tokens
   - Users cannot withdraw without admin signature
   - Owner can withdraw funds (use responsibly)

2. **Minimum Amounts:**
   - BetModeVault: 1,000 QT minimum deposit/withdrawal
   - Smaller amounts must be accumulated first

3. **Database vs Contract:**
   - Database tracks internal balances
   - Contract holds actual QT tokens
   - Reconciliation ensures they match

4. **Reward Distributors:**
   - Must be funded with QT tokens
   - Insufficient balance = claims fail
   - Owner can deposit/withdraw as needed

5. **Total Supply:**
   - Fixed at 100 billion QT
   - Cannot be increased
   - Can be decreased via burns (future feature)

---

## 🔄 Reconciliation Process

A cron job runs periodically to ensure database balances match contract balances:

**Endpoint:** `/api/cron/reconcile-balances`

**Process:**
1. Fetches all users with wallet addresses
2. Gets contract balance via `getUserStats(walletAddress)`
3. Compares with database `qtBalance`
4. Logs mismatches (tolerance: 0.01 QT)
5. Can auto-fix if configured

---

## 📝 Summary

### **Total QT Sent to Contracts (Intended):**

| Contract | Intended Amount |
|----------|----------------|
| **BetModeVault** | 200,000,000 QT (200M) |
| **QTRewardDistributor** | 1,000,000 QT (1M) |
| **DailyRewardDistributor** | 100,000,000 QT (100M) |
| **TOTAL** | **301,000,000 QT (301M)** |

**To verify actual amounts sent:**
1. Check contract balances on BaseScan using the contract addresses
2. Use the contract's `getQTBalance()` or `balanceOf()` functions
3. Review transaction history on BaseScan for deposit transactions

---

### **QT Token Storage Locations:**

QT tokens are placed in:
1. **Smart Contracts** (BetModeVault, Reward Distributors) - Holds tokens for platform operations
2. **User Wallets** - Decentralized storage, users control
3. **Liquidity Pools** (Uniswap) - Enables trading
4. **Database** - Tracks internal balances and statistics

The system uses a hybrid approach:
- **On-chain:** Actual QT token storage (contracts, wallets)
- **Off-chain:** Balance tracking and game state (MongoDB)

All on-chain balances are verifiable on BaseScan, ensuring transparency and trust.

