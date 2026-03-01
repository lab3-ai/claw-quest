import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, mainnet, bsc, arbitrum, polygon } from 'wagmi/chains';

const enableTestnets = import.meta.env.VITE_ENABLE_TESTNETS !== 'false'; // default true for dev

const allChains = [base, baseSepolia, mainnet, bsc, arbitrum, polygon] as const;

const activeChains = enableTestnets
    ? allChains
    : allChains.filter(c => !c.testnet);

export const wagmiConfig = getDefaultConfig({
    appName: 'ClawQuest',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    chains: activeChains as any,
});
