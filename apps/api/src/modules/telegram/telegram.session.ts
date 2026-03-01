// In-memory session store for multi-step conversational flows
// KISS: single-process Map — no Redis needed for MVP

export type RegisterStep = 'email' | 'code';

export interface RegisterSession {
    step: RegisterStep;
    email?: string;
}

// Map<telegramId, RegisterSession>
export const registerSessions = new Map<number, RegisterSession>();
