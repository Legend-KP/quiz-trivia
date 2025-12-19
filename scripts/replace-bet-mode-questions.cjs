/**
 * Replace Bet Mode Questions
 * 
 * This script safely:
 * 1. Removes all existing questions from bet_mode_questions collection
 * 2. Inserts 44 new questions for Bet Mode
 * 
 * ⚠️ WARNING: This will delete all existing questions. Use with caution!
 * 
 * Usage: node scripts/replace-bet-mode-questions.cjs
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'quiz_trivia';

// 50 Questions for Bet Mode
const QUESTIONS = [
  {
    id: 'bet_q1',
    text: 'Which situation most directly exposes a structural weakness in creator tokens during low activity?',
    options: [
      'Holder rewards decay when wallets go inactive',
      'Protocol emissions increase total supply',
      'Pricing curves flatten near equilibrium',
      'Liquidity thins as marginal buyers disappear on higher curve ranges'
    ],
    correctIndex: 3,
    difficulty: 'medium',
    explanation: 'Liquidity thinning occurs when fewer buyers participate at higher price points on bonding curves.',
    isActive: true,
  },
  {
    id: 'bet_q2',
    text: 'Which use case most often sustains demand for creator coins without direct financial yield?',
    options: [
      'Cross-creator reward aggregation',
      'Automated token rebasing',
      'Access to gated experiences or coordination rights',
      'Gasless transfers across chains'
    ],
    correctIndex: 2,
    difficulty: 'medium',
    explanation: 'Gated experiences and coordination rights provide non-financial utility that drives demand.',
    isActive: true,
  },
  {
    id: 'bet_q3',
    text: 'What factor is hardest to systematize for maintaining long-term demand for a creator coin?',
    options: [
      'Creator consistency in delivering ongoing utility',
      'Automatic fee redistribution',
      'Minimum staking duration',
      'Fixed emission schedules'
    ],
    correctIndex: 0,
    difficulty: 'medium',
    explanation: 'Creator consistency requires human effort and cannot be automated or systematized easily.',
    isActive: true,
  },
  {
    id: 'bet_q4',
    text: 'In a bonding-curve-based creator coin, what most directly determines price movement?',
    options: [
      'Changes in creator reach',
      'Aggregate net flow of buys vs sells',
      'Number of concurrent coin launches',
      'Volatility of base-layer gas fees'
    ],
    correctIndex: 1,
    difficulty: 'medium',
    explanation: 'Bonding curves respond directly to the balance of buy and sell pressure.',
    isActive: true,
  },
  {
    id: 'bet_q5',
    text: 'What is the primary purpose of a DID Document?',
    options: [
      'Persisting user-owned identity metadata',
      'Holding cryptographic asset balances',
      'Generating private keys deterministically',
      'Publishing verifiable authentication methods'
    ],
    correctIndex: 3,
    difficulty: 'medium',
    explanation: 'DID Documents contain public keys and authentication methods for verifiable identity.',
    isActive: true,
  },
  {
    id: 'bet_q6',
    text: 'Which mechanism enables selective disclosure without revealing full identity data?',
    options: [
      'Zero-Knowledge Proofs',
      'Proof-of-Authority',
      'Flash loan composability',
      'Liquidity pool snapshots'
    ],
    correctIndex: 0,
    difficulty: 'medium',
    explanation: 'Zero-Knowledge Proofs allow proving statements without revealing underlying data.',
    isActive: true,
  },
  {
    id: 'bet_q7',
    text: 'What emerged as the strongest long-term moat for AI–crypto projects in 2025?',
    options: [
      'Deflationary token economics',
      'Exclusive L1 ecosystem partnerships',
      'Tokenized GPU yield programs',
      'Decentralized inference and verification networks'
    ],
    correctIndex: 3,
    difficulty: 'hard',
    explanation: 'Decentralized inference and verification provide sustainable competitive advantages.',
    isActive: true,
  },
  {
    id: 'bet_q8',
    text: 'What change most altered competitive dynamics among L2s in 2025?',
    options: [
      'Introduction of alternative fee tokens',
      'Convergence toward universal provers',
      'Data availability pricing compression',
      'Replacing sequencers with validator pools'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    explanation: 'Universal provers enable cross-chain verification and change L2 competition.',
    isActive: true,
  },
  {
    id: 'bet_q9',
    text: 'Which statement best captures the execution–settlement relationship in modular architectures?',
    options: [
      'Execution layers self-finalize state transitions',
      'Settlement layers verify and finalize execution outputs',
      'Execution layers ensure data availability',
      'Settlement layers directly execute smart contracts'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    explanation: 'Settlement layers provide security and finality by verifying execution layer outputs.',
    isActive: true,
  },
  {
    id: 'bet_q10',
    text: 'Which L2 architecture fundamentally relies on fraud proofs for security?',
    options: [
      'Optimistic rollups',
      'zk-rollups',
      'Validiums',
      'State channels'
    ],
    correctIndex: 0,
    difficulty: 'medium',
    explanation: 'Optimistic rollups assume transactions are valid and use fraud proofs to challenge invalid ones.',
    isActive: true,
  },
  {
    id: 'bet_q11',
    text: 'Which signature scheme remains secure under known quantum attack models?',
    options: [
      'RSA-PSS',
      'DSA',
      'ECDSA',
      'Lamport signatures'
    ],
    correctIndex: 3,
    difficulty: 'hard',
    explanation: 'Lamport signatures are one-time signatures that resist quantum attacks.',
    isActive: true,
  },
  {
    id: 'bet_q12',
    text: 'Which cryptographic family is widely considered resilient against quantum attacks?',
    options: [
      'Classical Diffie–Hellman',
      'Lattice-based constructions',
      'Elliptic curve systems',
      'RSA-based schemes'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    explanation: 'Lattice-based cryptography is believed to be quantum-resistant.',
    isActive: true,
  },
  {
    id: 'bet_q13',
    text: 'What most clearly distinguishes Digital Asset Trusts (DATs) from crypto ETFs in practice?',
    options: [
      'DATs track fewer assets than ETFs',
      'DATs actively deploy capital on-chain',
      'ETFs rebalance more frequently',
      'ETFs custody assets directly'
    ],
    correctIndex: 1,
    difficulty: 'medium',
    explanation: 'DATs actively use on-chain strategies, while ETFs typically hold assets passively.',
    isActive: true,
  },
  {
    id: 'bet_q14',
    text: 'Which regulatory change materially improved balance-sheet treatment of digital assets?',
    options: [
      'Approval of spot Bitcoin ETFs',
      'ETH classified as a commodity',
      'Fair-value accounting for digital assets',
      'Capital gains exemptions on crypto'
    ],
    correctIndex: 2,
    difficulty: 'medium',
    explanation: 'Fair-value accounting allows companies to reflect current market value of digital assets.',
    isActive: true,
  },
  {
    id: 'bet_q15',
    text: 'Roughly what share of Bitcoin supply was held by DATs by late 2025?',
    options: [
      'About 3%',
      'Under 1%',
      'Near 10%',
      'Less than 0.25%'
    ],
    correctIndex: 0,
    difficulty: 'easy',
    explanation: 'DATs accumulated approximately 3% of Bitcoin supply by late 2025.',
    isActive: true,
  },
  {
    id: 'bet_q16',
    text: 'Which L1 explicitly combines identity verification with regulatory compliance?',
    options: [
      'Aleo',
      'Secret',
      'Aztec',
      'Concordium'
    ],
    correctIndex: 3,
    difficulty: 'medium',
    explanation: 'Concordium integrates identity verification with compliance features.',
    isActive: true,
  },
  {
    id: 'bet_q17',
    text: 'Which chain is purpose-built for parallel EVM execution with ultra-low latency?',
    options: [
      'Scroll',
      'Sui',
      'Monad',
      'Starknet'
    ],
    correctIndex: 2,
    difficulty: 'hard',
    explanation: 'Monad is designed specifically for parallel EVM execution with low latency.',
    isActive: true,
  },
  {
    id: 'bet_q18',
    text: 'Who introduced the Ordinals protocol on Bitcoin?',
    options: [
      'Vitalik Buterin',
      'Anatoly Yakovenko',
      'Gavin Wood',
      'Casey Rodarmor'
    ],
    correctIndex: 3,
    difficulty: 'easy',
    explanation: 'Casey Rodarmor created the Ordinals protocol for Bitcoin.',
    isActive: true,
  },
  {
    id: 'bet_q19',
    text: 'What fundamentally differentiates dynamic NFTs from static NFTs?',
    options: [
      'They cannot be freely traded',
      'Their metadata updates over time',
      'They must live off-chain',
      'They lack ownership guarantees'
    ],
    correctIndex: 1,
    difficulty: 'medium',
    explanation: 'Dynamic NFTs have metadata that can change based on external conditions or events.',
    isActive: true,
  },
  {
    id: 'bet_q20',
    text: 'In identity systems, what defines Soulbound Tokens by design?',
    options: [
      'Open transferability',
      'Use as DeFi collateral',
      'Permanent wallet binding',
      'Government-only issuance'
    ],
    correctIndex: 2,
    difficulty: 'medium',
    explanation: 'Soulbound Tokens are non-transferable and permanently bound to a wallet address.',
    isActive: true,
  },
  {
    id: 'bet_q21',
    text: 'Which ERC standard enables NFTs to act as smart contract wallets?',
    options: [
      'ERC-721',
      'ERC-1155',
      'ERC-6551',
      'ERC-998'
    ],
    correctIndex: 2,
    difficulty: 'hard',
    explanation: 'ERC-6551 allows NFTs to own assets and interact with dApps as smart contract wallets.',
    isActive: true,
  },
  {
    id: 'bet_q22',
    text: 'Recent T-REX developments position NFTs primarily as…',
    options: [
      'Tradable art primitives',
      'On-chain programmable entities',
      'Passive yield instruments',
      'Cross-chain routing tools'
    ],
    correctIndex: 1,
    difficulty: 'medium',
    explanation: 'T-REX standards enable NFTs to be programmable on-chain entities.',
    isActive: true,
  },
  {
    id: 'bet_q23',
    text: 'Which stablecoin was launched by Kazakhstan on Solana?',
    options: [
      'KZUSD',
      'Evo',
      'Tenge Coin',
      'SolKZT'
    ],
    correctIndex: 0,
    difficulty: 'easy',
    explanation: 'Kazakhstan launched KZUSD as a national stablecoin on Solana.',
    isActive: true,
  },
  {
    id: 'bet_q24',
    text: 'After its latest BTC addition, BlackRock\'s Bitcoin vault crossed approximately…',
    options: [
      '500k BTC',
      '750k BTC',
      '1M BTC',
      '350k BTC'
    ],
    correctIndex: 0,
    difficulty: 'easy',
    explanation: 'BlackRock\'s Bitcoin holdings exceeded 500k BTC.',
    isActive: true,
  },
  {
    id: 'bet_q25',
    text: 'How does intent-based execution differ from traditional cross-chain bridging?',
    options: [
      'Users define steps manually',
      'Gas costs are fully abstracted',
      'Relayers control execution',
      'Users specify outcomes, not routes'
    ],
    correctIndex: 3,
    difficulty: 'hard',
    explanation: 'Intent-based systems let users declare desired outcomes while solvers find optimal routes.',
    isActive: true,
  },
  {
    id: 'bet_q26',
    text: 'What is a core risk of shared cross-chain messaging layers?',
    options: [
      'Guaranteed safety across chains',
      'Elimination of asset transfers',
      'Expanded attack surface if compromised',
      'Forced consensus standardization'
    ],
    correctIndex: 2,
    difficulty: 'medium',
    explanation: 'Shared messaging layers create single points of failure affecting multiple chains.',
    isActive: true,
  },
  {
    id: 'bet_q27',
    text: 'Which exchange filed to list tokenized securities on its main market in Sept 2025?',
    options: [
      'NYSE',
      'Nasdaq',
      'CME',
      'BSE'
    ],
    correctIndex: 1,
    difficulty: 'easy',
    explanation: 'Nasdaq filed to list tokenized securities on its main market.',
    isActive: true,
  },
  {
    id: 'bet_q28',
    text: 'Which blockchain demonstrated ~1,000 TPS in a live test in Aug 2025?',
    options: [
      'Ethereum',
      'Solana',
      'Cardano',
      'Polkadot'
    ],
    correctIndex: 2,
    difficulty: 'medium',
    explanation: 'Cardano demonstrated approximately 1,000 transactions per second in testing.',
    isActive: true,
  },
  {
    id: 'bet_q29',
    text: 'Which action most directly creates MEV rather than merely capturing it?',
    options: [
      'Arbitrage price differences',
      'Reordering transactions within a block',
      'Broadcasting bundles privately',
      'Paying priority fees'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    explanation: 'Reordering transactions creates new value extraction opportunities, not just capturing existing ones.',
    isActive: true,
  },
  {
    id: 'bet_q30',
    text: 'What ultimately enforces correctness in optimistic rollups?',
    options: [
      'Validator stake',
      'Fraud proof challenges',
      'Sequencer reputation',
      'L1 finality latency'
    ],
    correctIndex: 1,
    difficulty: 'medium',
    explanation: 'Fraud proofs allow anyone to challenge and correct invalid state transitions.',
    isActive: true,
  },
  {
    id: 'bet_q31',
    text: 'Why is data availability critical for rollup security?',
    options: [
      'It lowers transaction fees',
      'It enables state reconstruction',
      'It prevents front-running',
      'It increases throughput'
    ],
    correctIndex: 1,
    difficulty: 'medium',
    explanation: 'Data availability allows reconstructing rollup state to verify correctness.',
    isActive: true,
  },
  {
    id: 'bet_q32',
    text: 'Which capability most clearly differentiates ERC-4337 wallets from EOAs?',
    options: [
      'Lower gas fees',
      'Signature aggregation',
      'Programmable validation logic',
      'Native cross-chain support'
    ],
    correctIndex: 2,
    difficulty: 'hard',
    explanation: 'ERC-4337 enables custom validation logic, unlike fixed EOA signature verification.',
    isActive: true,
  },
  {
    id: 'bet_q33',
    text: 'Which property makes zk-SNARKs less trusted than zk-STARKs?',
    options: [
      'Larger proof sizes',
      'Higher verification cost',
      'Requirement of a trusted setup',
      'Lack of recursion'
    ],
    correctIndex: 2,
    difficulty: 'hard',
    explanation: 'zk-SNARKs require a trusted setup ceremony, creating trust assumptions.',
    isActive: true,
  },
  {
    id: 'bet_q34',
    text: 'What is the primary systemic risk introduced by restaking protocols?',
    options: [
      'Reduced yield predictability',
      'Correlated slashing events',
      'Validator centralization',
      'Liquidity fragmentation'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    explanation: 'Restaking creates correlated slashing risks across multiple protocols.',
    isActive: true,
  },
  {
    id: 'bet_q35',
    text: 'What new risk emerges when multiple rollups rely on a shared sequencer?',
    options: [
      'Increased gas volatility',
      'Coordinated censorship',
      'Reduced composability',
      'Slower finality'
    ],
    correctIndex: 1,
    difficulty: 'medium',
    explanation: 'Shared sequencers can coordinate to censor transactions across multiple rollups.',
    isActive: true,
  },
  {
    id: 'bet_q36',
    text: 'Which mechanism most often appears deflationary while remaining inflationary in practice?',
    options: [
      'Fixed max supply',
      'Token burns funded by emissions',
      'Fee redistribution',
      'Time-locked vesting'
    ],
    correctIndex: 1,
    difficulty: 'medium',
    explanation: 'Burns funded by new emissions reduce net supply growth but don\'t make tokens deflationary.',
    isActive: true,
  },
  {
    id: 'bet_q37',
    text: 'What differentiates liquid restaking tokens from liquid staking tokens?',
    options: [
      'Redemption delay',
      'Exposure to additional slashing domains',
      'Validator delegation mechanics',
      'Reward compounding frequency'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    explanation: 'Liquid restaking tokens carry slashing risk from multiple protocols, not just one.',
    isActive: true,
  },
  {
    id: 'bet_q38',
    text: 'What problem does chain abstraction primarily attempt to solve?',
    options: [
      'Cross-chain security',
      'Liquidity fragmentation',
      'User cognitive overhead',
      'Consensus scalability'
    ],
    correctIndex: 2,
    difficulty: 'medium',
    explanation: 'Chain abstraction simplifies user experience by hiding blockchain complexity.',
    isActive: true,
  },
  {
    id: 'bet_q39',
    text: 'Which risk persists even with formally verified smart contracts?',
    options: [
      'Reentrancy',
      'Logic errors in specifications',
      'Integer overflow',
      'Unauthorized access'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    explanation: 'Formal verification proves code matches specs, but specs themselves may be wrong.',
    isActive: true,
  },
  {
    id: 'bet_q40',
    text: 'What makes algorithmic stablecoins structurally fragile?',
    options: [
      'Oracle dependency',
      'Reflexive demand dynamics',
      'Lack of custodians',
      'Slow settlement'
    ],
    correctIndex: 1,
    difficulty: 'hard',
    explanation: 'Reflexive demand creates feedback loops that can destabilize peg mechanisms.',
    isActive: true,
  },
  {
    id: 'bet_q41',
    text: 'Which layer is hardest to decentralize at scale in modular stacks?',
    options: [
      'Execution',
      'Settlement',
      'Data availability',
      'Networking'
    ],
    correctIndex: 2,
    difficulty: 'hard',
    explanation: 'Data availability requires significant infrastructure and bandwidth, making decentralization challenging.',
    isActive: true,
  },
  {
    id: 'bet_q42',
    text: 'Which condition most enables governance capture?',
    options: [
      'Token inflation',
      'Low voter participation',
      'High quorum thresholds',
      'Long voting periods'
    ],
    correctIndex: 1,
    difficulty: 'medium',
    explanation: 'Low participation allows small groups to control governance outcomes.',
    isActive: true,
  },
  {
    id: 'bet_q43',
    text: 'What role do wallets play in the agentic web?',
    options: [
      'Model execution hosts',
      'Identity-linked authorization agents',
      'Data availability layers',
      'Consensus participants'
    ],
    correctIndex: 1,
    difficulty: 'medium',
    explanation: 'Wallets act as authorization agents that link identity to on-chain actions.',
    isActive: true,
  },
  {
    id: 'bet_q44',
    text: 'What role do wallets play in the agentic web?',
    options: [
      'Model execution hosts',
      'Identity-linked authorization agents',
      'Data availability layers',
      'Consensus participants'
    ],
    correctIndex: 1,
    difficulty: 'medium',
    explanation: 'Wallets act as authorization agents that link identity to on-chain actions.',
    isActive: true,
  },
];

async function replaceQuestions() {
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    const db = client.db(dbName);
    const questionsCollection = db.collection('bet_mode_questions');

    // Step 1: Count existing questions
    const existingCount = await questionsCollection.countDocuments();
    console.log(`📊 Found ${existingCount} existing questions in database`);

    if (existingCount > 0) {
      console.log('🗑️  Removing existing questions...');
      const deleteResult = await questionsCollection.deleteMany({});
      console.log(`✅ Deleted ${deleteResult.deletedCount} existing questions`);
    }

    // Step 2: Validate questions before insertion
    console.log(`\n📝 Validating ${QUESTIONS.length} new questions...`);
    const validationErrors = [];
    
    QUESTIONS.forEach((q, index) => {
      if (!q.id || !q.text) {
        validationErrors.push(`Question ${index + 1}: Missing id or text`);
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        validationErrors.push(`Question ${index + 1}: Must have exactly 4 options`);
      }
      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= 4) {
        validationErrors.push(`Question ${index + 1}: Invalid correctIndex (must be 0-3)`);
      }
      if (!q.difficulty || !['easy', 'medium', 'hard', 'expert'].includes(q.difficulty)) {
        validationErrors.push(`Question ${index + 1}: Invalid difficulty`);
      }
    });

    if (validationErrors.length > 0) {
      console.error('❌ Validation errors found:');
      validationErrors.forEach(err => console.error(`   - ${err}`));
      throw new Error('Question validation failed');
    }

    console.log('✅ All questions validated successfully');

    // Step 3: Insert new questions
    console.log(`\n💾 Inserting ${QUESTIONS.length} new questions...`);
    const now = Date.now();
    
    const questionsToInsert = QUESTIONS.map(q => ({
      ...q,
      createdAt: now,
    }));

    const insertResult = await questionsCollection.insertMany(questionsToInsert);
    console.log(`✅ Successfully inserted ${insertResult.insertedCount} questions`);

    // Step 4: Verify insertion
    const finalCount = await questionsCollection.countDocuments({ isActive: true });
    console.log(`\n📊 Final count: ${finalCount} active questions in database`);

    // Step 5: Show breakdown by difficulty
    const difficultyBreakdown = await questionsCollection.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log('\n📈 Difficulty breakdown:');
    difficultyBreakdown.forEach(({ _id, count }) => {
      console.log(`   - ${_id}: ${count} questions`);
    });

    console.log('\n✅ Question replacement completed successfully!');
    console.log(`🎮 Bet Mode is ready with ${QUESTIONS.length} questions`);

  } catch (error) {
    console.error('❌ Error replacing questions:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
replaceQuestions();

