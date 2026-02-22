import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'
import { wagmiConfig } from '@/lib/wagmi'
import '@rainbow-me/rainbowkit/styles.css'

// Base styles (Tailwind + CSS variables)
import './index.css'

// ClawQuest design system (imported AFTER index.css so they override Tailwind preflight)
import './styles/topbar.css'
import './styles/footer.css'
import './styles/badges.css'
import './styles/buttons.css'
import './styles/tabs.css'
import './styles/view-toggle.css'
import './styles/page-header.css'
import './styles/quest-table.css'
import './styles/user-dropdown.css'
import './styles/login-modal.css'
import './styles/questers-avatars.css'
import './styles/questers-popup.css'
import './styles/breadcrumb.css'
import './styles/filters.css'
import './styles/pager.css'
import './styles/actor-sections.css'
import './styles/forms.css'
import './styles/status-dots.css'

import { router } from './router'
import { AuthProvider, useAuth } from '@/context/AuthContext'

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
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={lightTheme({
                    accentColor: '#f48024',
                    accentColorForeground: '#fff',
                    borderRadius: 'small',
                    fontStack: 'system',
                })}>
                    <AuthProvider>
                        <InnerApp />
                    </AuthProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    </React.StrictMode>,
)
