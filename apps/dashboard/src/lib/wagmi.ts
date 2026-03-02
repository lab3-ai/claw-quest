import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, bsc, bscTestnet } from 'wagmi/chains';

const networkMode = import.meta.env.VITE_ESCROW_NETWORK_MODE || 'testnet';

const testnetChains = [baseSepolia, bscTestnet] as const;
const mainnetChains = [base, bsc] as const;

const chains = networkMode === 'testnet' ? testnetChains : mainnetChains;

export const wagmiConfig = getDefaultConfig({
    appName: 'ClawQuest',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    chains: chains as any,
});
