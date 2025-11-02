import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Trophy, Star, X } from 'lucide-react';
import { useMiniApp } from '@neynar/react';
import { APP_URL, APP_TITLE_IMAGE_URL } from '~/lib/constants';
import QuizStartButton from '~/components/QuizStartButton';
import SpinWheel from '~/components/SpinWheel';
import { QuizMode } from '~/lib/wallet';
import { useQTClaim } from '~/hooks/useQTClaim';
import WeeklyQuizPage from '~/components/WeeklyQuizPage';
import { QTTokenBar } from '~/components/QTTokenBar';
import WeeklyQuizStartButton from '~/components/WeeklyQuizStartButton';
import { currentWeeklyQuiz } from '~/lib/weeklyQuiz';
import { useQuizState } from '~/hooks/useWeeklyQuiz';
import QuizResultsSubmitPage from '~/components/QuizResultsSubmitPage';

// Type definitions
interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  timeLimit: number;
  explanation: string;
}

interface Answer {
  questionId: number;
  selectedAnswer: number | null;
  correct: number;
  isCorrect: boolean;
}

interface LeaderboardEntry {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  score: number;
  time: string;
  timeInSeconds?: number;
  completedAt: number;
  rank?: number;
  mode: 'CLASSIC' | 'TIME_MODE' | 'CHALLENGE';
}

interface RulesPopupProps {
  onClose: () => void;
}

interface HomePageProps {
  balance: number | null;
  onStartTimeMode: () => void;
  onStartChallenge: () => void;
  onShowRules: () => void;
  onSpinWheel: () => void;
  onStartWeeklyQuiz: () => void;
}

// QuizPageProps removed - Classic mode is now replaced by Weekly Quiz mode

interface ResultsPageProps {
  score: number;
  answers: Answer[];
  time: string;
  onRestart: () => void;
  context?: any;
}

interface TimeModePageProps {
  onExit: () => void;
  onComplete?: (score: number, totalQuestions: number) => void;
  context?: any;
}

interface ChallengeModePageProps {
  onExit: () => void;
  context?: any;
}

