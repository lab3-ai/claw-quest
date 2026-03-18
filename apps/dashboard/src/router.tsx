import { useEffect } from 'react'
import { createRouter, createRoute, createRootRouteWithContext, Outlet, redirect } from '@tanstack/react-router'
import type { AuthContextType } from './context/AuthContext'
import { Login } from './routes/login'
import { Register } from './routes/register'
import { AuthCallback } from './routes/auth/callback'
import { TelegramCallback } from './routes/auth/telegram-callback'
import { XCallback } from './routes/auth/x-callback'
import { PublicLayout } from './routes/_public'
import { Navbar } from './components/navbar'
import { Footer } from './components/footer'
import { ConceptsDemoButtons } from './routes/_public/concepts.demo.buttons'
import { TypographyDemo } from './routes/concepts.demo.typography'
import { BadgesDemo } from './routes/concepts.demo.badges'
import { DemoIndex } from './routes/concepts.demo.index'
import { ColorsDemo } from './routes/concepts.demo.colors'
import { TooltipsDemo } from './routes/concepts.demo.tooltips'
import { Dashboard } from './routes/_authenticated/dashboard'
import { QuestList } from './routes/_authenticated/quests/index'
import { QuestDetail } from './routes/_public/quests/detail'
import { QuestersPage } from './routes/_public/quests/questers'
import { CreateQuest } from './routes/_authenticated/quests/create'
import { ClaimQuest } from './routes/_authenticated/quests/claim'
import { FundQuest } from './routes/_authenticated/quests/$questId/fund'
import { FundSuccess } from './routes/_authenticated/quests/$questId/fund-success'
import { FundCancel } from './routes/_authenticated/quests/$questId/fund-cancel'
import { EditQuest } from './routes/_authenticated/quests/$questId/edit'
import { ManageQuest } from './routes/_authenticated/quests/$questId/manage'
import { QuestCompletePage } from './routes/_authenticated/quests/$questId/complete'
import { Account } from './routes/_authenticated/account'
import { StripeConnect } from './routes/_authenticated/stripe-connect'
import { QuestJoin } from './routes/_public/quests/join'
import { NotFoundPage } from './routes/not-found'
import { Privacy } from './routes/privacy'
import { Terms } from './routes/terms'
import { Waitlist } from './routes/waitlist'
import { CliAuth } from './routes/cli-auth'
import { AgentDetail } from './routes/_authenticated/agents/$agentId'
import { GitHubCallback } from './routes/auth/github-callback'
import { GitHubBountiesExplore } from './routes/_public/github-bounties/index'
import { GitHubBountyDetail } from './routes/_public/github-bounties/detail'
import { CreateGitHubBounty } from './routes/_authenticated/github-bounties/new'
import { MyGitHubBounties } from './routes/_authenticated/github-bounties/mine'
import { Web3SkillsPage } from './routes/_public/web3-skills/index'
import { Web3SkillDetail } from './routes/_public/web3-skills/$skillSlug'
import { SubmitWeb3Skill } from './routes/_authenticated/web3-skills/submit'
import { AdminWeb3Skills } from './routes/_authenticated/admin/web3-skills'
import { VerifyChallenge } from './routes/_public/verify'
import { HomePage } from './routes/_public/home'
import { WalletPortfolioPage } from './routes/_public/wallet/portfolio'

// Root route
interface RouterContext {
    auth: AuthContextType
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
    component: () => <Outlet />,
})

// Auth-less routes (no topbar/footer)
const devLab3Route = createRoute({
    getParentRoute: () => rootRoute,
    path: '/for-dev-lab3',
    component: function DevLab3Bypass() {
        useEffect(() => {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('cq_dev_bypass_waitlist', 'lab3')
            }
        }, [])

        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="max-w-md space-y-6 text-center">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight">Dev Lab 3 unlocked</h1>
                        <p className="text-sm text-muted-foreground">
                            Local bypass token has been stored in your browser. You can now navigate to any dashboard
                            route without being redirected back to the waitlist.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <a
                            href="/login"
                            className="inline-flex items-center justify-center rounded-md border border-border bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                        >
                            Go to Login
                        </a>
                        <a
                            href="/dashboard"
                            className="inline-flex items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground shadow-sm hover:bg-secondary/80"
                        >
                            Go to Dashboard
                        </a>
                        <a
                            href="/quests"
                            className="inline-flex items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground shadow-sm hover:bg-secondary/80"
                        >
                            View Quests
                        </a>
                    </div>
                </div>
            </div>
        )
    },
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

const xCallbackRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/auth/x/callback',
    component: XCallback,
})

const githubCallbackRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/auth/github/callback',
    component: GitHubCallback,
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

const waitlistRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/waitlist-old',
    component: Waitlist,
})

const waitlistAliasRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/waitlist',
    component: Waitlist,
})

const cliAuthRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cli-auth',
    validateSearch: (search: Record<string, unknown>): { state?: string; callback?: string } => ({
        state: typeof search.state === 'string' ? search.state : undefined,
        callback: typeof search.callback === 'string' ? search.callback : undefined,
    }),
    component: CliAuth,
})

// Single app layout (topbar + footer, handles both public & authenticated pages)
const appLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '_app',
    component: PublicLayout,
})

// indexRoute not needed — root '/' is handled by homeRoute under appLayoutRoute

// ── Public routes (no auth required) ──

const questsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests',
    validateSearch: (search: Record<string, unknown>): { tab?: string } => {
        const result: { tab?: string } = {}
        if (search.tab && typeof search.tab === 'string') result.tab = search.tab
        return result
    },
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

const questJoinRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests/$questId/join',
    validateSearch: (search: Record<string, unknown>): { token?: string } => {
        const result: { token?: string } = {}
        if (search.token) result.token = search.token as string
        return result
    },
    component: function QuestJoinPage() {
        const { questId } = questJoinRoute.useParams()
        const { token } = questJoinRoute.useSearch()
        if (!token) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-destructive text-sm">Missing invite token</p></div>
        return <QuestJoin questId={questId} token={token} />
    },
})

// Helper function to check authentication
function requireAuth(context: RouterContext) {
    // Wait for auth to finish loading
    if (context.auth?.isLoading) {
        return
    }
    // Redirect to login if not authenticated
    if (!context.auth?.isAuthenticated) {
        throw redirect({ to: '/login' })
    }
}

// ── Protected routes (auth checked in beforeLoad) ──
const dashboardRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/dashboard',
    validateSearch: (search: Record<string, unknown>): { tab?: string } => {
        const result: { tab?: string } = {}
        if (search.tab && typeof search.tab === 'string') {
            result.tab = search.tab
        }
        return result
    },
    beforeLoad: ({ context }) => {
        requireAuth(context)
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

const agentDetailRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/agents/$agentId',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: function AgentDetailPage() {
        const { agentId } = agentDetailRoute.useParams()
        return <AgentDetail agentId={agentId} />
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

const fundSuccessRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests/$questId/fund/success',
    validateSearch: (search: Record<string, unknown>): { session_id?: string } => {
        const result: { session_id?: string } = {}
        if (search.session_id) result.session_id = search.session_id as string
        return result
    },
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: FundSuccess,
})

const fundCancelRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests/$questId/fund/cancel',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: FundCancel,
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

const questCompleteRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/quests/$questId/complete',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: QuestCompletePage,
})

const accountRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/account',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: Account,
})

const stripeConnectRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/stripe-connect',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: StripeConnect,
})

// ── GitHub Bounty routes ──
const githubBountiesRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/github-bounties',
    component: GitHubBountiesExplore,
})

const githubBountyDetailRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/github-bounties/$bountyId',
    component: function GitHubBountyDetailPage() {
        const { bountyId } = githubBountyDetailRoute.useParams()
        return <GitHubBountyDetail bountyId={bountyId} />
    },
})

const createGithubBountyRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/github-bounties/new',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: CreateGitHubBounty,
})

const myGithubBountiesRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/github-bounties/mine',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: MyGitHubBounties,
})

// ── Web3 Skills routes ──
const web3SkillsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/web3-skills',
    component: Web3SkillsPage,
})

const web3SkillDetailRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/web3-skills/$skillSlug',
    component: function Web3SkillDetailPage() {
        const { skillSlug } = web3SkillDetailRoute.useParams()
        return <Web3SkillDetail skillSlug={skillSlug} />
    },
})

const submitWeb3SkillRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/web3-skills/submit',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: SubmitWeb3Skill,
})

const adminWeb3SkillsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/admin/web3-skills',
    beforeLoad: ({ context }) => {
        if (!context.auth?.isLoading && !context.auth?.isAuthenticated) throw redirect({ to: '/login' })
    },
    component: AdminWeb3Skills,
})

// ── Wallet Portfolio (public, no auth) ──
const walletPortfolioRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/wallet',
    component: WalletPortfolioPage,
})

const walletPortfolioAddressRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/wallet/$address',
    component: function WalletPortfolioAddressPage() {
        const { address } = walletPortfolioAddressRoute.useParams()
        return <WalletPortfolioPage address={address} />
    },
})

// ── Home page (root route under app layout with navbar+footer) ──
const homeRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: '/',
    component: HomePage,
})

// ── Skill Verification (public, no auth) ──
const verifyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/verify/$token',
    component: function VerifyPage() {
        const { token } = verifyRoute.useParams()
        return (
            <div className="flex min-h-screen flex-col">
                <Navbar />
                <div className="max-w-6xl mx-auto w-full py-5 px-6 flex-1">
                    <VerifyChallenge token={token} />
                </div>
                <Footer />
            </div>
        )
    },
})

const conceptsDemoButtonsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/concepts/demo/buttons',
    component: ConceptsDemoButtons,
})

const conceptsDemoTypographyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/concepts/demo/typography',
    component: TypographyDemo,
})

const conceptsdemoBadgesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/concepts/demo/badges',
    component: BadgesDemo,
})

const conceptsDemoIndexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/concepts/demo',
    component: DemoIndex,
})

const conceptsDemoColorsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/concepts/demo/colors',
    component: ColorsDemo,
})

const conceptsDemoTooltipsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/concepts/demo/tooltips',
    component: TooltipsDemo,
})

const routeTree = rootRoute.addChildren([
    conceptsDemoButtonsRoute,
    conceptsDemoTypographyRoute,
    conceptsdemoBadgesRoute,
    conceptsDemoIndexRoute,
    conceptsDemoColorsRoute,
    conceptsDemoTooltipsRoute,
    devLab3Route,
    loginRoute,
    registerRoute,
    authCallbackRoute,
    telegramCallbackRoute,
    xCallbackRoute,
    githubCallbackRoute,
    privacyRoute,
    termsRoute,
    waitlistRoute,
    waitlistAliasRoute,
    cliAuthRoute,
    appLayoutRoute.addChildren([
        homeRoute,
        questsRoute,
        claimQuestRoute,
        myQuestsRoute,
        questDetailRoute,
        fundQuestRoute,
        fundSuccessRoute,
        fundCancelRoute,
        editQuestRoute,
        manageQuestRoute,
        questCompleteRoute,
        questersRoute,
        questJoinRoute,
        dashboardRoute,
        agentListRoute,
        agentDetailRoute,
        createAgentRoute,
        createQuestRoute,
        accountRoute,
        stripeConnectRoute,
        githubBountiesRoute,
        githubBountyDetailRoute,
        createGithubBountyRoute,
        myGithubBountiesRoute,
        web3SkillsRoute,
        submitWeb3SkillRoute,
        web3SkillDetailRoute,
        adminWeb3SkillsRoute,
        walletPortfolioRoute,
        walletPortfolioAddressRoute,
    ]),
    verifyRoute,
])

export const router = createRouter({
    routeTree,
    context: {
        auth: undefined! as AuthContextType, // Passed from main.tsx
    },
    defaultNotFoundComponent: NotFoundPage,
})

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}
