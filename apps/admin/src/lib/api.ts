const API_URL = import.meta.env.VITE_API_URL;
const LLM_SERVER_URL = import.meta.env.VITE_LLM_SERVER_URL;
const LLM_ADMIN_KEY = import.meta.env.VITE_LLM_ADMIN_KEY;
const TOKEN_KEY = 'clawquest-admin-token';

// ─── Env helper ──────────────────────────────────────────────────────────────
function getAdminEnv(): string {
    return localStorage.getItem('clawquest-admin-env') || 'mainnet';
}

// ─── Token helpers ────────────────────────────────────────────────────────────
export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

// ─── Core fetch ──────────────────────────────────────────────────────────────
async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    // Auto-inject env param for /admin/* paths
    let url = `${API_URL}${path}`;
    if (path.startsWith('/admin/')) {
        const separator = path.includes('?') ? '&' : '?';
        url = `${API_URL}${path}${separator}env=${getAdminEnv()}`;
    }

    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options?.headers,
        },
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(err.message || `HTTP ${res.status}`);
    }

    return res.json();
}

function qs(params: Record<string, any>): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
    return new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ─── Typed API ───────────────────────────────────────────────────────────────

export const api = {
    // Auth
    login: async (email: string, password: string): Promise<{ token: string; user: { id: string; email: string; role: string } }> => {
        const res = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Login failed' }));
            throw new Error(err.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        saveToken(data.token);
        return data;
    },

    logout: (): void => {
        clearToken();
    },

    me: () => adminFetch<{ id: string; email: string; role: string }>('/auth/me'),

    // Env status (admin)
    envStatus: () => adminFetch<{ testnetDbConfigured: boolean; currentDefault: string }>('/admin/env-status'),

    // Quests
    getQuests: (params: Record<string, any> = {}) =>
        adminFetch<{ data: any[]; pagination: Pagination }>(`/admin/quests?${qs(params)}`),
    getQuest: (id: string) => adminFetch<any>(`/admin/quests/${id}`),
    getQuestParticipations: (id: string, params: Record<string, any> = {}) =>
        adminFetch<{ data: any[]; pagination: Pagination }>(`/admin/quests/${id}/participations?${qs(params)}`),
    updateQuest: (id: string, data: any) =>
        adminFetch<any>(`/admin/quests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteQuest: (id: string) =>
        adminFetch<{ message: string }>(`/admin/quests/${id}`, { method: 'DELETE' }),
    forceStatus: (id: string, data: { status: string; reason: string }) =>
        adminFetch<any>(`/admin/quests/${id}/force-status`, { method: 'POST', body: JSON.stringify(data) }),

    // Users
    getUsers: (params: Record<string, any> = {}) =>
        adminFetch<{ data: any[]; pagination: Pagination }>(`/admin/users?${qs(params)}`),
    getUser: (id: string) => adminFetch<any>(`/admin/users/${id}`),
    getUserAgents: (id: string, params: Record<string, any> = {}) =>
        adminFetch<{ data: any[]; pagination: Pagination }>(`/admin/users/${id}/agents?${qs(params)}`),
    getUserQuests: (id: string, params: Record<string, any> = {}) =>
        adminFetch<{ data: any[]; pagination: Pagination }>(`/admin/users/${id}/quests?${qs(params)}`),
    updateUser: (id: string, data: { role?: string; username?: string; password?: string }) =>
        adminFetch<any>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    // Escrow
    escrowOverview: () => adminFetch<any>('/admin/escrow/overview'),
    escrowQuests: (params: Record<string, any> = {}) =>
        adminFetch<{ data: any[]; pagination: Pagination }>(`/admin/escrow/quests?${qs(params)}`),
    escrowDistribute: (questId: string, chainId?: number) =>
        adminFetch<{ message: string; txHash: string }>(`/escrow/distribute/${questId}`, {
            method: 'POST', body: JSON.stringify({ chainId }),
        }),
    escrowRefund: (questId: string, chainId?: number) =>
        adminFetch<{ message: string; txHash: string }>(`/escrow/refund/${questId}`, {
            method: 'POST', body: JSON.stringify({ chainId }),
        }),
    escrowHealth: () => adminFetch<{
        configured: boolean;
        defaultChainId: number;
        poller: { running: boolean; lastPollAt: string | null; lastError: string | null; eventsProcessed: number };
    }>('/escrow/health'),
    txStatus: (txHash: string, chainId?: number) =>
        adminFetch<{ txHash: string; status: 'pending' | 'confirmed' | 'failed'; blockNumber?: number; gasUsed?: string }>(
            `/escrow/tx-status/${txHash}${chainId ? `?chainId=${chainId}` : ''}`
        ),

    // Analytics
    analyticsOverview: () => adminFetch<any>('/admin/analytics/overview'),
    timeseries: (params: Record<string, any>) =>
        adminFetch<any>(`/admin/analytics/timeseries?${qs(params)}`),

    // LLM Models (admin) — API returns { data: array }
    getLlmModels: async (): Promise<any[]> => {
        const res = await adminFetch<{ data?: any[] }>(`/admin/llm-models`);
        return Array.isArray(res?.data) ? res.data : [];
    },
    createLlmModel: (data: any) =>
        adminFetch<any>(`/admin/llm-models`, { method: `POST`, body: JSON.stringify(data) }),
    updateLlmModel: (id: string, data: any) =>
        adminFetch<any>(`/admin/llm-models/${id}`, { method: `PATCH`, body: JSON.stringify(data) }),
    deleteLlmModel: (id: string) =>
        adminFetch<{ message: string }>(`/admin/llm-models/${id}`, { method: `DELETE` }),

    // Skills (admin)
    getSkills: (params: Record<string, any> = {}) =>
        adminFetch<{ items: SkillSummary[]; total: number }>(`/admin/skills?${qs(params)}`),
    getSkill: (slug: string) =>
        adminFetch<{ skill: SkillDetail }>(`/admin/skills/${slug}`),
    upsertSkill: (data: UpsertSkillInput) =>
        adminFetch<{ skill: SkillDetail }>(`/admin/skills`, { method: 'POST', body: JSON.stringify(data) }),
    updateVerificationConfig: (slug: string, verification_config: Record<string, unknown>) =>
        adminFetch<{ skill: SkillDetail }>(`/admin/skills/${slug}/verification-config`, {
            method: 'PATCH',
            body: JSON.stringify({ verification_config }),
        }),

    // LLM Server - Upstream URLs (admin)
    llmGetUpstreams: async (): Promise<{ upstreams: LlmUpstream[] }> => {
        const res = await fetch(`${LLM_SERVER_URL}/api/v1/admin/upstream-urls`, {
            headers: { 'X-Admin-Secret-Key': LLM_ADMIN_KEY },
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return res.json();
    },
    llmCreateUpstream: async (data: {
        base_url: string;
        api_key: string;
        model_name?: string;
        name?: string;
        priority?: number;
    }): Promise<{ upstream: LlmUpstream }> => {
        const res = await fetch(`${LLM_SERVER_URL}/api/v1/admin/upstream-urls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Secret-Key': LLM_ADMIN_KEY },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return res.json();
    },
    llmDeleteUpstream: async (id: number): Promise<{ success: boolean }> => {
        const res = await fetch(`${LLM_SERVER_URL}/api/v1/admin/upstream-urls/${id}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Secret-Key': LLM_ADMIN_KEY },
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return res.json();
    },
};

export interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export interface SkillSummary {
    id: string;
    slug: string;
    display_name: string;
    summary: string | null;
    downloads: number;
    stars: number;
    featured: boolean;
    is_web3: boolean;
    verification_config: Record<string, unknown> | null;
    crawled_at: string;
}

export interface SkillDetail extends SkillSummary {
    clawhub_id: string;
    owner_handle: string | null;
    owner_display_name: string | null;
    tags: Record<string, string>;
    latest_version: string | null;
    web3_category: string | null;
    featured_order: number | null;
}

export interface UpsertSkillInput {
    slug: string;
    display_name: string;
    summary?: string;
    owner_handle?: string;
    owner_display_name?: string;
    tags?: Record<string, string>;
    verification_config?: Record<string, unknown>;
    featured?: boolean;
    featured_order?: number;
    is_web3?: boolean;
}

export interface LlmUpstream {
    id: number;
    base_url: string;
    api_key: string;
    model_name: string | null;
    name: string | null;
    priority: number;
    created_at: string;
}
