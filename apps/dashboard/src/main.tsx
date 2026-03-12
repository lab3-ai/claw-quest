import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { wagmiConfig } from '@/lib/wagmi'
import '@rainbow-me/rainbowkit/styles.css'

// Base styles (Tailwind + CSS variables) + theme overrides
import './index.css'
import './styles/themes/index.css'

import { router } from './router'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,      // 1 min — don't refetch if fresh
            gcTime: 5 * 60_000,     // 5 min — keep in cache after unmount
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
})

function InnerApp() {
    const auth = useAuth()
    return <RouterProvider router={router} context={{ auth }} />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HelmetProvider>
            <WagmiProvider config={wagmiConfig}>
                <QueryClientProvider client={queryClient}>
                    <RainbowKitProvider theme={lightTheme({
                        accentColor: '#f48024',
                        accentColorForeground: '#fff',
                        borderRadius: 'small',
                        fontStack: 'system',
                    })}>
                        <ThemeProvider>
                            <TooltipProvider delayDuration={300}>
                                <AuthProvider>
                                    <InnerApp />
                                    <Toaster richColors />
                                </AuthProvider>
                            </TooltipProvider>
                        </ThemeProvider>
                    </RainbowKitProvider>
                </QueryClientProvider>
            </WagmiProvider>
        </HelmetProvider>
    </React.StrictMode>,
)
