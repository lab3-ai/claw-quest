import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isClaudeChatAvailable, initClaudeChat } from '../services/claude-chat.service';

describe('claude-chat.service', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
    });

    it('returns false when no API key set', () => {
        vi.stubEnv('ANTHROPIC_API_KEY', '');
        // Re-import would be needed for full isolation, but we can test the init function
        const result = initClaudeChat();
        expect(result).toBe(false);
    });

    it('returns true when API key is set', () => {
        vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-key');
        const result = initClaudeChat();
        expect(result).toBe(true);
        expect(isClaudeChatAvailable()).toBe(true);
    });
});