// 54 curated fallback questions for Time Mode (used if API returns none)
const TIME_MODE_FALLBACK_QUESTIONS: QuizQuestion[] = [
  // DePIN
  { id: 1054, question: 'How do priority systems in 2025 CLOB DEXs prevent manipulation?', options: ['Prioritize cancellations and post-only orders before GTC/IOC','Process all orders FIFO without cancellation priority','Off-chain relayers ignoring on-chain timestamps','Uniform fees regardless of order type'], correct: 0, timeLimit: 45, explanation: 'On-chain priority ensures fair execution, reducing front-running while maintaining decentralization.' },
  { id: 1066, question: 'In the context of Ethereum\'s privacy solutions, what is the role of a mixer like Tornado Cash?', options: ['To compress transaction data for scalability','To obfuscate the link between sender and receiver addresses using a pool of funds','To validate transactions without revealing sender identities','To enable cross-chain transfers with privacy guarantees'], correct: 1, timeLimit: 45, explanation: 'Mixers like Tornado Cash break the on-chain link between sender and receiver by pooling funds and using zk-proofs to withdraw to new addresses, enhancing privacy.' },
  { id: 1038, question: 'Key challenge for complex smart contracts on Bitcoin Layer-1?', options: ['Excessive transaction speeds','No cryptographic tools','High computational overhead and block size limits','External blockchain validation required'], correct: 2, timeLimit: 45, explanation: 'Bitcoin\'s 1MB blocks and Script simplicity limit on-chain complexity.' },
  { id: 1001, question: 'What does DePIN stand for in the Web3 ecosystem?', options: ['Decentralized Physical Infrastructure Networks','Decentralized Protocol for Internet Nodes','Digital Private Investment Network','Decentralized Payment Integration Node'], correct: 0, timeLimit: 45, explanation: 'DePIN decentralizes physical resources (connectivity, storage) with token incentives.' },
  { id: 1055, question: 'What is the primary function of a Digital Asset Treasury (DAT) company?', options: ['To issue and manage stablecoins pegged to fiat currencies','To allocate a significant portion of corporate treasury to cryptocurrencies like Bitcoin or Ethereum','To operate as a crypto exchange for retail and institutional investors','To provide custodial services for decentralized finance (DeFi) protocols'], correct: 1, timeLimit: 45, explanation: 'DATs are publicly traded companies that hold 70-90%+ of their treasury in cryptocurrencies, acting as leveraged vehicles for crypto exposure.' },
  { id: 1012, question: 'Key investor advantage of RWAs?', options: ['More bank custody','No division allowed','Fractional ownership','Geo‑limited'], correct: 2, timeLimit: 45, explanation: 'Small tickets into high‑value assets.' },
  { id: 1042, question: 'Regulatory hurdle for "Protocols as Nations" in multi-jurisdictional operations?', options: ['Conflicts with EU/OECD blacklisting non-cooperative havens','Complete exemption from all laws','Mandatory PoS alignment only','Elimination of token incentives'], correct: 0, timeLimit: 45, explanation: 'International orders target protocols as tax havens, requiring hybrid compliance models.' },
  { id: 1035, question: 'Layer-2 solution for complex Bitcoin smart contracts?', options: ['Polygon','Arbitrum','Lightning Network','Optimism'], correct: 2, timeLimit: 45, explanation: 'Lightning Network enables off-chain smart contracts with Bitcoin settlement.' },
  { id: 1007, question: 'How does AI enhance DePIN allocation?', options: ['Centralize in single AI node','Predictive demand forecasting','Eliminate tokens','Quantum-only encryption'], correct: 1, timeLimit: 45, explanation: 'AI allocates energy/bandwidth based on forecasts.' },
  { id: 1020, question: 'Interoperability issue + CCIP answer?', options: ['Liquidity fragmentation; CCIP bridges data/assets','None; single‑chain','Fiat bridges only','PoW requirement'], correct: 0, timeLimit: 45, explanation: 'Secure cross‑chain transfers and data.' },
  { id: 1031, question: 'Primary scripting language for Bitcoin smart contracts?', options: ['Solidity','Script','Vyper','Rust'], correct: 1, timeLimit: 45, explanation: 'Bitcoin uses Script, a stack-based language for multi-sig and time-locked transactions.' },
  { id: 1010, question: 'Quantum threat impact and mitigation by 2030?', options: ['No impact','Eliminate hardware','Centralize oracles','May break signatures; use post‑quantum crypto'], correct: 3, timeLimit: 45, explanation: 'Quantum‑resistant schemes protect rewards and security.' },
  // RWA
  { id: 1011, question: 'Basic process of RWA tokenization?', options: ['Digital art → physical','Represent tangible assets as tokens','Eliminate intermediaries','Create new coins from scratch'], correct: 1, timeLimit: 45, explanation: 'Ownership rights of assets are digitized on-chain.' },
  { id: 1004, question: 'Which DePIN category shares compute/storage?', options: ['Physical Resource Networks','Hybrid Energy Networks','Digital Resource Networks','Centralized Wireless Hubs'], correct: 2, timeLimit: 45, explanation: 'Digital Resource Networks cover bandwidth and compute.' },
  { id: 1013, question: 'Oracle role in RWAs?', options: ['Provide off‑chain data/prices','Mint tokens','Centralize governance','Stablecoin‑only trading'], correct: 0, timeLimit: 45, explanation: 'Feeds keep token value aligned with reality.' },
  { id: 1039, question: 'How does Stacks enable Bitcoin smart contract development?', options: ['Replace Bitcoin consensus','Clarity language with Bitcoin finality','Convert to Ethereum format','Eliminate UTXO model'], correct: 1, timeLimit: 45, explanation: 'Stacks uses Clarity for secure contracts that settle on Bitcoin Layer-1.' },
  { id: 1014, question: 'RWA TVL mid‑2025 approx?', options: ['$1B','$100B','$12.7B','$1T'], correct: 2, timeLimit: 45, explanation: 'Driven by stables and treasuries.' },
  { id: 1002, question: 'Primary benefit of DePIN vs centralized infra?', options: ['Higher tx speeds for digital-only assets','Resilience via distributed nodes','Government-only funding','No hardware needed'], correct: 1, timeLimit: 45, explanation: 'Distributed nodes reduce single points of failure.' },
  { id: 1053, question: 'Scalability issue for pure on-chain CLOBs on high-throughput chains?', options: ['Over-reliance on parallel execution without Riemann sum logic','Translating AMM curves into discrete orders with sub-second finality','Mandatory PoW integration for security','Elimination of post-only orders for simplicity'], correct: 1, timeLimit: 45, explanation: 'Protocols like Bullet use Riemann sum to discretize continuous AMM functions into CLOB orders.' },
  { id: 1015, question: 'Dominant RWA class 2025?', options: ['Tokenized art','Metaverse land','Derivatives only','Fiat‑backed stablecoins'], correct: 3, timeLimit: 45, explanation: 'USDT/USDC anchor liquidity.' },
  { id: 1051, question: 'How does zk-CLOB model address verification challenges?', options: ['Offload all computations to centralized sequencers','Eliminate order priority rules','Zero-knowledge proofs verifying full trade-execution path','Mandatory multi-sig approvals for every match'], correct: 2, timeLimit: 45, explanation: 'zk-CLOBs prove matching and liquidations without revealing details, enabling CEX-grade speed with DeFi trustlessness.' },
  { id: 1016, question: 'Regulatory trend boosting RWAs?', options: ['Global bans','Clear frameworks in UAE/Singapore','Mandatory centralization','No KYC worldwide'], correct: 1, timeLimit: 45, explanation: 'Compliance rails enable institutions.' },
  { id: 1028, question: 'Why modular rollups help abstraction?', options: ['Separate execution/settlement/DA','Centralize ops','Remove interoperability','Single‑chain focus'], correct: 0, timeLimit: 45, explanation: 'Composable layers reduce friction.' },
  { id: 1008, question: 'Unique scalability challenge for DePIN?', options: ['Fiat gateways','Mandatory PoS for hardware','Consensus vs physical latency','No interoperability'], correct: 2, timeLimit: 45, explanation: 'Syncing on-chain validation with hardware delays.' },
  { id: 1018, question: 'Why tokenized treasuries surge 2025?', options: ['Only commodities; low yield','On‑chain bond yield; institutional demand','No fees; retail hype','NFT focus'], correct: 1, timeLimit: 45, explanation: 'Secure yield with compliant access.' },
  { id: 1023, question: 'Cross‑chain bridge role?', options: ['Move assets/data across chains','Lock assets forever','Replace L2s','Centralize control'], correct: 0, timeLimit: 45, explanation: 'Bridges enable portability with risks.' },
  // Chain abstraction & interoperability
  { id: 1021, question: 'Primary goal of chain abstraction?', options: ['Raise fees','Single‑chain centralization','Hide chain complexity for users','No smart contracts'], correct: 2, timeLimit: 45, explanation: 'Make Web3 feel unified and simple.' },
  { id: 1022, question: 'Key benefit of interoperability?', options: ['Fewer blockchains','Force single chain','More dev complexity','Seamless data/asset transfer'], correct: 3, timeLimit: 45, explanation: 'Enables cross‑chain dApps and liquidity.' },
  { id: 1019, question: 'Post‑tokenization dividends automated how?', options: ['Manual off‑chain','Self‑executing contracts','Banks settle all','No dividends'], correct: 1, timeLimit: 45, explanation: 'Conditions trigger transparent payouts.' },
  { id: 1032, question: 'Key limitation of Bitcoin Script vs Ethereum?', options: ['No native tokens','Cannot process transactions','No cryptographic signatures','Limited Turing-completeness'], correct: 3, timeLimit: 45, explanation: 'Bitcoin Script is intentionally non-Turing-complete for security.' },
  { id: 1025, question: 'Challenge to chain abstraction UX?', options: ['Scalability only','Managing wallets and gas across chains','Lack of contracts','CEX overuse'], correct: 1, timeLimit: 45, explanation: 'Abstraction removes multi‑wallet/gas pain.' },
  { id: 1026, question: 'Project tied to chain abstraction (2025)?', options: ['Tria (Cosmos SDK)','Bitcoin ETF','Pudgy Penguins','Clearpool financing'], correct: 0, timeLimit: 45, explanation: 'Tria unifies cross‑chain UX.' },
  { id: 1017, question: 'Dynamic compliance solves what?', options: ['Ignore laws','Full deregulation','Single‑chain only','Automated KYC/AML per jurisdiction'], correct: 3, timeLimit: 45, explanation: 'Smart contracts enforce regional rules.' },
  { id: 1030, question: 'Anoma contributes by…', options: ['Enforce single chain','Privacy only single‑chain','Intent‑centric cross‑chain flows','Centralized bridge'], correct: 2, timeLimit: 45, explanation: 'Intent model automates multi‑chain execution.' },
  // Bitcoin Smart Contracts
  
  { id: 1009, question: "In DePIN layers, 'consensus & governance' handles?", options: ['Token incentives and DAO decisions','Device deployment','Sensor encryption only','Centralized backups'], correct: 0, timeLimit: 45, explanation: 'Smart contracts + DAO maintain fair validation.' },
  { id: 1059, question: 'How do DATs differ from crypto ETFs in terms of active management?', options: ['DATs are passive vehicles, while ETFs actively stake crypto','DATs can pursue strategies like staking or DeFi, while ETFs are typically passive','DATs are restricted to Bitcoin only, while ETFs hold diversified baskets','DATs are regulated to maintain fixed NAV, while ETFs fluctuate freely'], correct: 1, timeLimit: 45, explanation: 'DATs, as operating companies, can stake (e.g., ETH for yields) or engage in DeFi, unlike ETFs, which passively track prices.' },
  { id: 1062, question: 'In Monero, what does the use of ring signatures primarily achieve?', options: ['Conceals the transaction amount from public view','Reduces the computational cost of transaction verification','Encrypts the recipient\'s address for all transactions','Hides the sender\'s identity by mixing their signature with decoys'], correct: 3, timeLimit: 45, explanation: 'Monero\'s ring signatures mix the sender\'s signature with decoy inputs, obscuring the true signer\'s identity.' },
  { id: 1024, question: 'Tech for trustless interoperability?', options: ['Centralized oracles','Zero‑knowledge proofs','Proof‑of‑work','Single‑chain validators'], correct: 1, timeLimit: 45, explanation: 'ZKPs verify across domains without trust.' },
  { id: 1027, question: 'Intent‑based vs traditional bridging?', options: ['Manual steps per chain','No gas ever','Centralized relayers only','User goal; protocol handles details'], correct: 3, timeLimit: 45, explanation: 'Users express outcomes; system routes.' },
  { id: 1033, question: 'Bitcoin feature enabling time-based smart contracts?', options: ['CheckLockTimeVerify (CLTV)','SegWit','Taproot','Ordinals'], correct: 0, timeLimit: 45, explanation: 'CLTV (BIP-65) locks transactions until specific future time/block.' },
  { id: 1034, question: 'How does Taproot enhance Bitcoin smart contracts?', options: ['Full Turing-complete programming','Privacy and efficiency for multi-sig scripts','Removes all fees','Replaces Script with Solidity'], correct: 1, timeLimit: 45, explanation: 'Taproot uses Schnorr signatures and MAST for privacy and efficiency.' },
  
  { id: 1006, question: 'Leading DePIN for decentralized wireless?', options: ['Filecoin','The Graph','Flux','Helium'], correct: 3, timeLimit: 45, explanation: 'Helium rewards hotspot providers for IoT/5G.' },
  { id: 1058, question: 'What 2023 regulatory change significantly boosted the adoption of DATs?', options: ['FASB\'s fair-value accounting rules for digital assets','SEC approval of spot Bitcoin ETFs','CFTC\'s classification of Ethereum as a commodity','IRS exemption of crypto gains from taxation'], correct: 0, timeLimit: 45, explanation: 'The FASB\'s 2023 fair-value accounting rules allowed companies to report crypto at market value, not historical cost, making DATs more attractive for holding digital assets.' },
  { id: 1003, question: 'Role of tokens in DePIN?', options: ['Only governance votes','Replace all fiat','Institutional-only','Incentivize resource contributions'], correct: 3, timeLimit: 45, explanation: 'Tokens reward bandwidth, storage, and coverage.' },
  { id: 1036, question: 'Role of Hashed Timelock Contracts (HTLCs)?', options: ['Enable cross-chain atomic swaps and payment channels','Eliminate private keys','Enforce centralized custody','Replace all on-chain transactions'], correct: 3, timeLimit: 45, explanation: 'HTLCs enable trustless conditional transfers in Lightning and atomic swaps.' },
  { id: 1040, question: 'How does BOB address Bitcoin smart contract scalability?', options: ['Centralized execution','EVM compatibility and rollups with Bitcoin security','Remove Layer-2','Quantum-resistant signatures only'], correct: 1, timeLimit: 45, explanation: 'BOB combines EVM smart contracts with Bitcoin settlement via rollups.' },
  // Protocols as Nations
  { id: 1041, question: 'How do cyberstates challenge legacy governments in 2025?', options: ['Resource redirection and political pressure without geographic ties','Enforce physical territories only','Alliances with nation-states for funding','Centralized oracles for validation'], correct: 0, timeLimit: 45, explanation: 'Cyberstates leverage Web3 to pool global talent and funds, influencing policy while operating location-independently.' },
  { id: 1064, question: 'Which privacy-preserving technology allows computations on encrypted data without decrypting it, potentially useful for private smart contracts?', options: ['Homomorphic Encryption','Zero-Knowledge Proofs','Ring Confidential Transactions (RingCT)','Mimblewimble Protocol'], correct: 0, timeLimit: 45, explanation: 'Homomorphic encryption enables computations on encrypted data, preserving privacy for applications like private smart contracts.' },
  { id: 1005, question: 'Projected DePIN market size mid‑2025?', options: ['$32B','$5B','$100B','$500B'], correct: 0, timeLimit: 45, explanation: 'Adoption in smart cities and AI drives growth.' },
  { id: 1067, question: 'Which privacy-preserving technology is most closely associated with enabling private cross-chain bridges as of 2025?', options: ['Secure Multi-Party Computation (sMPC)','Bulletproofs','Stealth Addresses','Confidential Transactions'], correct: 0, timeLimit: 45, explanation: 'sMPC enables multiple parties (e.g., blockchains) to compute functions on private data without revealing inputs, making it ideal for secure cross-chain bridges.' },
  { id: 1047, question: 'Key benefit of CLOBs for institutional traders in 2025?', options: ['Unlimited leverage without collateral','Automatic yield farming integration','Elimination of all transaction fees','Granular control over order types, mimicking CEXs'], correct: 4, timeLimit: 45, explanation: 'CLOBs offer advanced features like limit orders and real-time depth visibility for TradFi-like precision.' },
  { id: 1043, question: 'How does narrative control influence protocol sovereignty?', options: ['No impact, code overrides messaging','Centralize all media on one platform','Government subsidies for promotion','Influencers shape perceptions of decentralization via social media'], correct: 3, timeLimit: 45, explanation: 'Founders/influencers steer discourse and prices on platforms like X, governing cultural narrative.' },
  { id: 1057, question: 'As of October 2025, approximately how much Bitcoin do DATs collectively hold?', options: ['100,000 BTC (0.5% of total supply)','50,000 BTC (0.2% of total supply)','2,000,000 BTC (10% of total supply)','976,000 BTC (3% of total supply)'], correct: 3, timeLimit: 45, explanation: 'DATs and other public companies hold ~976,000 BTC, worth over $115B, representing ~3% of Bitcoin\'s total supply. This is driven by firms like Strategy (642K BTC alone).' },
  // CLOB (Central Limit Order Book) in DeFi
  { id: 1045, question: 'What is a Central Limit Order Book (CLOB) in DeFi?', options: ['Decentralized lending protocol for stablecoins','Trading system matching buy/sell orders by price and time priority','Automated market maker for yield farming','Governance token for DAO voting'], correct: 1, timeLimit: 45, explanation: 'CLOB enables transparent, peer-to-peer trading similar to traditional exchanges without intermediaries.' },
  { id: 1063, question: 'What is a key trade-off of using zero-knowledge proofs (e.g., zk-SNARKs) in blockchain privacy solutions?', options: ['They require a trusted setup, which introduces potential vulnerabilities','They significantly increase transaction confirmation times','They are incompatible with public blockchain consensus mechanisms','They rely on centralized servers for proof generation'], correct: 0, timeLimit: 45, explanation: 'zk-SNARKs often require a trusted setup (e.g., a ceremony to generate initial parameters), which, if compromised, could undermine security.' },
  { id: 1023, question: 'Cross‑chain bridge role?', options: ['Move assets/data across chains','Lock assets forever','Replace L2s','Centralize control'], correct: 0, timeLimit: 45, explanation: 'Bridges enable portability with risks.' },
  
  { id: 1048, question: 'Common challenge for on-chain CLOBs in DeFi?', options: ['High latency and gas costs for order matching/cancellations','Excessive liquidity from over-collateralization','Mandatory fiat gateways','Lack of transparency in order books'], correct: 0, timeLimit: 45, explanation: 'Blockchain limitations make frequent updates expensive, though Layer-2 solutions like MegaETH help.' },
  { id: 1029, question: 'Risk with cross‑chain messaging (e.g., LayerZero)?', options: ['Perfect security','Messaging layer compromise risk','No transfers possible','Same consensus required'], correct: 1, timeLimit: 45, explanation: 'Oracles/relayers can be attack vectors.', },
  { id: 1049, question: 'Role of CLOBs in DeFi perpetual futures trading?', options: ['Only handle spot swaps, defer derivatives off-chain','Enable leveraged trading with oracle pricing and cross-margining','Replace stablecoins with volatile tokens','Enforce centralized clearinghouses'], correct: 1, timeLimit: 45, explanation: 'Protocols like Hyperliquid use CLOBs for perps, providing deep liquidity and low-latency execution.' },
  { id: 1060, question: 'What is the primary purpose of privacy-preserving technologies in cryptocurrency?', options: ['To increase transaction speeds on public blockchains','To protect user identities and transaction details from public disclosure','To reduce the energy consumption of proof-of-work networks','To enable cross-chain interoperability between blockchains'], correct: 1, timeLimit: 45, explanation: 'PPTs, like zero-knowledge proofs or ring signatures, aim to shield user identities and transaction data (e.g., amounts, recipients) on public blockchains, ensuring privacy while maintaining verifiability.' },
  { id: 1044, question: 'Why might "Protocols as Nations" struggle with real-world enforcement?', options: ['Over-reliance on quantum-resistant tech','Exclusive focus on digital-only assets','Lack of brute force mechanisms like legality/military','Automatic fiat integration'], correct: 2, timeLimit: 45, explanation: 'Protocols depend on voluntary participation; without coercive tools, they compete via tech advantages like SEZs.' },
  { id: 1050, question: '2025 CLOB DEX innovation for liquidity unification?', options: ['Siloed order books per chain','Exclusive PoS consensus','Offline order placement via fiat apps','Hybrid models integrating AMM vaults and aggregators'], correct: 3, timeLimit: 45, explanation: 'Omnibook concepts combine CLOB precision with AMM liquidity to reduce fragmentation.' },
  { id: 1037, question: 'How does BRC-2.0 enhance Bitcoin smart contracts?', options: ['Standardize tokenization and DeFi on Bitcoin','Replace Script with Turing-complete language','Limit to Layer-2 only','Require centralized oracles'], correct: 0, timeLimit: 45, explanation: 'BRC-2.0 standardizes token creation and basic DeFi contracts on Bitcoin.' },
  { id: 1052, question: 'What sustains Hyperliquid\'s 70-80% DeFi perps market share?', options: ['Centralized HLP vaults with no community ownership','HYPE token airdrops and community-owned liquidity vaults','External CEX liquidity bridges','Fixed fee structures ignoring volatility'], correct: 1, timeLimit: 45, explanation: 'HLP vault and airdrops create network effects, driving $106M monthly revenue and multi-trillion volume.' },
  
  // Digital Asset Treasuries (DATs)
  { id: 1056, question: 'Why do DATs often trade at a premium to their Net Asset Value (NAV)?', options: ['They are required by regulators to maintain a fixed premium','They distribute dividends from crypto staking yields','Speculative demand and capital-raising cycles amplify investor interest','Their shares are fully backed by physical gold reserves'], correct: 2, timeLimit: 45, explanation: 'DATs trade at premiums (e.g., 30-70% above NAV) due to speculative hype and their ability to raise capital to buy more crypto, creating a feedback loop.' },
  
  // Privacy-Preserving Technologies
  { id: 1046, question: 'How do CLOBs differ from AMMs in DeFi trading?', options: ['CLOBs use liquidity pools, AMMs use order matching','CLOBs provide precise execution with low slippage vs AMMs constant-product','CLOBs require centralized custodians, AMMs are decentralized','CLOBs only support spot, AMMs include derivatives'], correct: 1, timeLimit: 45, explanation: 'CLOBs match limit orders for better price discovery, addressing AMM issues like high slippage.' },
  { id: 1061, question: 'Which cryptographic technique is used by Zcash to hide transaction amounts and recipient addresses?', options: ['Ring Signatures','Homomorphic Encryption','Zero-Knowledge Succinct Non-Interactive Argument of Knowledge (zk-SNARKs)','Multi-Party Computation (MPC)'], correct: 2, timeLimit: 45, explanation: 'Zcash uses zk-SNARKs to enable shielded transactions, proving validity without revealing sender, receiver, or amount.' },
  { id: 1065, question: 'What is a key limitation of the Mimblewimble protocol used in cryptocurrencies like Grin and Beam?', options: ['It lacks support for smart contracts and scripting','It requires all transactions to be publicly verifiable','It is incompatible with proof-of-stake consensus','It increases transaction sizes compared to Bitcoin'], correct: 0, timeLimit: 45, explanation: 'Mimblewimble, used in Grin and Beam, enhances privacy via confidential transactions and cut-through but lacks scripting support, limiting smart contract functionality.' },
  
    
];


