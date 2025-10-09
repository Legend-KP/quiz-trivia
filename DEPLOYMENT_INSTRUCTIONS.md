# 🚀 Quiz Trivia Contract Deployment Instructions

## Option 1: Deploy via Remix IDE (Recommended - No Private Key Needed)

### Step 1: Go to Remix IDE
1. Open [Remix IDE](https://remix.ethereum.org) in your browser
2. Make sure you have MetaMask installed

### Step 2: Add the Contract
1. In Remix, create a new file called `QuizTriviaEntry.sol`
2. Copy the entire contract code from `contracts/QuizTriviaEntry.sol`
3. Paste it into the new file

### Step 3: Compile
1. Go to the "Solidity Compiler" tab
2. Select compiler version `0.8.19`
3. Click "Compile QuizTriviaEntry.sol"
4. Make sure there are no errors

### Step 4: Deploy to Base Sepolia
1. Go to "Deploy & Run Transactions" tab
2. Select "Injected Provider - MetaMask" as environment
3. **Important**: Switch MetaMask to Base Sepolia network
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.basescan.org

### Step 5: Get Testnet ETH
1. Go to [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
2. Connect your MetaMask wallet
3. Request testnet ETH (you'll get enough for deployment)

### Step 6: Deploy Contract
1. In Remix, click "Deploy" button
2. Confirm the transaction in MetaMask
3. Wait for deployment confirmation
4. **Copy the contract address** from the deployment log

### Step 7: Update Your App
1. Open `src/lib/wallet.ts`
2. Replace `'0xYOUR_DEPLOYED_CONTRACT_ADDRESS'` with your actual contract address
3. Save the file

## Option 2: Deploy via Hardhat (Requires Private Key)

If you want to use Hardhat, you need to:

1. **Get your private key from MetaMask:**
   - MetaMask → Account Details → Export Private Key
   - **⚠️ Never share this key with anyone!**

2. **Create .env file:**
   ```bash
   echo "PRIVATE_KEY=your_private_key_here" > .env
   ```

3. **Deploy:**
   ```bash
   npx hardhat run scripts/deploy.cjs --network baseSepolia
   ```

## Option 3: Deploy to Base Mainnet (Production)

For production deployment to Base Mainnet:

1. **Get Base Mainnet ETH** (real ETH, not testnet)
2. **Update hardhat.config.cjs** to include Base Mainnet:
   ```javascript
   networks: {
     base: {
       url: "https://mainnet.base.org",
       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
       chainId: 8453,
     },
     // ... other networks
   }
   ```

3. **Deploy:**
   ```bash
   npx hardhat run scripts/deploy.cjs --network base
   ```

## 🔍 Verify Contract (Optional)

After deployment, you can verify the contract on BaseScan:

1. Go to [BaseScan](https://basescan.org) (or [Base Sepolia](https://sepolia.basescan.org) for testnet)
2. Find your contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Follow the verification steps

## ✅ Test Your Deployment

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Test the flow:**
   - Click any quiz mode button
   - Connect MetaMask
   - Confirm transaction
   - Quiz should start after confirmation

## 🎉 Success!

Your Quiz Trivia app now has blockchain integration! Users will:
- Pay ~$0.001 to start quizzes
- Create permanent on-chain records
- Experience Web3 functionality

## 📊 Contract Features

- **Entry Fee**: 0.001 ETH per quiz
- **Quiz Modes**: Classic, Time Mode, Challenge
- **Statistics**: Track total quizzes and user counts
- **Events**: Emit QuizStarted and QuizCompleted events
- **Owner Functions**: Withdraw fees, view statistics

## 🚨 Important Notes

- **Testnet First**: Always test on Base Sepolia before mainnet
- **Private Key Security**: Never commit private keys to git
- **Gas Fees**: Base network has very low gas fees (~$0.001)
- **Network Switching**: App will prompt users to switch networks
