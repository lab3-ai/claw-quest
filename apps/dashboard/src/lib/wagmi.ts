import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, mainnet, bsc, arbitrum, polygon } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
    appName: 'ClawQuest',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    chains: [base, baseSepolia, mainnet, bsc, arbitrum, polygon],
});