// Sample quiz data with explanations
const quizData: QuizQuestion[] = [
  {
    id: 1,
    question: "What is the smallest unit of Ether called?",
    options: ["Gwei", "Satoshi", "Finney", "Wei"],
    correct: 3, // 0-based index for "Wei" (4th option)
    timeLimit: 60, // 1 minute in seconds
    explanation: "Wei is the smallest denomination of Ether, just like a cent is to a dollar."
  },
  {
    id: 2,
    question: "What does MEV stand for in Ethereum context?",
    options: ["Most Efficient Validator", "Maximum Extractable Value", "Modular Execution Vault", "Minimal Ethereum Value"],
    correct: 1, // 0-based index for "Maximum Extractable Value" (2nd option)
    timeLimit: 60,
    explanation: "MEV refers to profits miners or validators can extract by reordering or censoring transactions."
  },
  {
    id: 3,
    question: "Which Ethereum standard enables tokens to hold other tokens (like NFTs owning NFTs)?",
    options: ["ERC-721", "ERC-20", "ERC-4626", "ERC-998"],
    correct: 3, // 0-based index for "ERC-998" (4th option)
    timeLimit: 60,
    explanation: "ERC-998 is a composable NFT standard allowing NFTs to own both ERC-721 and ERC-20 tokens."
  },
  {
    id: 4,
    question: "What is a blob in the context of Ethereum&apos;s Proto-Danksharding?",
    options: ["A fungible token format", "A zero-knowledge proof", "A temporary data package stored off-chain", "A type of validator node"],
    correct: 2, // 0-based index for "A temporary data package stored off-chain" (3rd option)
    timeLimit: 60,
    explanation: "Blobs are large chunks of data stored off-chain to improve scalability, introduced in EIP-4844 as part of Proto-Danksharding."
  }
];

