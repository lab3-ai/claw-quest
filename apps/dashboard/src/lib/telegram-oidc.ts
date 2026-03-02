const TELEGRAM_AUTH_URL = 'https://oauth.telegram.org/auth';
const DEFAULT_SCOPE = 'openid profile telegram:bot_access';

function getClientId(): string {
    const id = import.meta.env.VITE_TELEGRAM_CLIENT_ID;
    if (!id) throw new Error('VITE_TELEGRAM_CLIENT_ID not configured');
    return id;
}

function getRedirectUri(): string {
    return `${window.location.origin}/auth/telegram/callback`;
}

/** Generate cryptographically random string */
function randomString(length: number): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

/** Generate PKCE code verifier + S256 challenge */
async function generatePkce(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = randomString(64);
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    // base64url encode
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    return { codeVerifier, codeChallenge };
}

/** Build Telegram OIDC authorization URL */
function buildTelegramAuthUrl(params: {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
}): string {
    const url = new URL(TELEGRAM_AUTH_URL);
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', DEFAULT_SCOPE);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', params.state);
    return url.toString();
}

/**
 * Initiate Telegram OIDC login flow.
 * Generates PKCE + state, stores in sessionStorage, redirects to Telegram.
 *
 * @param flow - "login" for new login, "link" for linking to existing account
 */
export async function startTelegramLogin(flow: 'login' | 'link' = 'login'): Promise<void> {
    const clientId = getClientId();
    const redirectUri = getRedirectUri();
    const state = randomString(32);
    const { codeVerifier, codeChallenge } = await generatePkce();

    // Store in sessionStorage for callback verification
    sessionStorage.setItem('tg_code_verifier', codeVerifier);
    sessionStorage.setItem('tg_state', state);
    sessionStorage.setItem('tg_flow', flow);

    const authUrl = buildTelegramAuthUrl({ clientId, redirectUri, codeChallenge, state });
    window.location.href = authUrl;
}

/** Retrieve and clear stored OIDC params from sessionStorage */
export function consumeOidcParams(): {
    codeVerifier: string;
    state: string;
    flow: 'login' | 'link';
} | null {
    const codeVerifier = sessionStorage.getItem('tg_code_verifier');
    const state = sessionStorage.getItem('tg_state');
    const flow = (sessionStorage.getItem('tg_flow') ?? 'login') as 'login' | 'link';

    // Clean up regardless
    sessionStorage.removeItem('tg_code_verifier');
    sessionStorage.removeItem('tg_state');
    sessionStorage.removeItem('tg_flow');

    if (!codeVerifier || !state) return null;
    return { codeVerifier, state, flow };
}
