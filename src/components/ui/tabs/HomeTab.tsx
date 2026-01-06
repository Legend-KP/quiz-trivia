import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Trophy, Star, X } from 'lucide-react';
import { useMiniApp } from '@neynar/react';
import { APP_URL, APP_TITLE_IMAGE_URL, APP_NAME } from '~/lib/constants';
import QuizStartButton from '~/components/QuizStartButton';
import { QuizMode } from '~/lib/wallet';
import WeeklyQuizPage from '~/components/WeeklyQuizPage';
import WeeklyQuizStartButton from '~/components/WeeklyQuizStartButton';
import { currentWeeklyQuiz, MIN_REQUIRED_QT, formatTokens } from '~/lib/weeklyQuiz';
import { useQuizState } from '~/hooks/useWeeklyQuiz';
import QuizResultsSubmitPage from '~/components/QuizResultsSubmitPage';
import { BetModeTab } from './BetModeTab';
import { useAccount, useReadContract } from 'wagmi';
import { base } from 'wagmi/chains';
import { formatUnits } from 'viem';

const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const QT_TOKEN_ADDRESS = "0x361faAea711B20caF59726e5f478D745C187cB07";

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
  onStartWeeklyQuiz: () => void;
  onStartBetMode: () => void;
}

// QuizPageProps removed - Classic mode is now replaced by Weekly Quiz mode

interface ResultsPageProps {
  score: number;
  answers: Answer[];
  time: string;
  onRestart: () => void;
  context?: any;
  mode: QuizMode;
  totalQuestions: number;
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
  
  // Quantum-Resistant Security
  { id: 1068, question: 'What is the primary goal of Quantum-Resistant Security?', options: ['To make cryptography faster on classical computers','To protect cryptographic systems against attacks from quantum computers','To replace all symmetric encryption algorithms','To increase blockchain transaction throughput'], correct: 1, timeLimit: 45, explanation: 'Quantum-Resistant Security aims to secure cryptographic systems against the unique computational capabilities of quantum computers, which can break many classical encryption schemes like RSA and ECC.' },
  { id: 1079, question: 'What is the main threat of quantum computers to current cryptography?', options: ['Faster internet speeds','Reducing blockchain transaction fees','Breaking classical public-key cryptography such as RSA and ECC','Enhancing symmetric encryption security'], correct: 2, timeLimit: 45, explanation: 'Quantum computers can efficiently solve problems like factoring large numbers and computing discrete logarithms, breaking RSA and ECC.' },
  { id: 1080, question: 'Which type of cryptography is considered quantum-resistant?', options: ['RSA','Elliptic Curve Cryptography (ECC)','Lattice-based cryptography','Diffie-Hellman key exchange'], correct: 2, timeLimit: 45, explanation: 'Lattice-based cryptography is resistant to quantum attacks because known quantum algorithms cannot efficiently solve lattice problems.' },
  { id: 1081, question: 'Grover\'s algorithm affects which type of cryptographic systems?', options: ['Symmetric-key cryptography','Asymmetric-key cryptography','Hash functions only','Digital signatures only'], correct: 0, timeLimit: 45, explanation: 'Grover\'s algorithm speeds up brute-force attacks on symmetric keys, effectively halving their bit security.' },
  { id: 1082, question: 'Which hash-based signature scheme is considered quantum-safe?', options: ['RSA-PSS','Lamport signatures','ECDSA','DSA'], correct: 1, timeLimit: 45, explanation: 'Lamport and other hash-based signature schemes remain secure against quantum attacks as they rely on pre-image resistance of hash functions.' },
  { id: 1083, question: 'What is the main principle of lattice-based cryptography?', options: ['Factoring large numbers','Using hash functions','Multiplying prime numbers','Finding short vectors in high-dimensional lattices is computationally hard'], correct: 3, timeLimit: 45, explanation: 'The security relies on the hardness of lattice problems like the Shortest Vector Problem (SVP), which is believed to be resistant to quantum algorithms.' },
  { id: 1084, question: 'Which algorithm could potentially break ECC and RSA using a quantum computer?', options: ['Shor\'s algorithm','Grover\'s algorithm','Dijkstra\'s algorithm','Bellman-Ford algorithm'], correct: 0, timeLimit: 45, explanation: 'Shor\'s algorithm can efficiently factor large integers and compute discrete logarithms, threatening ECC and RSA.' },
  { id: 1085, question: 'Which of the following is a promising quantum-resistant digital signature scheme?', options: ['ECDSA','SPHINCS+','RSA-2048','SHA-1'], correct: 1, timeLimit: 45, explanation: 'SPHINCS+ is a hash-based digital signature scheme designed to be secure against quantum attacks.' },
  { id: 1086, question: 'Why are symmetric-key algorithms less vulnerable to quantum attacks?', options: ['Because they use prime factorization','Because they are hash-based','Because quantum computers cannot process bits','Because Grover\'s algorithm only halves their effective key size'], correct: 3, timeLimit: 45, explanation: 'Quantum attacks using Grover\'s algorithm can speed up brute-force attacks but only reduce effective security, so doubling key size mitigates the threat.' },
  { id: 1087, question: 'What is a hybrid cryptographic approach in quantum-resistant security?', options: ['Combining quantum computers with classical computers','Using both classical and quantum-resistant algorithms together','Using only hash functions','Replacing all keys with symmetric keys'], correct: 1, timeLimit: 45, explanation: 'Hybrid cryptography combines traditional and quantum-safe algorithms to maintain security during the transition to fully quantum-resistant systems.' },
  { id: 1088, question: 'Which is considered a post-quantum key exchange method?', options: ['Diffie-Hellman over integers','ECDH','NTRUEncrypt','RSA key exchange'], correct: 2, timeLimit: 45, explanation: 'NTRUEncrypt is a lattice-based key exchange protocol considered secure against quantum attacks.' },
  
