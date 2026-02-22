import { createRouter, createRoute, createRootRouteWithContext, Outlet, redirect } from '@tanstack/react-router'
import type { AuthContextType } from './context/AuthContext'
import { Login } from './routes/login'
import { Register } from './routes/register'
import { AuthCallback } from './routes/auth/callback'
import { PublicLayout } from './routes/_public'
import { AgentList } from './routes/_authenticated/index'
import { Dashboard } from './routes/_authenticated/dashboard'
import { CreateAgent } from './routes/_authenticated/agents/new'
import { QuestList } from './routes/_authenticated/quests/index'
import { QuestDetail } from './routes/_public/quests/detail'
import { QuestersPage } from './routes/_public/quests/questers'
import { CreateQuest } from './routes/_authenticated/quests/create'
import { VerifyAgent } from './routes/_authenticated/verify'
import { ClaimQuest } from './routes/_authenticated/quests/claim'
import { MyQuests } from './routes/_authenticated/quests/mine'

// Root route
interface RouterContext {
    auth: AuthContextType
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
    component: () => <Outlet />,
})

// Auth-less routes (no topbar/footer)
const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: Login,
})

const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/register',
    component: Register,
})

const authCallbackRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/auth/callback',
    component: AuthCallback,
})

// Single app layout (topbar + footer, handles both public & authenticated pages)
const appLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '_app',
    component: PublicLayout,
})

// Redirect root to /quests
const indexRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/',
    beforeLoad: () => {
        throw redirect({ to: '/quests' })
    },
})

// ── Public routes (no auth required) ──
const questsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests',
    component: QuestList,
})

const questDetailRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests/$questId',
    validateSearch: (search: Record<string, unknown>): { token?: string; claim?: string } => {
        const result: { token?: string; claim?: string } = {}
        if (search.token) result.token = search.token as string
        if (search.claim) result.claim = search.claim as string
        return result
    },
    component: QuestDetail,
})

const questersRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests/$questId/questers',
    component: QuestersPage,
})

// ── Protected routes (auth checked in beforeLoad) ──
const dashboardRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/dashboard',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: Dashboard,
})

const agentListRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/agents',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: AgentList,
})

const createAgentRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/agents/new',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: CreateAgent,
})

const createQuestRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests/new',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: CreateQuest,
})

const verifyRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/verify',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: VerifyAgent,
})

const claimQuestRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests/claim',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: ClaimQuest,
})

const myQuestsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests/mine',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: MyQuests,
})

const routeTree = rootRoute.addChildren([
    loginRoute,
    registerRoute,
    authCallbackRoute,
    appLayoutRoute.addChildren([
        indexRoute,
        questsRoute,
        claimQuestRoute,
        myQuestsRoute,
        questDetailRoute,
        questersRoute,
        dashboardRoute,
        agentListRoute,
        createAgentRoute,
        createQuestRoute,
        verifyRoute,
    ]),
])

export const router = createRouter({
    routeTree,
    context: {
        auth: undefined! as AuthContextType, // Passed from main.tsx
    }
})

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}
