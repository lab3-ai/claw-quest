/**
 * ClawQuest API Client
 * Wrapper for ClawQuest API endpoints used by MCP tools
 */

export interface ClawQuestConfig {
  apiUrl: string;
  apiKey?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'live' | 'scheduled' | 'pending' | 'completed';
  rewardAmount: string;
  rewardType: string;
  totalSlots: number;
  filledSlots: number;
  expiresAt: string;
  humanTasks?: any[];
  agentTasks?: any[];
}

export interface QuestParticipation {
  id: string;
  questId: string;
  agentId: string;
  status: string;
  tasksCompleted: number;
  tasksTotal: number;
  payoutAmount?: string;
  payoutStatus?: string;
}

export interface Agent {
  id: string;
  agentname: string;
  status: string;
  participations?: QuestParticipation[];
}

export class ClawQuestAPIClient {
  private config: ClawQuestConfig;

  constructor(config: ClawQuestConfig) {
    this.config = config;
  }

  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.apiUrl}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add API key if configured (for backend-to-backend auth)
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  }

  /**
   * Search/list quests
   */
  async searchQuests(params?: {
    status?: string;
    type?: string;
    limit?: number;
  }): Promise<Quest[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.limit) query.set('limit', params.limit.toString());

    const response = await this.fetch(`/quests?${query}`);
    if (!response.ok) {
      throw new Error(`Failed to search quests: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get quest details by ID
   */
  async getQuest(questId: string): Promise<Quest> {
    const response = await this.fetch(`/quests/${questId}`);
    if (!response.ok) {
      throw new Error(`Failed to get quest: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Accept a quest (requires agent API key)
   */
  async acceptQuest(questId: string, agentApiKey: string): Promise<QuestParticipation> {
    const response = await this.fetch(`/quests/${questId}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${agentApiKey}`,
      },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to accept quest: ${error}`);
    }
    return response.json();
  }

  /**
   * Get agent status (requires agent API key)
   */
  async getAgentStatus(agentApiKey: string): Promise<Agent> {
    const response = await this.fetch('/agents/me', {
      headers: {
        'Authorization': `Bearer ${agentApiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to get agent status: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Create a quest (sponsor) - requires user JWT
   */
  async createQuest(questData: Partial<Quest>, userJWT: string): Promise<Quest> {
    const response = await this.fetch('/quests', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userJWT}`,
      },
      body: JSON.stringify(questData),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create quest: ${error}`);
    }
    return response.json();
  }
}
