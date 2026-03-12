/** Web3 skill classification constants and keyword lists. */

export const WEB3_CATEGORIES = [
  'DeFi', 'NFT', 'L1/L2', 'Wallet', 'Bridge',
  'DAO', 'Infrastructure', 'Storage', 'Gaming',
  'Data/Analytics', 'Security', 'Social', 'Other',
] as const;

// ─── Tier 1: Unambiguous — simple includes(), instant match ──────────────────
// These are unique to web3 — no false positives expected.
export const UNAMBIGUOUS_KEYWORDS = [
  'web3', 'blockchain', 'defi',
  'solana', 'ethereum', 'polygon', 'arbitrum', 'optimism',
  'avalanche', 'aptos', 'sui',
  'cross-chain', 'crosschain', 'multichain', 'onchain', 'on-chain',
  'erc20', 'erc721', 'erc1155', 'spl-token',
  'metamask', 'phantom', 'smart-contract', 'smartcontract', 'solidity',
  'ipfs', 'arweave', 'filecoin', 'chainlink',
  'aave', 'uniswap', 'raydium', 'jupiter-swap',
  'opensea', 'magic-eden', 'gnosis', 'farcaster',
  'gwei', 'gas-fee', 'foundry-rs',
];

// ─── Tier 2: Moderate — require word-boundary + context confirmation ─────────
// Match only with \b word boundaries, AND require BOTH:
//   (a) a strong context word present in text, AND
//   (b) the moderate keyword itself
// OR: 2+ moderate keywords matched together (still with word boundaries)
export const MODERATE_KEYWORDS = [
  'nft', 'dao', 'dex', 'staking', 'liquidity',
  'multisig', 'nonce',
];

// Strong context words — must be clearly web3-related, not generic
export const CONTEXT_WORDS = [
  'blockchain', 'web3', 'defi', 'onchain', 'on-chain',
  'mainnet', 'testnet', 'dapp', 'smart contract',
  'solidity', 'ethereum', 'solana', 'evm',
  'decentralized',
];

// ─── Negative patterns: skip these even if keywords match ────────────────────
// Prevents matching tools that mention crypto/token incidentally
export const NEGATIVE_PATTERNS = [
  'token usage', 'token cost', 'token limit', 'token count',
  'token optim', 'token sav', 'token budget', 'token track',
  'reduce token', 'save token', 'context token',
  'llm token', 'ai token', 'api token', 'auth token',
  'jwt token', 'access token', 'bearer token', 'refresh token',
  'session token', 'csrf token',
  'stock analysis', 'stock market', 'stock price',
];

// Category detection rules — first match wins
export const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  { category: 'DeFi', keywords: ['defi', 'dex', 'lending', 'borrowing', 'yield', 'staking', 'liquidity', 'aave', 'uniswap', 'raydium', 'jupiter-swap'] },
  { category: 'NFT', keywords: ['nft', 'erc721', 'erc1155', 'opensea', 'magic-eden'] },
  { category: 'Bridge', keywords: ['cross-chain', 'crosschain', 'multichain'] },
  { category: 'Wallet', keywords: ['metamask', 'phantom'] },
  { category: 'DAO', keywords: ['dao', 'multisig', 'gnosis'] },
  { category: 'Infrastructure', keywords: ['chainlink', 'solidity', 'foundry-rs', 'smart-contract', 'smartcontract'] },
  { category: 'Storage', keywords: ['ipfs', 'arweave', 'filecoin'] },
  { category: 'L1/L2', keywords: ['solana', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'sui', 'aptos'] },
  { category: 'Data/Analytics', keywords: ['onchain-data', 'dune'] },
  { category: 'Security', keywords: ['audit', 'exploit'] },
  { category: 'Gaming', keywords: ['gamefi', 'play-to-earn'] },
  { category: 'Social', keywords: ['farcaster'] },
];
