import { createRouter, createRoute, createRootRoute, redirect, Outlet } from '@tanstack/react-router';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { QuestList } from './pages/quests/QuestList';
import { QuestDetail } from './pages/quests/QuestDetail';
import { UserList } from './pages/users/UserList';
import { UserDetail } from './pages/users/UserDetail';
import { EscrowOverview } from './pages/escrow/EscrowOverview';
import { Analytics } from './pages/analytics/Analytics';
import { LlmKeys } from './pages/llm-keys/LlmKeys';
import { LlmModels } from './pages/llm-models/LlmModels';
import { SkillList } from './pages/skills/SkillList';
import { SkillNew } from './pages/skills/SkillNew';
import { SkillDetail } from './pages/skills/SkillDetail';
import { getToken } from './lib/api';

// ─── Root ────────────────────────────────────────────────────────────────────
const rootRoute = createRootRoute({
    component: Outlet,
});

// ─── Login (public) ──────────────────────────────────────────────────────────
const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: Login,
    beforeLoad: () => {
        if (getToken()) throw redirect({ to: '/' });
    },
});

// ─── Authenticated layout ────────────────────────────────────────────────────
const authLayout = createRoute({
    getParentRoute: () => rootRoute,
    id: 'auth',
    component: AppLayout,
    beforeLoad: () => {
        if (!getToken()) throw redirect({ to: '/login' });
    },
});

// ─── Pages ───────────────────────────────────────────────────────────────────
const overviewRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/',
    component: Overview,
});

const questListRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/quests',
    component: QuestList,
});

const questDetailRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/quests/$questId',
    component: QuestDetail,
});

const userListRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/users',
    component: UserList,
});

const userDetailRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/users/$userId',
    component: UserDetail,
});

const escrowRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/escrow',
    component: EscrowOverview,
});

const analyticsRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/analytics',
    component: Analytics,
});

const llmModelsRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/llm-models',
    component: LlmModels,
});

const llmKeysRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/llm-keys',
    component: LlmKeys,
});

const skillListRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/skills',
    component: SkillList,
});

const skillNewRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/skills/new',
    component: SkillNew,
});

const skillDetailRoute = createRoute({
    getParentRoute: () => authLayout,
    path: '/skills/$slug',
    component: SkillDetail,
});

// ─── Tree ────────────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
    loginRoute,
    authLayout.addChildren([
        overviewRoute,
        questListRoute,
        questDetailRoute,
        userListRoute,
        userDetailRoute,
        escrowRoute,
        analyticsRoute,
        llmKeysRoute,
        llmModelsRoute,
        skillListRoute,
        skillNewRoute,
        skillDetailRoute,
    ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
