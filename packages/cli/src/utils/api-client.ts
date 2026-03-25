import axios, { AxiosInstance } from 'axios';
import { loadCredentials, loadHumanToken } from './credentials';

export interface ApiClientOptions {
  baseURL?: string;
  apiKey?: string;
  useHumanAuth?: boolean;
}

export function createApiClient(options: ApiClientOptions = {}): AxiosInstance {
  const baseURL = options.baseURL || process.env.CLAWQUEST_API_URL || 'https://api.clawquest.ai';

  let token: string | undefined;
  if (options.apiKey) {
    token = options.apiKey;
  } else if (options.useHumanAuth) {
    token = loadHumanToken()?.token;
  } else {
    token = loadCredentials()?.agentApiKey;
  }

  const debug = process.env.CLAWQUEST_DEBUG === 'true' || process.env.CLAWQUEST_DEBUG === '1';
  if (debug) {
    console.log('[DEBUG] createApiClient: baseURL=%s useHumanAuth=%s hasToken=%s tokenLength=%s', baseURL, options.useHumanAuth, !!token, token?.length ?? 0);
    if (token) console.log('[DEBUG] Authorization header: Bearer %s...', token.slice(0, 40));
  }

  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (debug) {
    client.interceptors.request.use((config) => {
      const auth = config.headers?.Authorization;
      console.log('[DEBUG] Request: %s %s | Authorization: %s', config.method?.toUpperCase(), config.url, auth ? `Bearer ${String(auth).slice(7, 47)}...` : 'NOT SET');
      return config;
    });
  }

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        const { status, data } = error.response;
        const message = data?.message || data?.error || error.message;
        throw new Error(`API Error (${status}): ${message}`);
      }
      throw error;
    }
  );

  return client;
}
