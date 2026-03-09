const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
const TIMEOUT_MS = 10000;

export interface CreateApiKeyParams {
  name: string;
  limit: number; // USD spending limit
  expiresAt: string; // ISO-8601 date
}

export interface ApiKeyResponse {
  id: string;
  key: string;
  name: string;
  limit: number | null;
  limit_reset: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ApiKeyListResponse {
  keys: ApiKeyResponse[];
}

export class OpenRouterService {
  private managementKey: string;

  constructor(managementKey?: string) {
    this.managementKey = managementKey || process.env.OPENROUTER_MANAGEMENT_KEY || '';

    if (!this.managementKey) {
      console.warn('[OpenRouter] OPENROUTER_MANAGEMENT_KEY not set. API calls will fail.');
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Creates a new API key with spending limit and expiry
   */
  async createApiKey(params: CreateApiKeyParams): Promise<ApiKeyResponse> {
    try {
      const response = await this.fetchWithTimeout(`${OPENROUTER_API_URL}/keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.managementKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: params.name,
          limit: params.limit,
          limit_reset: null, // No automatic reset for one-time rewards
          expires_at: params.expiresAt,
          include_byok_in_limit: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[OpenRouter] Failed to create API key:', {
          status: response.status,
          data: errorData,
          name: params.name,
        });
        throw new Error(
          `OpenRouter API error: ${response.status} - ${errorData}`
        );
      }

      const data = await response.json() as ApiKeyResponse;
      console.log(`[OpenRouter] Created API key: ${params.name} (ID: ${data.id})`);
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('OpenRouter API request timeout');
      }
      throw error;
    }
  }

  /**
   * Revokes an API key by ID
   */
  async revokeApiKey(keyId: string): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(
        `${OPENROUTER_API_URL}/keys/${keyId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.managementKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[OpenRouter] Failed to revoke API key:', {
          status: response.status,
          data: errorData,
          keyId,
        });
        throw new Error(
          `OpenRouter API error: ${response.status} - ${errorData}`
        );
      }

      console.log(`[OpenRouter] Revoked API key: ${keyId}`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('OpenRouter API request timeout');
      }
      throw error;
    }
  }

  /**
   * Lists all API keys (with optional filtering)
   */
  async listKeys(): Promise<ApiKeyResponse[]> {
    try {
      const response = await this.fetchWithTimeout(`${OPENROUTER_API_URL}/keys`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.managementKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[OpenRouter] Failed to list API keys:', {
          status: response.status,
          data: errorData,
        });
        throw new Error(
          `OpenRouter API error: ${response.status} - ${errorData}`
        );
      }

      const data = await response.json() as ApiKeyListResponse;
      return data.keys;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('OpenRouter API request timeout');
      }
      throw error;
    }
  }
}

// Singleton instance
export const openRouterService = new OpenRouterService();
