import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router'
import { Login } from './routes/login'
import { Register } from './routes/register'
import { AuthenticatedLayout } from './routes/_authenticated'
import { PublicLayout } from './routes/_public'
import { AgentList } from './routes/_authenticated/index'
import { CreateAgent } from './routes/_authenticated/agents/new'
import { QuestList } from './routes/_authenticated/quests/index'
import { QuestDetail } from './routes/_public/quests/detail'
import { QuestersPage } from './routes/_public/quests/questers'
import { CreateQuest } from './routes/_authenticated/quests/create'

// Root route
const rootRoute = createRootRoute({
    component: () => <Outlet />,
})

// Public routes (no auth required)
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

// Public layout (topbar with Log in button)
const publicLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '_public',
    component: PublicLayout,
})

const questsRoute = createRoute({
    getParentRoute: () => publicLayoutRoute,
    path: '/quests',
    component: QuestList,
})

const questDetailRoute = createRoute({
    getParentRoute: () => publicLayoutRoute,
    path: '/quests/$questId',
    component: QuestDetail,
})

const questersRoute = createRoute({
    getParentRoute: () => publicLayoutRoute,
    path: '/quests/$questId/questers',
    component: QuestersPage,
})

// Authenticated layout
const authLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '_authenticated',
    component: AuthenticatedLayout,
})

// Protected routes
const indexRoute = createRoute({
    getParentRoute: () => authLayoutRoute,
    path: '/',
    component: AgentList,
})

const createAgentRoute = createRoute({
    getParentRoute: () => authLayoutRoute,
    path: '/agents/new',
    component: CreateAgent,
})

const createQuestRoute = createRoute({
    getParentRoute: () => authLayoutRoute,
    path: '/quests/new',
    component: CreateQuest,
})

const routeTree = rootRoute.addChildren([
    loginRoute,
    registerRoute,
    publicLayoutRoute.addChildren([questsRoute, questDetailRoute, questersRoute]),
    authLayoutRoute.addChildren([indexRoute, createAgentRoute, createQuestRoute]),
])

export const router = createRouter({
    routeTree,
    context: {
        auth: undefined! // This will be passed from main.tsx
    }
})

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}
