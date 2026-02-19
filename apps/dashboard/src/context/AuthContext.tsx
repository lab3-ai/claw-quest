import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserDto } from '@clawquest/shared';

interface AuthState {
    token: string | null;
    user: UserDto | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

interface AuthContextType extends AuthState {
    login: (token: string, user: UserDto) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: true,
    });

    useEffect(() => {
        // Load from localStorage on mount
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                setState({
                    token,
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } catch (e) {
                // Invalid data
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setState((prev) => ({ ...prev, isLoading: false }));
            }
        } else {
            setState((prev) => ({ ...prev, isLoading: false }));
        }
    }, []);

    const login = (token: string, user: UserDto) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setState({
            token,
            user,
            isAuthenticated: true,
            isLoading: false,
        });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setState({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
        });
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
