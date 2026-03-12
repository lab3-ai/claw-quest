/** Web3 skill classification constants and keyword lists. */

export const WEB3_CATEGORIES = [
  'DeFi', 'NFT', 'L1/L2', 'Wallet', 'Bridge',
  'DAO', 'Infrastructure', 'Storage', 'Gaming',
  'Data/Analytics', 'Security', 'Social', 'Other',
] as const;

export const WEB3_KEYWORDS = [
  // Blockchain ecosystems
  'web3', 'blockchain', 'crypto', 'defi', 'nft', 'dao',
  'solana', 'ethereum', 'eth', 'sol', 'polygon', 'arbitrum',
  'optimism', 'avalanche', 'avax', 'cosmos', 'near', 'aptos',
  'sui', 'base-chain', 'bnb', 'bsc', 'ton', 'tron',
  // Protocols & concepts
  'swap', 'dex', 'amm', 'liquidity', 'staking', 'yield',
  'bridge', 'cross-chain', 'crosschain', 'multichain',
  'erc20', 'erc721', 'erc1155', 'spl-token',
  'wallet', 'metamask', 'phantom', 'ledger',
  'smart-contract', 'smartcontract', 'solidity', 'anchor', 'foundry',
  'onchain', 'on-chain',
  'ipfs', 'arweave', 'filecoin',
  'oracle', 'chainlink', 'pyth',
  'lending', 'borrowing', 'aave', 'compound',
  'uniswap', 'raydium', 'jupiter', 'orca',
  'opensea', 'magic-eden', 'tensor',
  'governance', 'multisig', 'gnosis',
  'nonce', 'gas-fee', 'wei', 'gwei',
];

// "token" is ambiguous — only match if NOT in these contexts
export const TOKEN_FALSE_POSITIVES = [
  'auth token', 'jwt token', 'api token', 'access token',
  'bearer token', 'refresh token', 'session token', 'csrf token',
];

// Category detection rules — first match wins
export const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  { category: 'DeFi', keywords: ['defi', 'swap', 'dex', 'amm', 'lending', 'borrowing', 'yield', 'staking', 'liquidity', 'aave', 'compound', 'uniswap', 'raydium', 'jupiter', 'orca'] },
  { category: 'NFT', keywords: ['nft', 'erc721', 'erc1155', 'opensea', 'magic-eden', 'tensor'] },
  { category: 'Bridge', keywords: ['bridge', 'cross-chain', 'crosschain', 'multichain'] },
  { category: 'Wallet', keywords: ['wallet', 'metamask', 'phantom', 'ledger'] },
  { category: 'DAO', keywords: ['dao', 'governance', 'multisig', 'gnosis'] },
  { category: 'Infrastructure', keywords: ['oracle', 'chainlink', 'pyth', 'solidity', 'foundry', 'anchor', 'smart-contract', 'smartcontract'] },
  { category: 'Storage', keywords: ['ipfs', 'arweave', 'filecoin'] },
  { category: 'L1/L2', keywords: ['solana', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'sui', 'aptos', 'near', 'cosmos', 'ton', 'tron', 'bnb', 'bsc'] },
  { category: 'Data/Analytics', keywords: ['analytics', 'explorer', 'onchain-data', 'dune'] },
  { category: 'Security', keywords: ['audit', 'security', 'vulnerability', 'exploit'] },
  { category: 'Gaming', keywords: ['gamefi', 'play-to-earn', 'metaverse'] },
  { category: 'Social', keywords: ['social', 'identity', 'reputation', 'lens', 'farcaster'] },
];
