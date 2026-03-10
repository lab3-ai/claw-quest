import type { PrismaClient } from '@prisma/client';

const TIMEOUT_MS = 10_000;

interface LlmKeyResult {
  issued: number;
  failed: number;
}

/** Call on-claw-llm-server to create one API key. Returns sk-xxx or null on failure. */
async function createLlmApiKey(name: string, maxTokenUsage?: number): Promise<string | null> {
  const baseUrl = process.env.LLM_SERVER_URL;
  const secretKey = process.env.LLM_SERVER_SECRET_KEY;

  if (!baseUrl || !secretKey) {
    console.warn('[llm-reward] LLM_SERVER_URL or LLM_SERVER_SECRET_KEY not configured. Skipping.');
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/api/v1/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret_key: secretKey, name, max_token_usage: maxTokenUsage }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      console.error(`[llm-reward] Failed to create key for "${name}": ${res.status} ${text}`);
      return null;
    }

    const data = (await res.json()) as { api_key: string };
    return data.api_key;
  } catch (err: unknown) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[llm-reward] Error creating key for "${name}": ${msg}`);
    return null;
  }
}

/**
 * Issue on-claw-llm-server API keys to all eligible winners of a quest.
 * Eligible = status in [completed, submitted, verified] and llmRewardApiKey not yet set.
 * Never throws — failures are logged and counted.
 */
export async function issueLlmKeysForQuest(
  prisma: PrismaClient,
  questId: string,
): Promise<LlmKeyResult> {
  const quest = await prisma.quest.findUnique({
    where: { id: questId },
    select: { llmKeyRewardEnabled: true, title: true, llmKeyTokenLimit: true },
  });

  if (!quest?.llmKeyRewardEnabled) {
    return { issued: 0, failed: 0 };
  }

  const participations = await prisma.questParticipation.findMany({
    where: {
      questId,
      status: { in: ['completed', 'submitted', 'verified'] },
      llmRewardApiKey: null, // skip already issued
    },
    select: { id: true, agentId: true, userId: true },
  });

  let issued = 0;
  let failed = 0;

  for (const p of participations) {
    const label = `quest-${questId.slice(0, 8)}-${p.id.slice(0, 8)}`;
    const apiKey = await createLlmApiKey(label, quest.llmKeyTokenLimit ?? 1000000);

    if (!apiKey) {
      failed++;
      continue;
    }

    await prisma.questParticipation.update({
      where: { id: p.id },
      data: { llmRewardApiKey: apiKey, llmRewardIssuedAt: new Date() },
    });
    issued++;
  }

  console.log(`[llm-reward] Quest ${questId}: issued=${issued} failed=${failed}`);
  return { issued, failed };
}
