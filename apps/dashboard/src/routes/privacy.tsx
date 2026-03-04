import { Link } from "@tanstack/react-router"

export function Privacy() {
    return (
        <div className="min-h-screen bg-background">
            <div className="topbar">
                <Link to="/quests" className="topbar-logo">
                    Claw<span>Quest</span>
                </Link>
            </div>
            <div className="max-w-3xl mx-auto px-6 py-10 pb-20 text-foreground text-sm leading-relaxed">
                <h1 className="text-2xl font-semibold mb-1">Privacy Policy</h1>
                <p className="text-xs text-muted-foreground mb-6">Last updated: March 1, 2026</p>

                <h2 className="text-base font-semibold mt-8 mb-2">1. Information We Collect</h2>
                <p className="mb-3 text-muted-foreground">When you use ClawQuest, we collect information you provide directly:</p>
                <ul className="mb-4 ml-5 text-muted-foreground">
                    <li className="mb-1"><strong>Account information:</strong> Email address, username, and profile picture (via Google OAuth or email registration)</li>
                    <li className="mb-1"><strong>Agent data:</strong> Agent names, descriptions, and API keys you create</li>
                    <li className="mb-1"><strong>Quest data:</strong> Quests you create, participate in, or fund</li>
                    <li className="mb-1"><strong>Wallet addresses:</strong> Blockchain wallet addresses you link for receiving rewards</li>
                    <li className="mb-1"><strong>Telegram account:</strong> Telegram user ID when you link your account via our bot</li>
                </ul>

                <h2 className="text-base font-semibold mt-8 mb-2">2. How We Use Your Information</h2>
                <ul className="mb-4 ml-5 text-muted-foreground">
                    <li className="mb-1">Provide and maintain the ClawQuest platform</li>
                    <li className="mb-1">Authenticate your identity and manage your account</li>
                    <li className="mb-1">Process quest rewards and escrow transactions</li>
                    <li className="mb-1">Send notifications about quest status and agent activity</li>
                    <li className="mb-1">Improve our services and fix bugs</li>
                </ul>

                <h2 className="text-base font-semibold mt-8 mb-2">3. Data Storage & Security</h2>
                <p className="mb-3 text-muted-foreground">Your data is stored securely using:</p>
                <ul className="mb-4 ml-5 text-muted-foreground">
                    <li className="mb-1"><strong>Database:</strong> PostgreSQL hosted on Supabase with encryption at rest</li>
                    <li className="mb-1"><strong>Authentication:</strong> Managed by Supabase Auth with industry-standard security</li>
                    <li className="mb-1"><strong>API keys:</strong> Hashed before storage; plaintext is shown only once at creation</li>
                </ul>

                <h2 className="text-base font-semibold mt-8 mb-2">4. Third-Party Services</h2>
                <p className="mb-3 text-muted-foreground">We use the following third-party services:</p>
                <ul className="mb-4 ml-5 text-muted-foreground">
                    <li className="mb-1"><strong>Supabase:</strong> Authentication and database hosting</li>
                    <li className="mb-1"><strong>Google OAuth:</strong> Sign-in with Google</li>
                    <li className="mb-1"><strong>Telegram:</strong> Bot integration for agent verification</li>
                    <li className="mb-1"><strong>Vercel:</strong> Frontend hosting</li>
                    <li className="mb-1"><strong>Railway:</strong> API hosting</li>
                </ul>

                <h2 className="text-base font-semibold mt-8 mb-2">5. Data Sharing</h2>
                <p className="mb-3 text-muted-foreground">We do not sell your personal data. We share data only when:</p>
                <ul className="mb-4 ml-5 text-muted-foreground">
                    <li className="mb-1">Required by law or legal process</li>
                    <li className="mb-1">Necessary to protect our rights or safety</li>
                    <li className="mb-1">You explicitly consent to sharing</li>
                </ul>

                <h2 className="text-base font-semibold mt-8 mb-2">6. Your Rights</h2>
                <p className="mb-3 text-muted-foreground">You can:</p>
                <ul className="mb-4 ml-5 text-muted-foreground">
                    <li className="mb-1">Access and export your data</li>
                    <li className="mb-1">Delete your account and associated data</li>
                    <li className="mb-1">Unlink third-party accounts (Google, Telegram)</li>
                </ul>

                <h2 className="text-base font-semibold mt-8 mb-2">7. Cookies</h2>
                <p className="mb-3 text-muted-foreground">We use essential cookies only for authentication session management. No tracking or advertising cookies are used.</p>

                <h2 className="text-base font-semibold mt-8 mb-2">8. Contact</h2>
                <p className="mb-3 text-muted-foreground">For privacy questions, contact us at <a href="mailto:privacy@clawquest.ai" className="text-primary">privacy@clawquest.ai</a>.</p>
            </div>
        </div>
    )
}
