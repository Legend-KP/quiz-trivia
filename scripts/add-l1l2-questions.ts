/**
 * Script to add L1/L2 Rotation & Modular Scaling questions to Bet Mode
 * Run with: npx tsx scripts/add-l1l2-questions.ts
 */

import dotenv from 'dotenv';
import { getBetModeQuestionsCollection } from '../src/lib/mongodb';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

const L1_L2_QUESTIONS = [
  {
    id: 'l1l2_q1',
    text: 'Which of the following best describes L1 → L2 rotation in Ethereum\'s scaling roadmap?',
    options: [
      'Moving validators from L1 to L2',
      'Shifting user and transaction activity from Ethereum L1 to cheaper, faster L2 networks',
      'Replacing L1 with L2 completely',
      'Migrating smart contracts from Ethereum to Bitcoin',
    ],
    correctIndex: 1,
    difficulty: 'medium' as const,
    explanation: 'Rotation refers to users shifting activity from L1 to L2s as they become more scalable and cheaper.',
    isActive: true,
  },
  {
    id: 'l1l2_q2',
    text: 'In a modular blockchain, which layer is typically responsible for security and settlement?',
    options: [
      'L2 execution layer',
      'Data Availability (DA) layer',
      'Layer 1',
      'Sequencer network',
    ],
    correctIndex: 2,
    difficulty: 'medium' as const,
    explanation: 'L1s like Ethereum act as the settlement and security layer for modular chains.',
    isActive: true,
  },
  {
    id: 'l1l2_q3',
    text: 'Which of the following is a core characteristic of monolithic blockchains?',
    options: [
      'They separate execution, settlement, and DA',
      'All components (execution, consensus, DA) happen on one chain',
      'They rely entirely on external validators',
      'They cannot support smart contracts',
    ],
    correctIndex: 1,
    difficulty: 'medium' as const,
    explanation: 'Monolithic chains do everything on-chain, causing limitations as the network grows.',
    isActive: true,
  },
  {
    id: 'l1l2_q4',
    text: 'Proto-Danksharding (EIP-4844) supports modular scaling mainly by improving which component?',
    options: [
      'Execution speed',
      'Settlement assurance',
      'Data availability for L2 rollups',
      'Validator decentralization',
    ],
    correctIndex: 2,
    difficulty: 'hard' as const,
    explanation: 'EIP-4844 adds "blobs" — cheap DA space for L2 rollups, enabling scalable modular design.',
    isActive: true,
  },
  {
    id: 'l1l2_q5',
    text: 'L2 rollups rely on L1 for:',
    options: [
      'Transaction batching',
      'Computation and execution',
      'State storage and fraud/validity proofs',
      'Governance',
    ],
    correctIndex: 2,
    difficulty: 'hard' as const,
    explanation: 'Rollups execute off-chain but post state roots/proofs to L1 for security guarantees.',
    isActive: true,
  },
  {
    id: 'l1l2_q6',
    text: 'Which of the following L2 architectures depends on fraud proofs to maintain security?',
    options: [
      'zk-rollups',
      'optimistic rollups',
      'validiums',
      'state channels',
    ],
    correctIndex: 1,
    difficulty: 'hard' as const,
    explanation: 'Optimistic rollups assume honesty and use fraud proofs only when challenged.',
    isActive: true,
  },
  {
    id: 'l1l2_q7',
    text: 'Which layer becomes the bottleneck if L1 data availability does not scale while L2 usage increases?',
    options: [
      'Execution layer',
      'Consensus layer',
      'DA layer',
      'Fee market layer',
    ],
    correctIndex: 2,
    difficulty: 'hard' as const,
    explanation: 'Rollups depend heavily on DA; without DA scaling, L2 fees rise (DA becomes bottleneck).',
    isActive: true,
  },
  {
    id: 'l1l2_q8',
    text: 'In a modular system, what is the purpose of shared sequencers?',
    options: [
      'Reduce block size',
      'Allow cross-rollup atomic transactions',
      'Replace validators',
      'Increase gas limits on L1',
    ],
    correctIndex: 1,
    difficulty: 'hard' as const,
    explanation: 'Shared sequencers help coordinate ordering across multiple L2s, enabling interoperability.',
    isActive: true,
  },
  {
    id: 'l1l2_q9',
    text: 'Which statement best describes the relationship between execution layers and settlement layers in modular blockchains?',
    options: [
      'Execution layers finalize transactions without needing settlement',
      'Settlement layers validate and secure the results of execution layers',
      'Execution layers handle data availability',
      'Settlement layers run the smart contracts directly',
    ],
    correctIndex: 1,
    difficulty: 'hard' as const,
    explanation: 'Execution layers handle computation; settlement layers verify and secure finality.',
    isActive: true,
  },
  {
    id: 'l1l2_q10',
    text: 'Which emerging technology aims to solve the interoperability problem caused by many independent rollups in a modular ecosystem?',
    options: [
      'EVM-sharding',
      'Rollup-to-rollup bridges + shared sequencing',
      'Layer 0 bandwidth optimization',
      'Gas-rebasing protocols',
    ],
    correctIndex: 1,
    difficulty: 'expert' as const,
    explanation: 'Modular ecosystems need unified sequencing and safe bridges to allow cross-rollup communication.',
    isActive: true,
  },
];

async function addQuestions() {
  try {
    console.log('Connecting to database...');
    const questionsCollection = await getBetModeQuestionsCollection();
    
    console.log(`Adding ${L1_L2_QUESTIONS.length} L1/L2 questions...`);
    const now = Date.now();
    
    const insertPromises = L1_L2_QUESTIONS.map((q) =>
      questionsCollection.updateOne(
        { id: q.id },
        {
          $set: {
            ...q,
            createdAt: now,
          },
        },
        { upsert: true }
      )
    );
    
    await Promise.all(insertPromises);
    
    console.log('✅ Successfully added all L1/L2 questions!');
    console.log(`   - Medium: ${L1_L2_QUESTIONS.filter(q => q.difficulty === 'medium').length}`);
    console.log(`   - Hard: ${L1_L2_QUESTIONS.filter(q => q.difficulty === 'hard').length}`);
    console.log(`   - Expert: ${L1_L2_QUESTIONS.filter(q => q.difficulty === 'expert').length}`);
  } catch (error: any) {
    console.error('❌ Error adding questions:', error);
    process.exit(1);
  }
}

addQuestions();