  // Zero-Knowledge Proofs
  { id: 1069, question: 'What does a Zero-Knowledge Proof allow a prover to demonstrate?', options: ['Knowledge of a value without revealing the value itself','The speed of blockchain consensus','The ownership of all private keys','That the transaction fee is zero'], correct: 0, timeLimit: 45, explanation: 'ZKPs let one party prove knowledge of a fact or value without revealing the underlying information.' },
  { id: 1070, question: 'Which of the following is a key property of Zero-Knowledge Proofs?', options: ['Integrity, Decentralization, and Transparency','Privacy, Speed, and Scalability','Confidentiality, Accuracy, and Cost-efficiency','Completeness, Soundness, and Zero-Knowledge'], correct: 3, timeLimit: 45, explanation: 'ZKPs are defined by three core properties: completeness, soundness, and zero-knowledge.' },
  { id: 1071, question: 'Which blockchain uses zk-SNARKs to provide private transactions?', options: ['Zcash','Bitcoin','Ethereum (mainnet)','Polygon PoS'], correct: 0, timeLimit: 45, explanation: 'Zcash pioneered zk-SNARKs to enable shielded transactions that hide sender, receiver, and amount.' },
  { id: 1072, question: 'What does the term "zero-knowledge" specifically refer to in ZKPs?', options: ['That the prover has no private data','That no computation occurs during verification','That the verifier learns nothing beyond the validity of the claim','That the proof is always probabilistic'], correct: 2, timeLimit: 45, explanation: 'The "zero-knowledge" aspect ensures no information is leaked other than the fact that the statement is true.' },
  { id: 1073, question: 'In zk-SNARK, what does the "SNARK" stand for?', options: ['Succinct Non-Interactive Argument of Knowledge','Secure Non-Automated Reasoning Kernel','Simple Non-Analytical Random Key','Symmetric Non-Advanced Recursive Knowledge'], correct: 0, timeLimit: 45, explanation: 'zk-SNARK means a succinct, non-interactive argument of knowledge — proofs are compact and verifiable quickly.' },
  { id: 1074, question: 'What makes zk-STARKs different from zk-SNARKs?', options: ['They don\'t require a trusted setup and are post-quantum secure','They are slower and less transparent','They use elliptic curve pairings','They require private keys from validators'], correct: 0, timeLimit: 45, explanation: 'zk-STARKs remove the need for trusted setup and are quantum-resistant, using hash-based cryptography.' },
  { id: 1075, question: 'Which statement best explains the "soundness" property in ZKPs?', options: ['A dishonest prover cannot convince the verifier of a false statement','Proofs always execute faster than traditional verifications','Only the prover learns the verification result','Soundness ensures public verifiability of all proofs'], correct: 0, timeLimit: 45, explanation: 'Soundness guarantees that false claims cannot be proven true, maintaining trust in the proof system.' },
  { id: 1076, question: 'Which Zero-Knowledge proof system scales best for large computations?', options: ['zk-SNARK','zk-STARK','Bulletproofs','zk-Rollups'], correct: 1, timeLimit: 45, explanation: 'zk-STARKs are highly scalable due to transparent setup and proof sizes that grow logarithmically with computation size.' },
  { id: 1077, question: 'Why are zk-STARKs considered post-quantum secure while zk-SNARKs are not?', options: ['zk-STARKs rely on lattice-based assumptions','zk-STARKs require smaller keys','zk-SNARKs use symmetric encryption','zk-STARKs use hash-based security, resistant to Shor\'s algorithm'], correct: 3, timeLimit: 45, explanation: 'zk-STARKs rely on collision-resistant hash functions, which are believed to be safe from quantum attacks.' },
  { id: 1078, question: 'What role do ZKPs play in blockchain scalability solutions like zk-Rollups?', options: ['They replace consensus algorithms','Compress many transactions into one proof','They manage wallet private keys','They remove the need for nodes'], correct: 1, timeLimit: 45, explanation: 'zk-Rollups batch multiple off-chain transactions and post a ZKP on-chain to prove their validity efficiently.' },
  
