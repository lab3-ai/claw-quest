import { createRouter, createRoute, createRootRouteWithContext, Outlet, redirect } from '@tanstack/react-router'
import type { AuthContextType } from './context/AuthContext'
import { Login } from './routes/login'
import { Register } from './routes/register'
import { AuthCallback } from './routes/auth/callback'
import { TelegramCallback } from './routes/auth/telegram-callback'
import { PublicLayout } from './routes/_public'
import { Dashboard } from './routes/_authenticated/dashboard'
import { QuestList } from './routes/_authenticated/quests/index'
import { QuestDetail } from './routes/_public/quests/detail'
import { QuestersPage } from './routes/_public/quests/questers'
import { CreateQuest } from './routes/_authenticated/quests/create'
import { VerifyAgent } from './routes/_authenticated/verify'
import { ClaimQuest } from './routes/_authenticated/quests/claim'
import { FundQuest } from './routes/_authenticated/quests/$questId/fund'
import { EditQuest } from './routes/_authenticated/quests/$questId/edit'
import { ManageQuest } from './routes/_authenticated/quests/$questId/manage'
import { Account } from './routes/_authenticated/account'
import { Privacy } from './routes/privacy'
import { Terms } from './routes/terms'

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

const telegramCallbackRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/auth/telegram/callback',
    component: TelegramCallback,
})

const privacyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/privacy',
    component: Privacy,
})

const termsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/terms',
    component: Terms,
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
    beforeLoad: () => {
        throw redirect({ to: '/dashboard' })
    },
})

const createAgentRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/agents/new',
    beforeLoad: () => {
        throw redirect({ to: '/dashboard' })
    },
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
    beforeLoad: () => {
        throw redirect({ to: '/dashboard' })
    },
})

const fundQuestRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests/$questId/fund',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: FundQuest,
})

const editQuestRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests/$questId/edit',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: EditQuest,
})

const manageQuestRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests/$questId/manage',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: ManageQuest,
})

const accountRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/account',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: Account,
})

const routeTree = rootRoute.addChildren([
    loginRoute,
    registerRoute,
    authCallbackRoute,
    telegramCallbackRoute,
    privacyRoute,
    termsRoute,
    appLayoutRoute.addChildren([
        indexRoute,
        questsRoute,
        claimQuestRoute,
        myQuestsRoute,
        questDetailRoute,
        fundQuestRoute,
        editQuestRoute,
        manageQuestRoute,
        questersRoute,
        dashboardRoute,
        agentListRoute,
        createAgentRoute,
        createQuestRoute,
        verifyRoute,
        accountRoute,
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
