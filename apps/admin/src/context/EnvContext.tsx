import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

export type AdminEnv = 'mainnet' | 'testnet';

const STORAGE_KEY = 'clawquest-admin-env';

interface EnvState {
    env: AdminEnv;
    setEnv: (env: AdminEnv) => void;
    testnetAvailable: boolean;
    isLoading: boolean;
}

const EnvContext = createContext<EnvState | null>(null);

function getStoredEnv(): AdminEnv {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'testnet' || stored === 'mainnet') return stored;
    return 'mainnet';
}

export function EnvProvider({ children }: { children: ReactNode }) {
    const { isAdmin } = useAuth();
    const queryClient = useQueryClient();

    const [env, setEnvState] = useState<AdminEnv>(getStoredEnv);
    const [testnetAvailable, setTestnetAvailable] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch env status from API when admin is authenticated
    useEffect(() => {
        if (!isAdmin) {
            setIsLoading(false);
            return;
        }

        api.envStatus()
            .then((status) => {
                setTestnetAvailable(status.testnetDbConfigured);
                // If testnet DB not available but user had testnet selected, reset to mainnet
                if (!status.testnetDbConfigured && getStoredEnv() === 'testnet') {
                    setEnvState('mainnet');
                    localStorage.setItem(STORAGE_KEY, 'mainnet');
                }
            })
            .catch(() => {
                setTestnetAvailable(false);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [isAdmin]);

    const setEnv = useCallback((newEnv: AdminEnv) => {
        setEnvState(newEnv);
        localStorage.setItem(STORAGE_KEY, newEnv);
        // Invalidate all queries so they refetch with the new env
        queryClient.invalidateQueries();
    }, [queryClient]);

    return (
        <EnvContext.Provider value={{ env, setEnv, testnetAvailable, isLoading }}>
            {children}
        </EnvContext.Provider>
    );
}

export function useEnv() {
    const ctx = useContext(EnvContext);
    if (!ctx) throw new Error('useEnv must be used within EnvProvider');
    return ctx;
}