  // Additional Zero-Knowledge Proof Questions
  { id: 2001, question: 'Which component primarily ensures succinct verification in zk-SNARKs?', options: ['Trusted setup parameters', 'Elliptic curve signatures', 'Recursive hashing functions', 'Polynomial commitment schemes'], correct: 3, timeLimit: 45, explanation: 'Polynomial commitments allow large computations to be verified with very small proofs.' },
  { id: 2002, question: 'What is the main reason zk-STARKs are considered quantum-resistant?', options: ['They rely on lattice-based cryptography', 'They avoid elliptic curve assumptions', 'They use hash-based cryptographic primitives', 'They depend on symmetric encryption'], correct: 2, timeLimit: 45, explanation: 'zk-STARKs rely mainly on hash functions, which are more resistant to quantum attacks.' },
  { id: 2003, question: 'Which trade-off distinguishes zk-STARKs from zk-SNARKs most clearly?', options: ['Faster proof generation but slower verification', 'Larger proof sizes but no trusted setup', 'Higher gas fees but better composability', 'Lower security assumptions but weaker privacy'], correct: 1, timeLimit: 45, explanation: 'zk-STARKs avoid trusted setup but produce larger proofs than zk-SNARKs.' },
  { id: 2004, question: 'Which Ethereum upgrade significantly improved ZK rollup scalability?', options: ['Byzantium hard fork', 'EIP-1559 fee market change', 'EIP-4844 proto-danksharding', 'The Merge to Proof of Stake'], correct: 2, timeLimit: 45, explanation: 'EIP-4844 introduced blobs, lowering data costs for rollups and improving scalability.' },
  { id: 2005, question: 'In ZK rollups, what is posted to Layer 1 for verification?', options: ['Encrypted user balances', 'Compressed execution traces', 'Full transaction calldata', 'Validity proofs and state roots'], correct: 3, timeLimit: 45, explanation: 'ZK rollups submit proofs and state roots to L1 to verify correctness without re-execution.' },
  { id: 2006, question: 'Why are ZK proofs important for private DeFi applications?', options: ['They eliminate the need for liquidity', 'They hide transaction logic and balances', 'They remove gas costs entirely', 'They replace smart contracts'], correct: 1, timeLimit: 45, explanation: 'ZK proofs enable privacy while still allowing on-chain verification.' },
  { id: 2007, question: 'What is the biggest scalability challenge for ZK rollups today?', options: ['High Layer 1 gas costs for proofs', 'Slow block finality times', 'Limited smart contract expressiveness', 'Validator hardware requirements'], correct: 0, timeLimit: 45, explanation: 'Posting proofs and data to L1 is still costly, limiting scalability.' },
  { id: 2008, question: 'What is the main purpose of a Zero-Knowledge Proof?', options: ['To encrypt transaction data on-chain', 'To prove a statement without revealing data', 'To speed up block confirmation times', 'To replace consensus mechanisms'], correct: 1, timeLimit: 45, explanation: 'ZK proofs allow verification of truth without revealing the underlying secret.' },
  { id: 2009, question: 'Why are Zero-Knowledge Proofs useful for privacy-focused applications?', options: ['They hide sensitive data while proving correctness', 'They reduce transaction execution time', 'They eliminate the need for validators', 'They prevent smart contract execution'], correct: 0, timeLimit: 45, explanation: 'ZK proofs protect user privacy while still allowing public verification.' },
  { id: 2010, question: 'What is the "witness" in a Zero-Knowledge Proof system?', options: ['The private data proving the statement', 'The public input for verification', 'The final proof submitted on-chain', 'The cryptographic verification key'], correct: 0, timeLimit: 45, explanation: 'The witness is the private input that satisfies the proof\'s condition.' },
  
