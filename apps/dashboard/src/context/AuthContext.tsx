import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
    session: Session | null
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
}

interface AuthContextType extends AuthState {
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: true,
    })

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setState({
                session,
                user: session?.user ?? null,
                isAuthenticated: !!session,
                isLoading: false,
            })
        })

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setState({
                session,
                user: session?.user ?? null,
                isAuthenticated: !!session,
                isLoading: false,
            })
        })

        return () => subscription.unsubscribe()
    }, [])

    const logout = async () => {
        await supabase.auth.signOut()
    }

    return (
        <AuthContext.Provider value={{ ...state, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
