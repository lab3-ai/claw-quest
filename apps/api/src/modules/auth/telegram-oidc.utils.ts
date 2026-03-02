import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const TELEGRAM_ISSUER = 'https://oauth.telegram.org';
const TELEGRAM_JWKS_URL = 'https://oauth.telegram.org/.well-known/jwks.json';
const TELEGRAM_TOKEN_URL = 'https://oauth.telegram.org/token';

// Remote JWKS set — jose handles caching + rotation automatically
const jwks = createRemoteJWKSet(new URL(TELEGRAM_JWKS_URL));

export interface TelegramClaims {
    telegramId: string;
    name: string;
    username?: string;
    picture?: string;
}

/**
 * Verify Telegram OIDC id_token signature + claims.
 * Returns decoded payload with Telegram user info.
 */
export async function verifyTelegramIdToken(idToken: string): Promise<TelegramClaims> {
    const botId = process.env.TELEGRAM_CLIENT_ID;
    if (!botId) throw new Error('TELEGRAM_CLIENT_ID not configured');

    const { payload } = await jwtVerify(idToken, jwks, {
        issuer: TELEGRAM_ISSUER,
        audience: botId,
    });

    const p = payload as JWTPayload & {
        sub?: string;
        name?: string;
        preferred_username?: string;
        picture?: string;
    };

    if (!p.sub) throw new Error('Missing sub claim in Telegram ID token');

    return {
        telegramId: p.sub,
        name: p.name ?? '',
        username: p.preferred_username,
        picture: p.picture,
    };
}

/**
 * Exchange authorization code for tokens via Telegram OIDC token endpoint.
 */
export async function exchangeTelegramCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
}): Promise<{ id_token: string; access_token: string }> {
    const clientId = process.env.TELEGRAM_CLIENT_ID;
    const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('TELEGRAM_CLIENT_ID and TELEGRAM_CLIENT_SECRET must be configured');
    }

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: params.redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: params.codeVerifier,
    });

    const res = await fetch(TELEGRAM_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Telegram token exchange failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    if (!data.id_token) {
        throw new Error('No id_token in Telegram token response');
    }

    return { id_token: data.id_token, access_token: data.access_token ?? '' };
}