  // Modular Blockchains & L2s Questions
  { id: 2011, question: 'What does "modular blockchain" primarily mean?', options: ['A blockchain optimized only for smart contracts', 'A blockchain that separates execution, settlement, and data availability', 'A chain that supports multiple virtual machines', 'A blockchain that runs without validators'], correct: 1, timeLimit: 45, explanation: 'A blockchain that separates execution, settlement, and data availability' },
  { id: 2012, question: 'In Ethereum\'s modular stack, which layer provides economic finality?', options: ['Execution layer', 'Data availability layer', 'Settlement layer', 'Sequencer layer'], correct: 2, timeLimit: 45, explanation: 'Settlement layer' },
  { id: 2013, question: 'What is the main role of rollups in Ethereum scaling?', options: ['Increasing block size on L1', 'Executing transactions off-chain and posting proofs on L1', 'Replacing validators with sequencers', 'Eliminating gas fees'], correct: 1, timeLimit: 45, explanation: 'Executing transactions off-chain and posting proofs on L1' },
  { id: 2014, question: 'Which statement best describes Optimistic Rollups?', options: ['They assume transactions are invalid unless proven correct', 'They rely on fraud proofs to challenge incorrect execution', 'They finalize transactions instantly', 'They do not depend on Ethereum for security'], correct: 1, timeLimit: 45, explanation: 'They rely on fraud proofs to challenge incorrect execution' },
  { id: 2015, question: 'What differentiates zk-rollups from optimistic rollups?', options: ['zk-rollups use sequencers, optimistic rollups don\'t', 'zk-rollups rely on validity proofs instead of fraud proofs', 'zk-rollups store all data off-chain', 'zk-rollups cannot support smart contracts'], correct: 1, timeLimit: 45, explanation: 'zk-rollups rely on validity proofs instead of fraud proofs' },
  { id: 2016, question: 'Why is Data Availability (DA) critical for rollups?', options: ['It ensures faster transaction execution', 'It allows anyone to reconstruct the rollup state', 'It reduces gas costs on Ethereum', 'It prevents MEV extraction'], correct: 1, timeLimit: 45, explanation: 'It allows anyone to reconstruct the rollup state' },
  { id: 2017, question: 'Which of the following is an example of a Data Availability-focused layer?', options: ['Arbitrum', 'Optimism', 'Celestia', 'Starknet'], correct: 2, timeLimit: 45, explanation: 'Celestia' },
  { id: 2018, question: 'What problem do shared sequencers aim to solve?', options: ['High gas fees on Ethereum', 'Fragmented liquidity across rollups', 'Lack of decentralization in DA layers', 'Limited smart contract support'], correct: 1, timeLimit: 45, explanation: 'Fragmented liquidity across rollups' },
  { id: 2019, question: 'In a modular design, what does the execution layer primarily handle?', options: ['Consensus and validator incentives', 'Storing transaction data permanently', 'Running transaction logic and state changes', 'Providing cryptographic finality'], correct: 2, timeLimit: 45, explanation: 'Running transaction logic and state changes' },
  { id: 2020, question: 'What is a key trade-off when moving execution off L1 to rollups?', options: ['Reduced security guarantees', 'Increased reliance on smart contracts and proofs', 'Loss of composability entirely', 'Elimination of decentralization'], correct: 1, timeLimit: 45, explanation: 'Increased reliance on smart contracts and proofs' },
    
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
const HomePage: React.FC<HomePageProps> = ({ balance, onStartTimeMode, onStartChallenge, onStartWeeklyQuiz, onStartBetMode }) => {
  const _weeklyQuizState = useQuizState(currentWeeklyQuiz);
  const [weeklyUserCompleted, setWeeklyUserCompleted] = useState(false);
  const { actions, added, context } = useMiniApp();
  const attemptedAddRef = useRef(false);
  const { address, isConnected, chainId } = useAccount();
  const qtTokenAddress = (process.env.NEXT_PUBLIC_QT_TOKEN_ADDRESS || QT_TOKEN_ADDRESS) as `0x${string}`;

  // Check if wallet is on Base network
  const isOnBaseNetwork = chainId === base.id;

  // Read QT token balance from wallet
  // Note: We don't enforce chainId in the query to allow reading from any chain
  // The contract will still only work on Base, but we can check balance from any chain
  const { data: walletBalanceRaw, error: balanceError, isLoading: isBalanceLoading, refetch: refetchBalance } = useReadContract({
    address: qtTokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    // Remove chainId requirement to allow reading from any connected chain
    // chainId: base.id,
    query: {
      enabled: !!address && !!qtTokenAddress && isConnected && typeof address === 'string',
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Convert balance from wei to QT (18 decimals)
  const walletBalance = walletBalanceRaw ? parseFloat(formatUnits(walletBalanceRaw, 18)) : 0;

  // Log balance errors for debugging
  useEffect(() => {
    if (balanceError) {
      console.error('❌ Error reading QT wallet balance:', balanceError);
      console.error('   Address:', address);
      console.error('   QT Token Address:', qtTokenAddress);
      console.error('   Is Connected:', isConnected);
      console.error('   Chain ID:', chainId);
      console.error('   Expected Chain ID (Base):', base.id);
      console.error('   Is on Base Network:', isOnBaseNetwork);
    }
  }, [balanceError, address, qtTokenAddress, isConnected, chainId, isOnBaseNetwork]);

  // Log balance reading status
  useEffect(() => {
    if (address && isConnected) {
      console.log('🔍 Wallet Balance Check:');
      console.log('   Address:', address);
      console.log('   QT Token Address:', qtTokenAddress);
      console.log('   Chain ID:', chainId);
      console.log('   Is on Base Network:', isOnBaseNetwork);
      console.log('   Raw Balance:', walletBalanceRaw?.toString());
      console.log('   Parsed Balance:', walletBalance);
      console.log('   Is Loading:', isBalanceLoading);
      console.log('   Has Error:', !!balanceError);
      console.log('   Query Enabled:', !!address && !!qtTokenAddress && isConnected && typeof address === 'string');
      if (balanceError) {
        console.error('   Error Details:', balanceError);
      }
    }
  }, [address, isConnected, walletBalanceRaw, walletBalance, isBalanceLoading, balanceError, qtTokenAddress, chainId, isOnBaseNetwork]);

  // Determine if current user has already started or completed the current weekly quiz (single attempt enforcement)
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
        // Server check for completion
        const res = await fetch(`/api/leaderboard?mode=CLASSIC&quizId=${quizId}`);
        const data = await res.json();
        const exists = Array.isArray(data?.leaderboard) && data.leaderboard.some((e: any) => e.fid === fid);
        // Local backup check - check both started and completed
        const lsCompletedKey = `weekly_completed_${quizId}_${fid}`;
        const lsStartedKey = `weekly_started_${quizId}_${fid}`;
        const localCompleted = typeof window !== 'undefined' ? !!localStorage.getItem(lsCompletedKey) : false;
        const localStarted = typeof window !== 'undefined' ? !!localStorage.getItem(lsStartedKey) : false;
        if (!cancelled) setWeeklyUserCompleted(exists || localCompleted || localStarted);
      } catch (_e) {
        // Fallback to localStorage only
        try {
          const lsCompletedKey = `weekly_completed_${quizId}_${fid}`;
          const lsStartedKey = `weekly_started_${quizId}_${fid}`;
          const localCompleted = typeof window !== 'undefined' ? !!localStorage.getItem(lsCompletedKey) : false;
          const localStarted = typeof window !== 'undefined' ? !!localStorage.getItem(lsStartedKey) : false;
          if (!cancelled) setWeeklyUserCompleted(localCompleted || localStarted);
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
    <div className="relative w-full h-screen overflow-y-auto">
      {/* Gradient Background - Full Frame (Fixed) */}
      <div className="fixed inset-0 bg-gradient-to-r from-blue-900 via-purple-800 to-orange-500 -z-10"></div>
      
      {/* Grainy Texture Overlay (Fixed) */}
      <div className="fixed inset-0 opacity-20 -z-10">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Coins Panel - Top Left (Fixed like profile) */}
      <div className="fixed top-4 left-4 z-50">
        <span className="px-3 py-1 rounded-full bg-black/30 border border-white/20 text-white text-sm">Coins: {balance ?? '—'}</span>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-start min-h-full px-6 text-center gap-4 pt-8 sm:pt-12 md:pt-16 pb-24">

        {/* QUIZ TRIVIA - Title Image Only */}
        <div className="relative mb-2">
          {APP_TITLE_IMAGE_URL ? (
            <img
              src={APP_TITLE_IMAGE_URL}
              alt="Quiz Trivia"
              className="mx-auto w-80 h-80 sm:w-96 sm:h-96 md:w-[28rem] md:h-[28rem] lg:w-[32rem] lg:h-[32rem] object-contain drop-shadow-lg"
            />
          ) : (
            <h3 className="text-6xl md:text-7xl lg:text-8xl font-black text-yellow-400 uppercase tracking-wider" style={{
            fontFamily: 'Impact, Arial Black, sans-serif',
              textShadow: '2px 2px 0px rgba(0,0,0,0.8)'
          }}>
              QUIZ TRIVIA
          </h3>
          )}
        </div>

        {/* Mode Buttons */}
        <div className="space-y-4 w-full max-w-sm md:max-w-md -mt-4">
          {/* Time Mode - First */}
          <QuizStartButton
            mode={QuizMode.TIME_MODE}
            modeName="Time Mode"
            onQuizStart={onStartTimeMode}
          />

          {/* Weekly Quiz - Second */}
          <WeeklyQuizStartButton
            quizState={_weeklyQuizState}
            onQuizStart={async () => {
              try {
                const fid = context?.user?.fid;
                const quizId = currentWeeklyQuiz.id;
                
                if (!fid || !quizId) {
                  throw new Error('User not authenticated. Please refresh the page and try again.');
                }

                // Check if user has connected wallet and QT tokens
                if (!isConnected || !address) {
                  throw new Error('Please connect your Farcaster wallet to start the Weekly Quiz. You need to hold QT tokens to participate.');
                }

                // Check QT token balance (require at least 5M QT tokens)
                if (walletBalance < MIN_REQUIRED_QT) {
                  const requiredFormatted = formatTokens(MIN_REQUIRED_QT);
                  const currentFormatted = formatTokens(walletBalance);
                  const shortfall = MIN_REQUIRED_QT - walletBalance;
                  const shortfallFormatted = formatTokens(shortfall);
                  throw new Error(`❌ Insufficient QT Tokens\n\n📊 Required: ${requiredFormatted} QT\n💰 Your Balance: ${currentFormatted} QT\n📉 You Need: ${shortfallFormatted} QT more\n\n💡 Please add more QT tokens to your wallet to participate in the Weekly Quiz.`);
                }

                // Server-side check: Verify user hasn't already completed this quiz
                const checkRes = await fetch(`/api/leaderboard/check?fid=${fid}&quizId=${quizId}`);
                const checkData = await checkRes.json();
                
                if (checkData.completed) {
                  setWeeklyUserCompleted(true);
                  throw new Error('You have already completed this quiz. Each user can only take the quiz once per session.');
                }

                // All checks passed - start the quiz
                onStartWeeklyQuiz();
              } catch (error: any) {
                // Error will be handled by WeeklyQuizStartButton's error state
                console.error('Failed to start weekly quiz:', error);
                throw error; // Re-throw to let the component handle it
              }
            }}
            userCompleted={weeklyUserCompleted}
            isWalletConnected={isConnected && !!address}
            walletBalance={walletBalance}
            hasEnoughQT={walletBalance >= MIN_REQUIRED_QT}
            onRefreshBalance={refetchBalance}
          />

          {/* Bet Mode */}
          <button
            onClick={onStartBetMode}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-6 px-10 rounded-xl text-2xl transform hover:scale-105 transition-all duration-200 shadow-2xl"
          >
            🎰 Bet Mode
          </button>

          {/* Challenge Mode - Hidden for now */}
          {/* <div className="relative">
            <span className="absolute -top-2 right-3 text-xs font-semibold bg-black/50 text-white px-2 py-0.5 rounded-md backdrop-blur">
              Coming Soon
            </span>
          <QuizStartButton
            mode={QuizMode.CHALLENGE}
            modeName="Challenge Mode"
            onQuizStart={onStartChallenge}
              className="pointer-events-none opacity-60"
          />
        </div> */}
        </div>
      </div>
    </div>
  );
};

// QuizPage Component removed - Classic mode has been replaced by Weekly Quiz mode


// Results Component
const ResultsPage: React.FC<ResultsPageProps> = ({
  score,
  answers: _answers,
  onRestart: _onRestart,
  context,
  time,
  mode,
  totalQuestions,
}) => {
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
  const modeSlug =
    mode === QuizMode.TIME_MODE ? "time" : mode === QuizMode.CLASSIC ? "weekly" : "classic";
  const accuracyPercent =
    totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : null;

  // Track the quizId when the component mounts (the quiz the user just completed)
  // Only track quizId for CLASSIC mode (Weekly Quiz)
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(
    mode === QuizMode.CLASSIC ? currentWeeklyQuiz.id : null
  );

  const fetchLeaderboard = useCallback(async (quizId?: string | null) => {
    let url: string;
    
    if (mode === QuizMode.CLASSIC) {
      // Weekly Quiz: use quizId
      const quizIdToUse = quizId || currentQuizId || currentWeeklyQuiz.id;
      url = `/api/leaderboard?mode=CLASSIC&quizId=${quizIdToUse}`;
      console.log('🔍 Fetching CLASSIC leaderboard for quizId:', quizIdToUse);
    } else if (mode === QuizMode.TIME_MODE) {
      // Time Mode: no quizId
      url = `/api/leaderboard?mode=TIME_MODE`;
      console.log('🔍 Fetching TIME_MODE leaderboard');
    } else {
      // Challenge mode or other
      url = `/api/leaderboard?mode=${mode}`;
      console.log('🔍 Fetching leaderboard for mode:', mode);
    }
    
    try {
      const response = await fetch(url);
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
  }, [mode, currentQuizId]);

  const submitScore = useCallback(async () => {
    // Time Mode submits via /api/time/submit, not here
    if (mode === QuizMode.TIME_MODE) {
      console.log('🚫 Skipping score submission for TIME_MODE (already submitted via /api/time/submit)');
      setSubmitted(true);
      return;
    }
    
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
      totalTime,
      mode
    });

    setSubmitting(true);
    try {
      // At this point, mode can only be CLASSIC or CHALLENGE (TIME_MODE returned early)
      const modeString: 'CLASSIC' | 'TIME_MODE' | 'CHALLENGE' = 
        mode === QuizMode.CLASSIC ? 'CLASSIC' : 'CHALLENGE';

      const payload: any = {
        fid: context.user.fid,
        username: context.user.username,
        displayName: context.user.displayName,
        pfpUrl: context.user.pfpUrl,
        score: score,
        time: totalTime,
        mode: modeString,
      };

      // Only add quizId for CLASSIC mode (Weekly Quiz)
      if (mode === QuizMode.CLASSIC && currentQuizId) {
        payload.quizId = currentQuizId;
      }

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
          const fid = context.user.fid;
          if (mode === QuizMode.CLASSIC && currentQuizId && fid && typeof window !== 'undefined') {
            localStorage.setItem(`weekly_completed_${currentQuizId}_${fid}`, '1');
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
  }, [context?.user, submitted, score, totalTime, mode, currentQuizId]);

  // Fetch leaderboard on mount
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Monitor quizId changes - refresh leaderboard when new weekly quiz starts (only for CLASSIC mode)
  useEffect(() => {
    if (mode !== QuizMode.CLASSIC) return; // Only monitor for Weekly Quiz
    
    const checkQuizId = () => {
      const newQuizId = currentWeeklyQuiz.id;
      if (newQuizId !== currentQuizId) {
        console.log('🔄 New weekly quiz started! Refreshing leaderboard...', newQuizId);
        setCurrentQuizId(newQuizId);
        fetchLeaderboard(newQuizId);
      }
    };
    
    // Check every 5 seconds for quizId changes (when new quiz starts)
    const interval = setInterval(checkQuizId, 5000);
    return () => clearInterval(interval);
  }, [mode, currentQuizId, fetchLeaderboard]);

  // Auto-submit score when component mounts if user is authenticated
  useEffect(() => {
    if (context?.user?.fid && !submitted) {
      submitScore();
    }
  }, [context?.user?.fid, submitted, submitScore]);

  return (
    <div className="h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4 overflow-y-auto">
      <div className="max-w-4xl mx-auto pt-8 pb-8">
        

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">🏆 Public Leaderboard</h2>
            <p className="text-gray-600">
              {mode === QuizMode.CLASSIC 
                ? 'Weekly Quiz Challenge Participants' 
                : mode === QuizMode.TIME_MODE 
                ? 'Time Mode Participants' 
                : 'All Quiz Trivia Participants'}
            </p>
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
            <div 
              className={`space-y-3 pr-2 max-h-[50vh] overflow-y-auto leaderboard-scroll`}
              style={{ 
                scrollbarWidth: 'thin', 
                scrollbarColor: '#94a3b8 #e2e8f0'
              }}
            >
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
                        <div className="font-semibold text-black">
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
                const fid = context?.user?.fid;
                const formatScoreValue = (value: number) =>
                  Number.isInteger(value) ? `${value}` : value.toFixed(1);
                const buildShareUrl = () => {
                  const base = fid
                    ? new URL(`${APP_URL}/share/${fid}`)
                    : new URL(APP_URL);
                  base.searchParams.set("mode", modeSlug);

                  if (mode === QuizMode.TIME_MODE) {
                    base.searchParams.set("score", formatScoreValue(score));
                    if (totalQuestions > 0) {
                      base.searchParams.set("questions", totalQuestions.toString());
                    }
                    if (accuracyPercent !== null && !Number.isNaN(accuracyPercent)) {
                      base.searchParams.set("accuracy", `${accuracyPercent}%`);
                    }
                  } else {
                    base.searchParams.set(
                      "score",
                      `${formatScoreValue(score)}/${totalQuestions}`,
                    );
                    if (totalTime) {
                      base.searchParams.set("time", totalTime);
                    }
                  }

                  return base.toString();
                };

                const shareText =
                  mode === QuizMode.TIME_MODE
                    ? `⚡️ I just smashed Time Mode on ${APP_NAME} by @kushal-paliwal!\n${score} correct answers with ${accuracyPercent || 0}% accuracy — think you can beat it? 👀\nCome try it 👇`
                    : `🧠 Weekly Challenge complete on ${APP_NAME} by @kushal-paliwal!\nScored ${formatScoreValue(
                        score,
                      )}/${totalQuestions} — this one really tests your brain 🔥\nJump in and give it a go 👇`;

                try {
                  await actions.composeCast({
                    text: shareText,
                    embeds: [
                      buildShareUrl(),
                    ],
                  });
                } catch (err) {
                  console.error('Failed to open Farcaster composer:', err);
                  const text = encodeURIComponent(shareText);
                  const url = encodeURIComponent(buildShareUrl());
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
                <button key={i} onClick={() => handleAnswer(i)} className="w-full p-4 text-left rounded-lg border-2 bg-gray-50 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all text-gray-900">
                  <span className="font-semibold mr-3 text-gray-900">{String.fromCharCode(65 + i)}.</span>
                  <span className="text-gray-900">{opt}</span>
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
                <button key={i} onClick={() => onAnswer(i)} className="w-full p-4 text-left rounded-lg border-2 bg-gray-50 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all text-gray-900">
                  <span className="font-semibold mr-3 text-gray-900">{String.fromCharCode(65 + i)}.</span>
                  <span className="text-gray-900">{opt}</span>
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
  const [currentScreen, setCurrentScreen] = useState<'home' | 'results' | 'results-submit' | 'time' | 'challenge' | 'weekly-quiz' | 'bet-mode'>('home');
  const [showRules, setShowRules] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalAnswers, setFinalAnswers] = useState<Answer[]>([]);
  const [finalTime, setFinalTime] = useState<string>('0:00');
  const [balance, setBalance] = useState<number | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>(QuizMode.CLASSIC);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [betModeAction, setBetModeAction] = useState<'deposit' | 'withdraw' | null>(null);

  // Get Farcaster context
  const { context } = useMiniApp();

  // handleStartQuiz removed - Classic mode replaced by Weekly Quiz

  const handleStartTime = () => {
    setCurrentScreen('time');
  };

  const handleStartWeeklyQuiz = () => {
    setCurrentScreen('weekly-quiz');
  };

  const handleStartBetMode = () => {
    setBetModeAction(null);
    setCurrentScreen('bet-mode');
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


  return (
    <div className="w-full h-screen">
      {currentScreen === 'home' && (
        <>
          <HomePage 
            balance={balance}
            onStartTimeMode={handleStartTime}
            onStartChallenge={() => setCurrentScreen('challenge')}
            onShowRules={handleShowRules}
            onStartWeeklyQuiz={handleStartWeeklyQuiz}
            onStartBetMode={handleStartBetMode}
          />
        </>
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

      {currentScreen === 'bet-mode' && (
        <BetModeTab 
          onExit={() => {
            setBetModeAction(null);
            setCurrentScreen('home');
          }} 
          openDepositModal={betModeAction === 'deposit'}
          openWithdrawModal={betModeAction === 'withdraw'}
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
          mode={quizMode}
          totalQuestions={totalQuestions}
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