import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface Credentials {
  agentId?: string;
  agentApiKey?: string;
  humanToken?: string;
  humanEmail?: string;
  humanTokenExpiresAt?: number;
}

const CREDENTIALS_DIR = join(homedir(), '.clawquest');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

export function getCredentialsPath(): string {
  return CREDENTIALS_FILE;
}

function readRawCredentials(): Credentials {
  try {
    if (!existsSync(CREDENTIALS_FILE)) return {};
    const content = readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(content) as Credentials;
  } catch {
    return {};
  }
}

function writeCredentials(creds: Credentials): void {
  mkdirSync(CREDENTIALS_DIR, { recursive: true });
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), 'utf-8');
}

export function loadCredentials(): Credentials | null {
  const creds = readRawCredentials();
  if (!creds.agentId || !creds.agentApiKey) return null;
  return creds;
}

export function saveCredentials(credentials: Pick<Credentials, 'agentId' | 'agentApiKey'>): void {
  const existing = readRawCredentials();
  writeCredentials({ ...existing, ...credentials });
}

export function hasCredentials(): boolean {
  return loadCredentials() !== null;
}

export function loadHumanToken(): { token: string; email: string } | null {
  const creds = readRawCredentials();
  if (!creds.humanToken) return null;
  if (creds.humanTokenExpiresAt && Date.now() > creds.humanTokenExpiresAt) return null;
  return { token: creds.humanToken, email: creds.humanEmail ?? '' };
}

export function saveHumanToken(token: string, email: string, expiresIn?: number): void {
  const existing = readRawCredentials();
  const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined;
  writeCredentials({ ...existing, humanToken: token, humanEmail: email, humanTokenExpiresAt: expiresAt });
}

export function clearHumanToken(): void {
  const existing = readRawCredentials();
  delete existing.humanToken;
  delete existing.humanEmail;
  delete existing.humanTokenExpiresAt;
  writeCredentials(existing);
}

export function hasHumanToken(): boolean {
  return loadHumanToken() !== null;
}
