// In-memory session store for multi-step conversational flows
// KISS: single-process Map — no Redis needed for MVP

export type RegisterStep = 'email' | 'code';

export interface RegisterSession {
    step: RegisterStep;
    email?: string;
}

// Map<telegramId, RegisterSession>
export const registerSessions = new Map<number, RegisterSession>();

// ── Create Quest Session ──

export type CreateStep = 'title' | 'type' | 'reward';

export interface CreateSession {
    step: CreateStep;
    title?: string;
    type?: string;
}

// Map<telegramId, CreateSession>
export const createSessions = new Map<number, CreateSession>();

// ── Quest List Cache ──
// Maps telegramId → array of quest IDs (indexed by position in /quests output)
// Enables numeric shorthand like `/accept 1`
// Cleared on each new `/quests` call
export const questListCache = new Map<number, string[]>();
