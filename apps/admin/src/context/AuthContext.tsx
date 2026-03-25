import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, clearToken } from '../lib/api';

interface AdminUser {
    token: string;
    user: { id: string; email: string; role: string };
}

interface AuthState {
    session: AdminUser | null;
    isAdmin: boolean;
    isLoading: boolean;
    error: string | null;
    email: string | null;
    login: (email: string, password: string) => Promise<void>;
    signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<AdminUser | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            setIsLoading(false);
            return;
        }

        api.me()
            .then((user) => {
                if (user.role === 'admin') {
                    setSession({ token, user });
                    setIsAdmin(true);
                    setError(null);
                } else {
                    clearToken();
                    setError('Admin access required. Your account does not have admin privileges.');
                }
            })
            .catch(() => {
                clearToken();
                setError('Session expired. Please sign in again.');
            })
            .finally(() => setIsLoading(false));
    }, []);

    async function login(email: string, password: string) {
        const data = await api.login(email, password);
        setSession(data);
        setIsAdmin(true);
        setError(null);
    }

    function signOut() {
        api.logout();
        setSession(null);
        setIsAdmin(false);
    }

    return (
        <AuthContext.Provider value={{
            session,
            isAdmin,
            isLoading,
            error,
            email: session?.user?.email ?? null,
            login,
            signOut,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
