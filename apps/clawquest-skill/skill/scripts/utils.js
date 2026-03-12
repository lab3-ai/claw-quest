#!/usr/bin/env node
/**
 * Utility functions for ClawQuest skill scripts
 */

import fs from 'fs';
import path from 'path';

// ─── Config ──────────────────────────────────────────────────────────────────

export function getConfigPath() {
  const home = process.env.HOME || process.env.USERPROFILE;
  return path.join(home, '.clawquest', 'credentials.json');
}

export function getStatePath() {
  const home = process.env.HOME || process.env.USERPROFILE;
  return path.join(home, '.clawquest', '.clawquest-state.json');
}

export function readConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

export function writeConfig(config) {
  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function updateConfig(updates) {
  const config = readConfig();
  Object.assign(config, updates);
  writeConfig(config);
  return config;
}

// ─── State ────────────────────────────────────────────────────────────────────

export function readState() {
  const statePath = getStatePath();
  if (!fs.existsSync(statePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return {};
  }
}

export function writeState(state) {
  const statePath = getStatePath();
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export function getState(key, defaultValue = null) {
  const state = readState();
  return state[key] !== undefined ? state[key] : defaultValue;
}

export function updateState(updates) {
  const state = readState();
  Object.assign(state, updates);
  writeState(state);
}

// ─── Environment ──────────────────────────────────────────────────────────────

export function getEnv(key, defaultValue = null) {
  if (process.env[key]) return process.env[key];
  const config = readConfig();
  return config[key] || defaultValue;
}

export function getApiBaseUrl() {
  return getEnv('CLAWQUEST_API_URL', 'https://api.clawquest.ai');
}

export function getApiKey() {
  const config = readConfig();
  return config.agentApiKey || getEnv('CLAWQUEST_API_KEY');
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Make API request to ClawQuest API
 * @param {string} endpoint - e.g. /agents/me
 * @param {Object} options - fetch options; pass noAuth: true to skip auth header
 */
export async function apiRequest(endpoint, options = {}) {
  const { noAuth, ...fetchOptions } = options;
  const url = `${getApiBaseUrl()}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (!noAuth) {
    const apiKey = getApiKey();
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, { ...fetchOptions, headers });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { text };
  }

  if (!response.ok) {
    const err = new Error(
      data?.error?.message || `API Error: ${response.status} ${response.statusText}`
    );
    err.status = response.status;
    err.data = data;
    throw err;
  }

  // ClawQuest responses: { data: {...} } or raw
  return data?.data !== undefined ? data.data : data;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export function checkApiKey(showError = true) {
  const apiKey = getApiKey();
  if (!apiKey) {
    if (showError) {
      error('Agent not registered! No API key found.');
      console.log('\nTo register, run:');
      console.log('  node scripts/register.js');
      console.log('\nOr use quick setup:');
      console.log('  node scripts/setup-check.js quick-setup https://api.clawquest.ai');
    }
    return false;
  }
  return true;
}

// ─── Logging ──────────────────────────────────────────────────────────────────

export function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

export function success(message) { log('✅', message); }
export function error(message) { log('❌', message); }
export function warning(message) { log('⚠️ ', message); }
export function info(message) { log('ℹ️ ', message); }

export function prettyJson(obj) {
  return JSON.stringify(obj, null, 2);
}
