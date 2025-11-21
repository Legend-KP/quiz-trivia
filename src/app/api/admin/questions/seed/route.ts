import { NextRequest, NextResponse } from 'next/server';
import { getBetModeQuestionsCollection } from '~/lib/mongodb';

export const runtime = 'nodejs';

// Sample questions - you'll replace this with your 100+ questions
const SAMPLE_QUESTIONS = [
  {
    id: 'q1',
    text: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctIndex: 2,
    difficulty: 'easy' as const,
    explanation: 'Paris is the capital and largest city of France.',
    isActive: true,
  },
  {
    id: 'q2',
    text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctIndex: 1,
    difficulty: 'easy' as const,
    explanation: 'Mars is called the Red Planet due to iron oxide on its surface.',
    isActive: true,
  },
  // L1/L2 Rotation & Modular Scaling Questions
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
    difficulty: 'expert' as const,
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
    difficulty: 'expert' as const,
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
  // Add more questions here...
];

export async function POST(req: NextRequest) {
  try {
    // Verify admin key
    const adminKey = req.headers.get('x-admin-key');
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || adminKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questions } = await req.json().catch(() => ({ questions: null }));

    const questionsToInsert = questions || SAMPLE_QUESTIONS;
    const now = Date.now();

    const questionsCollection = await getBetModeQuestionsCollection();

    // Insert questions
    const insertPromises = questionsToInsert.map((q: any) =>
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

    return NextResponse.json({
      success: true,
      inserted: questionsToInsert.length,
      message: 'Questions seeded successfully',
    });
  } catch (error: any) {
    console.error('Question seed error:', error);
    return NextResponse.json({ error: error.message || 'Failed to seed questions' }, { status: 500 });
  }
}