// Rules Popup Component
const RulesPopup: React.FC<RulesPopupProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Quiz Trivia Rules 📋
        </h2>
        
        <div className="space-y-4 text-gray-700">
          <div className="flex items-start space-x-3">
            <span className="text-blue-500 font-bold">1️⃣</span>
            <p>The quiz has 4 multiple-choice questions with 30-minute intervals between each question.</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="text-blue-500 font-bold">2️⃣</span>
            <p>You&apos;ll get 1 minute per question – so think fast! ⏳</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="text-blue-500 font-bold">3️⃣</span>
            <p>Correct answer = +1 point</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="text-blue-500 font-bold">4️⃣</span>
            <p>Wrong answer = -0.5 point</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <span className="text-blue-500 font-bold">5️⃣</span>
            <p>Most importantly – have fun and learn something new! 🎉</p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
        >
          Let&apos;s Go! 🚀
        </button>
      </div>
    </div>
  );
};

// Home Page Component
const HomePage: React.FC<HomePageProps> = ({ balance, onStartTimeMode, onStartChallenge, onSpinWheel, onStartWeeklyQuiz }) => {
  const _weeklyQuizState = useQuizState(currentWeeklyQuiz);
  const [weeklyUserCompleted, setWeeklyUserCompleted] = useState(false);
  const { actions, added, context } = useMiniApp();
  const attemptedAddRef = useRef(false);

  // Determine if current user has already completed the current weekly quiz (single attempt enforcement)
  useEffect(() => {
    const fid = context?.user?.fid;
    const quizId = currentWeeklyQuiz.id;
    if (!fid || !quizId) {
      setWeeklyUserCompleted(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Server check
        const res = await fetch(`/api/leaderboard?mode=CLASSIC&quizId=${quizId}`);
        const data = await res.json();
        const exists = Array.isArray(data?.leaderboard) && data.leaderboard.some((e: any) => e.fid === fid);
        // Local backup check
        const lsKey = `weekly_completed_${quizId}_${fid}`;
        const localDone = typeof window !== 'undefined' ? !!localStorage.getItem(lsKey) : false;
        if (!cancelled) setWeeklyUserCompleted(exists || localDone);
      } catch (_e) {
        // Fallback to localStorage only
        try {
          const lsKey = `weekly_completed_${quizId}_${fid}`;
          const localDone = typeof window !== 'undefined' ? !!localStorage.getItem(lsKey) : false;
          if (!cancelled) setWeeklyUserCompleted(localDone);
        } catch (_e2) {
          if (!cancelled) setWeeklyUserCompleted(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [context?.user?.fid, _weeklyQuizState, currentWeeklyQuiz.id]);

  // Auto-prompt to add the mini app if not yet added (once per session)
  useEffect(() => {
    if (!added && !attemptedAddRef.current) {
      attemptedAddRef.current = true;
      (async () => {
        try {
          await actions.addMiniApp();
        } catch (_e) {
          // ignore rejection or validation errors; user can add later from actions tab
        }
      })();
    }
  }, [added, actions]);
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Gradient Background - Full Frame */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-purple-800 to-orange-500"></div>
      
      {/* Grainy Texture Overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center h-full px-6 text-center pt-1 md:pt-2 gap-1">

        {/* QUIZ TRIVIA - New Font and Enhanced 3D Effect */}
        <div className="relative mb-1 md:mb-2">
          {APP_TITLE_IMAGE_URL ? (
            <img
              src={APP_TITLE_IMAGE_URL}
              alt="Quiz Trivia"
              className="mx-auto w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[30rem] lg:h-[30rem] object-contain drop-shadow-lg"
            />
          ) : (
            <h3 className="text-5xl md:text-7xl font-black text-yellow-400 uppercase tracking-wider relative" style={{
              fontFamily: 'Impact, Arial Black, sans-serif',
              textShadow: '2px 2px 0px rgba(0,0,0,0.8), 4px 4px 0px rgba(0,0,0,0.6)'
            }}>
              <span className="absolute inset-0 transform translate-x-2 translate-y-2 text-yellow-600 opacity-40">QUIZ TRIVIA</span>
              <span className="absolute inset-0 transform translate-x-1 translate-y-1 text-yellow-500 opacity-70">QUIZ TRIVIA</span>
              <span className="relative z-10 drop-shadow-lg">QUIZ TRIVIA</span>
            </h3>
          )}
        </div>

        {/* Balance + Spin Wheel Button */}
        <div className="mb-4 text-white text-sm flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-black/30 border border-white/20">Coins: {balance ?? '—'}</span>
          <button onClick={onSpinWheel} className="px-3 py-1 rounded-full bg-yellow-500 text-yellow-900 font-semibold hover:bg-yellow-400 transition">🎰 Spin the Wheel!</button>
        </div>

        {/* Mode Buttons */}
        <div className="space-y-3 w-full max-w-xs md:max-w-sm">
          <WeeklyQuizStartButton
            quizState={_weeklyQuizState}
            onQuizStart={async () => {
              try {
                const fid = context?.user?.fid;
                if (fid) {
                  const res = await fetch('/api/currency/spend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fid, amount: 15, reason: 'weekly_entry' }),
                  });
                  if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    alert(d?.error || 'Insufficient balance');
                    return;
                  }
                }
              } catch (_e) {}
              onStartWeeklyQuiz();
            }}
            userCompleted={weeklyUserCompleted}
          />

          <QuizStartButton
            mode={QuizMode.TIME_MODE}
            modeName="Time Mode"
            onQuizStart={onStartTimeMode}
          />

          <div className="relative">
            <span className="absolute -top-2 right-3 text-xs font-semibold bg-black/50 text-white px-2 py-0.5 rounded-md backdrop-blur">
              Coming Soon
            </span>
            <QuizStartButton
              mode={QuizMode.CHALLENGE}
              modeName="Challenge Mode"
              onQuizStart={onStartChallenge}
              className="pointer-events-none opacity-60"
            />
          </div>
        </div>

        {/* Enhanced depth styling */}
        <div className="mt-8">
          <div className="w-40 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto rounded-full opacity-80"></div>
        </div>
      </div>
    </div>
  );
};

// QuizPage Component removed - Classic mode has been replaced by Weekly Quiz mode


// Results Component
const ResultsPage: React.FC<ResultsPageProps> = ({ score, answers: _answers, onRestart: _onRestart, context, time }) => {
  const { actions } = useMiniApp();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // const totalQuestions = quizData.length;
  // const correctAnswers = answers.filter((a: Answer) => a.isCorrect).length;
  // const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

  // Use the actual completion time passed from the quiz
  const totalTime = time || "0:00";

  const fetchLeaderboard = useCallback(async () => {
    console.log('🔍 Fetching leaderboard...');
    try {
      const response = await fetch(`/api/leaderboard?mode=CLASSIC&quizId=${currentWeeklyQuiz.id}`);
      const data = await response.json();
      console.log('📥 Leaderboard response:', data);
      
      if (data.leaderboard) {
        console.log(`📊 Setting leaderboard with ${data.leaderboard.length} entries`);
        setLeaderboard(data.leaderboard);
      } else {
        console.warn('⚠️ No leaderboard data in response');
        setLeaderboard([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch leaderboard:', error);
      // Set empty leaderboard on error to prevent crashes
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitScore = useCallback(async () => {
    if (!context?.user?.fid || submitted) {
      console.log('🚫 Skipping score submission:', { 
        hasFid: !!context?.user?.fid, 
        submitted, 
        user: context?.user 
      });
      return;
    }

    console.log('📝 Starting score submission:', {
      fid: context.user.fid,
      username: context.user.username,
      displayName: context.user.displayName,
      score,
      totalTime
    });

    setSubmitting(true);
    try {
      const payload = {
        fid: context.user.fid,
        username: context.user.username,
        displayName: context.user.displayName,
        pfpUrl: context.user.pfpUrl,
        score: score,
        time: totalTime,
        mode: 'CLASSIC',
        quizId: currentWeeklyQuiz.id,
      };

      console.log('📤 Sending payload:', payload);

      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('📥 Response received:', data);
      
      if (response.ok && data.success) {
        console.log('✅ Score submitted successfully');
        setLeaderboard(data.leaderboard || []);
        setSubmitted(true);
        try {
          const quizId = currentWeeklyQuiz.id;
          const fid = context.user.fid;
          if (quizId && fid && typeof window !== 'undefined') {
            localStorage.setItem(`weekly_completed_${quizId}_${fid}`, '1');
          }
        } catch (_e) {}
      } else {
        console.warn('❌ Score submission failed:', data.error);
        // Still mark as submitted to prevent retries
        setSubmitted(true);
      }
    } catch (error) {
      console.error('❌ Failed to submit score:', error);
      // Mark as submitted even on error to prevent infinite retries
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [context?.user, submitted, score, totalTime]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Auto-submit score when component mounts if user is authenticated
  useEffect(() => {
    if (context?.user?.fid && !submitted) {
      submitScore();
    }
  }, [context?.user?.fid, submitted, submitScore]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">🏆 Public Leaderboard</h2>
            <p className="text-gray-600">All Quiz Trivia Participants</p>
            {!loading && (
              <div className="mt-2 text-sm text-gray-500">
                {leaderboard.length} participants • Last updated: {new Date().toLocaleString()}
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="spinner h-8 w-8 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No participants yet. Be the first to complete the quiz!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {leaderboard.map((player, index) => (
                <div
                  key={player.fid}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    index < 3
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      player.rank === 1 ? 'bg-yellow-500 text-yellow-900' :
                      player.rank === 2 ? 'bg-gray-400 text-gray-900' :
                      player.rank === 3 ? 'bg-orange-500 text-orange-900' :
                      'bg-blue-500 text-blue-900'
                    }`}>
                      {player.rank === 1 ? '🥇' : 
                       player.rank === 2 ? '🥈' : 
                       player.rank === 3 ? '🥉' : player.rank}
                    </div>
                    <div className="flex items-center space-x-3">
                      {player.pfpUrl && (
                        <img 
                          src={player.pfpUrl} 
                          alt="Profile" 
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-white">
                          {player.displayName || player.username}
                        </div>
                        <div className="text-sm text-gray-300">@{player.username}</div>
                        <div className="text-xs text-gray-400">
                          Completed in {player.time}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-600">{player.score}</div>
                    <div className="text-xs text-gray-500">points</div>
                    <div className="text-xs text-gray-400">
                      {new Date(player.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current Player Position */}
          {context?.user?.fid && (
            <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {context.user.pfpUrl && (
                    <img 
                      src={context.user.pfpUrl} 
                      alt="Your Profile" 
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-semibold text-white">
                      {context.user.displayName || context.user.username}
                    </div>
                    <div className="text-sm text-blue-300">Your Score</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">{score}</div>
                  <div className="text-xs text-blue-500">points</div>
                  {submitting && <div className="text-xs text-blue-500">Submitting...</div>}
                  {submitted && <div className="text-xs text-green-500">✓ Submitted</div>}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col items-center space-y-4">
            <button
              onClick={async () => {
                try {
                  await actions.composeCast({
                    text: `I just played Quiz Trivia! 🎉 I scored ${score}. Come try it:`,
                    embeds: [
                      context?.user?.fid
                        ? `${APP_URL}/share/${context.user.fid}`
                        : `${APP_URL}`,
                    ],
                  });
                } catch (err) {
                  console.error('Failed to open Farcaster composer:', err);
                  const text = encodeURIComponent(`I just played Quiz Trivia! 🎉 I scored ${score}. Come try it:`);
                  const url = encodeURIComponent(
                    context?.user?.fid ? `${APP_URL}/share/${context.user.fid}` : `${APP_URL}`
                  );
                  const warpcastUrl = `https://warpcast.com/~/compose?text=${text}%20${url}`;
                  if (typeof window !== 'undefined') {
                    window.open(warpcastUrl, '_blank', 'noopener,noreferrer');
                  }
                }
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200"
            >
              📣 Share on Farcaster
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200"
            >
              🏠 Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Time Mode (45s) Component
// Time Mode (45s) Component with Question Shuffling
const TimeModePage: React.FC<TimeModePageProps> = ({ onExit, onComplete, context }) => {
  const [_sessionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { actions } = useMiniApp();

  // Utility function to shuffle an array using Fisher-Yates algorithm
  const shuffleArray = useCallback((array: QuizQuestion[]): QuizQuestion[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);


  const fetchMoreQuestions = useCallback(async () => {
    try {
      const res = await fetch('/api/questions/random?limit=25');
      const d = await res.json();
      if (Array.isArray(d.questions) && d.questions.length > 0) {
        const normalized = d.questions.map((q: any, idx: number) => ({
          id: Number(q.id ?? idx),
          question: String(q.question ?? q.text ?? ''),
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          correct: typeof q.correct === 'number' ? q.correct : (typeof q.correctIndex === 'number' ? q.correctIndex : 0),
          timeLimit: 45,
          explanation: String(q.explanation ?? ''),
        } as QuizQuestion)).filter((q: QuizQuestion) => q.question && q.options.length >= 2);
        
        if (normalized.length > 0) {
          // ✨ SHUFFLE the normalized questions before adding to state
          const shuffledQuestions = shuffleArray(normalized);
          setQuestions((prev) => [...prev, ...shuffledQuestions]);
          return;
        }
      }
      // Fallback to local questions if API yields nothing
      // ✨ SHUFFLE fallback questions before using them
      const shuffledFallback = shuffleArray(TIME_MODE_FALLBACK_QUESTIONS);
      setQuestions((prev) => prev.length === 0 ? [...prev, ...shuffledFallback] : prev);
    } catch (_e) {
      // On error, use shuffled fallback questions
      const shuffledFallback = shuffleArray(TIME_MODE_FALLBACK_QUESTIONS);
      setQuestions((prev) => prev.length === 0 ? [...prev, ...shuffledFallback] : prev);
    }
  }, [shuffleArray]);

  const startRun = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/time/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fid: context?.user?.fid }) });
      const d = await res.json();
      if (!res.ok || !d?.success) {
        setError(d?.error || 'Unable to start Time Mode');
        return;
      }
      // setSessionId(d.sessionId);
      setTimeLeft(d.durationSec || 45);
      setStarted(true);
      
      // ✨ Fetch and shuffle questions when starting the game
      if (questions.length < 5) {
        await fetchMoreQuestions();
      } else {
        // ✨ If questions already exist, shuffle them for a new game
        setQuestions((prev) => shuffleArray(prev));
        setQIndex(0); // Reset to first question
      }
    } catch (_e) {
      setError('Network error');
    }
  }, [context?.user?.fid, fetchMoreQuestions, questions.length, shuffleArray]);

  // countdown
  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, timeLeft]);

  // auto submit on end (guarded to run once)
  useEffect(() => {
    if (!started) return;
    if (timeLeft > 0) return;
    if (submitting || hasSubmitted) return;
    setSubmitting(true);
    const run = async () => {
      try {
        const payload = {
          fid: context?.user?.fid,
          correctCount,
          totalAnswered,
          durationSec: 45,
          avgAnswerTimeSec: totalAnswered > 0 ? 45 / totalAnswered : 0,
          username: context?.user?.username,
          displayName: context?.user?.displayName,
          pfpUrl: context?.user?.pfpUrl,
        };
        await fetch('/api/time/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } catch (_e) {}
      setSubmitting(false);
      setHasSubmitted(true);
      // stop any further game-side effects
      setStarted(false);
      // Call onComplete to show results-submit page
      if (onComplete) {
        onComplete(correctCount, totalAnswered || 1); // Use totalAnswered, or 1 as fallback
      }
    };
    run();
  }, [started, timeLeft, submitting, hasSubmitted, correctCount, totalAnswered, context?.user, onComplete]);

  const handleAnswer = useCallback((idx: number) => {
    const q = questions[qIndex];
    if (!q) return;
    setTotalAnswered((n) => n + 1);
    if (idx === q.correct) setCorrectCount((n) => n + 1);
    const next = qIndex + 1;
    if (next >= questions.length - 3) fetchMoreQuestions();
    setQIndex(next);
  }, [questions, qIndex, fetchMoreQuestions]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const q = questions[qIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4">
      <div className="max-w-2xl mx-auto pt-6">
        {/* Top bar with back */}
        <div className="flex items-center justify-between mb-4 text-white">
        <button onClick={onExit} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20">← Back</button>
          <div className="flex items-center gap-4">
            <div className="font-bold">Time: {formatTime(timeLeft)}</div>
            <div className="font-bold">Score: {correctCount}</div>
          </div>
        </div>

        {!started ? (
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Time Mode • 45s</h2>
            <p className="text-gray-600 mb-6">Answer as many as you can. Costs 10 coins to start.</p>
            {error && <div className="mb-4 text-red-600 font-semibold">{error}</div>}
            <button onClick={startRun} className="bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-blue-700">Start</button>
          </div>
        ) : !q ? (
          <div className="text-center text-white">Loading questions…</div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="text-gray-500 mb-2">Question {qIndex + 1}</div>
            <h2 className="text-xl font-bold text-gray-800 mb-6">{q.question}</h2>
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(i)} className="w-full p-4 text-left rounded-lg border-2 bg-gray-50 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <span className="font-semibold mr-3">{String.fromCharCode(65 + i)}.</span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ChallengeModePageProps {
  onExit: () => void;
  context?: any;
}

const ChallengeModePage: React.FC<ChallengeModePageProps> = ({ onExit, context }) => {
  const [challengeId, setChallengeId] = React.useState<string>('');
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [timeLeft, setTimeLeft] = React.useState<number>(120);
  const [started, setStarted] = React.useState(false);
  const [questions, setQuestions] = React.useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = React.useState(0);
  const [correct, setCorrect] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const createChallenge = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/challenge/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fid: context?.user?.fid }) });
      const d = await res.json();
      if (!res.ok || !d?.success) { setError(d?.error || 'Failed to create'); return; }
      setActiveId(d.id);
      // fetch challenge details (has questions)
      const chRes = await fetch(`/api/challenge/${d.id}`);
      const ch = await chRes.json();
      setQuestions(ch?.challenge?.questions || []);
    } finally {
      setLoading(false);
    }
  };

  const acceptChallenge = async () => {
    if (!challengeId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/challenge/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fid: context?.user?.fid, id: challengeId }) });
      const d = await res.json();
      if (!res.ok || !d?.success) { setError(d?.error || 'Failed to accept'); return; }
      setActiveId(challengeId);
      const chRes = await fetch(`/api/challenge/${challengeId}`);
      const ch = await chRes.json();
      setQuestions(ch?.challenge?.questions || []);
    } finally {
      setLoading(false);
    }
  };

  const startRound = () => {
    setStarted(true);
    setTimeLeft(120);
  };

  React.useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, timeLeft]);

  React.useEffect(() => {
    if (!started || timeLeft > 0 || !activeId) return;
    // submit
    fetch('/api/challenge/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: activeId, fid: context?.user?.fid, correct, total, durationSec: 120 }) }).catch(() => {});
  }, [started, timeLeft, activeId, correct, total, context?.user?.fid]);

  const q = questions[qIndex];
  const onAnswer = (i: number) => {
    if (!q) return;
    setTotal((n) => n + 1);
    if (i === q.correct) setCorrect((n) => n + 1);
    setQIndex((n) => n + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4">
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex items-center justify-between mb-4 text-white">
          <button onClick={onExit} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20">← Back</button>
          <div className="font-bold">{started ? `Time: ${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}` : 'Challenge Mode'}</div>
        </div>

        {!activeId ? (
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Create or Join</h2>
            {error && <div className="mb-4 text-red-600 font-semibold">{error}</div>}
            <div className="flex flex-col gap-3">
              <button disabled={loading} onClick={createChallenge} className="bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-60">Create Challenge (10 coins)</button>
              <div className="flex items-center gap-2">
                <input value={challengeId} onChange={(e)=>setChallengeId(e.target.value)} placeholder="Enter Challenge ID" className="flex-1 px-3 py-2 border rounded" />
                <button disabled={loading || !challengeId} onClick={acceptChallenge} className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold py-2 px-4 rounded-xl disabled:opacity-60">Accept</button>
              </div>
            </div>
          </div>
        ) : !started ? (
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Challenge Ready</h3>
            <p className="text-gray-600 mb-6">ID: {activeId}. 10 questions • 120s.</p>
            <button onClick={startRound} className="bg-gradient-to-r from-green-500 to-blue-600 text-white font-bold py-3 px-6 rounded-xl">Start</button>
          </div>
        ) : !q ? (
          <div className="text-center text-white">Loading…</div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <div className="text-gray-500 mb-2">Question {qIndex + 1} of 10</div>
            <h2 className="text-xl font-bold text-gray-800 mb-6">{q.question}</h2>
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => onAnswer(i)} className="w-full p-4 text-left rounded-lg border-2 bg-gray-50 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <span className="font-semibold mr-3">{String.fromCharCode(65 + i)}.</span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
export default function QuizTriviaApp() {
  const { } = useMiniApp();
  const [currentScreen, setCurrentScreen] = useState<'home' | 'results' | 'results-submit' | 'time' | 'challenge' | 'weekly-quiz'>('home');
  const [showRules, setShowRules] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalAnswers, setFinalAnswers] = useState<Answer[]>([]);
  const [finalTime, setFinalTime] = useState<string>('0:00');
  const [balance, setBalance] = useState<number | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>(QuizMode.CLASSIC);
  const [totalQuestions, setTotalQuestions] = useState(10);

  // Get Farcaster context
  const { context } = useMiniApp();

  // handleStartQuiz removed - Classic mode replaced by Weekly Quiz

  const handleStartTime = () => {
    setCurrentScreen('time');
  };

  const handleStartWeeklyQuiz = () => {
    setCurrentScreen('weekly-quiz');
  };

  const handleShowRules = () => {
    setShowRules(true);
  };

  const handleCloseRules = () => {
    setShowRules(false);
  };

  const handleQuizComplete = (score: number, answers: Answer[], time: string) => {
    setFinalScore(score);
    setFinalAnswers(answers);
    setFinalTime(time);
    setQuizMode(QuizMode.CLASSIC); // Weekly mode uses CLASSIC
    setTotalQuestions(10); // Weekly mode has 10 questions
    setCurrentScreen('results-submit');
  };

  const handleScoreSubmitted = () => {
    // After blockchain transaction success, show leaderboard
    setCurrentScreen('results');
  };

  const handleViewLeaderboard = () => {
    // Go directly to leaderboard (skip submission if error)
    setCurrentScreen('results');
  };

  const handleRestart = () => {
    setCurrentScreen('home');
    setFinalScore(0);
    setFinalAnswers([]);
    setFinalTime('0:00');
  };

  // Fetch balance
  useEffect(() => {
    const fid = context?.user?.fid;
    if (!fid) return;
    fetch(`/api/currency/balance?fid=${fid}`)
      .then(r => r.json())
      .then(d => setBalance(typeof d.balance === 'number' ? d.balance : null))
      .catch(() => {});
  }, [context?.user?.fid]);

  const [showSpinWheel, setShowSpinWheel] = useState(false);

  const handleSpinWheel = () => {
    setShowSpinWheel(true);
  };

  const handleSpinWheelClose = () => {
    setShowSpinWheel(false);
  };

  const handleSpinWheelSpin = async () => {
    const fid = context?.user?.fid;
    if (!fid) return { success: false, error: 'No user ID' };
    
    try {
      const res = await fetch('/api/currency/claim-daily', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ fid }) 
      });
      const data = await res.json();
      
      if (data?.balance !== undefined) {
        setBalance(data.balance);
      }
      
      return data;
    } catch (error) {
      console.error('Spin wheel error:', error);
      return { success: false, error: 'Failed to spin wheel' };
    }
  };

  // Use the QT claim hook
  const { claimQTReward, address } = useQTClaim();

  const handleQTTokenWin = async (userAddress: string) => {
    return await claimQTReward(userAddress);
  };

  return (
    <div className="w-full h-screen">
      {currentScreen === 'home' && (
        <>
          <HomePage 
            balance={balance}
            onStartTimeMode={handleStartTime}
            onStartChallenge={() => setCurrentScreen('challenge')}
            onShowRules={handleShowRules}
            onSpinWheel={handleSpinWheel}
            onStartWeeklyQuiz={handleStartWeeklyQuiz}
          />
          <div className="h-20" />
          <QTTokenBar />
        </>
      )}

      {/* Spin Wheel Modal */}
      {showSpinWheel && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleSpinWheelClose}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button (×) */}
            <button
              onClick={handleSpinWheelClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
            
            <SpinWheel 
              onSpin={handleSpinWheelSpin} 
              onQTTokenWin={handleQTTokenWin}
              userAddress={address || "0x0000000000000000000000000000000000000000"}
            />
          </div>
        </div>
      )}
      
      
      {currentScreen === 'time' && (
        <TimeModePage 
          onExit={() => setCurrentScreen('home')}
          onComplete={(score: number, totalQuestions: number) => {
            setFinalScore(score);
            setQuizMode(QuizMode.TIME_MODE);
            setTotalQuestions(totalQuestions);
            setCurrentScreen('results-submit');
          }}
          context={context}
        />
      )}

      {currentScreen === 'challenge' && (
        <ChallengeModePage 
          onExit={() => setCurrentScreen('home')}
          context={context}
        />
      )}

      {currentScreen === 'weekly-quiz' && (
        <WeeklyQuizPage 
          config={currentWeeklyQuiz}
          onComplete={handleQuizComplete}
          context={context}
        />
      )}

      {currentScreen === 'results-submit' && (
        <QuizResultsSubmitPage 
          score={finalScore}
          totalQuestions={totalQuestions}
          mode={quizMode}
          onSubmit={handleScoreSubmitted}
          onViewLeaderboard={handleViewLeaderboard}
        />
      )}

      {currentScreen === 'results' && (
        <ResultsPage 
          score={finalScore}
          answers={finalAnswers}
          time={finalTime}
          onRestart={handleRestart}
          context={context}
        />
      )}
      
      {showRules && (
        <RulesPopup onClose={handleCloseRules} />
      )}
    </div>
  );
}

// Export HomeTab as a named export for compatibility
export { QuizTriviaApp as HomeTab };