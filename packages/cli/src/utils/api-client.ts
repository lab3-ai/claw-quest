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

  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

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
