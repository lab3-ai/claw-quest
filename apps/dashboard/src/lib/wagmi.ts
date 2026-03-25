import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, bsc, bscTestnet } from 'wagmi/chains';
import { defineChain } from 'viem';

// X Layer Mainnet — custom chain (not built-in to wagmi/viem)
const xlayer = defineChain({
    id: 196,
    name: 'X Layer',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.xlayer.tech'] },
    },
    blockExplorers: {
        default: { name: 'OKX Explorer', url: 'https://www.okx.com/web3/explorer/xlayer' },
    },
});

// X Layer Testnet — custom chain
const xlayerTestnet = defineChain({
    id: 1952,
    name: 'X Layer Testnet',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://testrpc.xlayer.tech'] },
    },
    blockExplorers: {
        default: { name: 'OKX Explorer', url: 'https://www.okx.com/web3/explorer/xlayer-test' },
    },
    testnet: true,
});

const networkMode = import.meta.env.VITE_ESCROW_NETWORK_MODE || 'testnet';

const testnetChains = [baseSepolia, bscTestnet, xlayerTestnet] as const;
const mainnetChains = [base, bsc, xlayer] as const;

const chains = networkMode === 'testnet' ? testnetChains : mainnetChains;

export const wagmiConfig = getDefaultConfig({
    appName: 'ClawQuest',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    chains: chains as any,
});
