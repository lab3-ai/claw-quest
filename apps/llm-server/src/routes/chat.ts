import { Hono } from "hono";
import type { Env, ApiKey } from "../types";
import { requireApiKey } from "../middleware/auth";
import {
  getActiveUpstreams,
  updateUpstreamStats,
  incrementTokenUsage,
} from "../db/queries";

const chat = new Hono<{ Bindings: Env; Variables: { apiKey: ApiKey } }>();

/**
 * POST /v1/chat/completions
 * OpenAI-compatible chat completions endpoint.
 * Proxies the request to the highest-priority active upstream with failover.
 */
chat.post("/v1/chat/completions", requireApiKey, async (c) => {
  const apiKey = c.var.apiKey;
  const body = await c.req.json<{
    model?: string;
    stream?: boolean;
    [key: string]: unknown;
  }>();

  // Check token usage limit
  const { getTokenUsage } = await import("../db/queries");
  const usage = await getTokenUsage(c.env.DB, apiKey.id);
  const totalUsed = (usage?.tokens_in ?? 0) + (usage?.tokens_out ?? 0);
  if (totalUsed >= apiKey.max_token_usage) {
    return c.json(
      {
        error: {
          message: "Token usage limit exceeded",
          type: "rate_limit_error",
        },
      },
      429,
    );
  }

  // Get upstream candidates (priority order, with fallback to env vars)
  const upstreams = await getActiveUpstreams(c.env.DB);
  const candidates =
    upstreams.length > 0
      ? upstreams.map((u) => ({
          id: u.id,
          base_url: u.base_url,
          api_key: u.api_key,
          model: u.model_name,
        }))
      : c.env.UPSTREAM_BASE_URL
        ? [
            {
              id: null,
              base_url: c.env.UPSTREAM_BASE_URL,
              api_key: c.env.UPSTREAM_API_KEY,
              model: c.env.DEFAULT_MODEL ?? null,
            },
          ]
        : [];

  if (candidates.length === 0) {
    return c.json(
      {
        error: { message: "No upstream LLM configured", type: "server_error" },
      },
      503,
    );
  }

  const isStream = body.stream === true;
  const model = body.model ?? candidates[0].model ?? "gpt-4o";
  const requestBody = { ...body, model };

  // Try each upstream with failover
  for (const upstream of candidates) {
    try {
      const upstreamRes = await fetch(
        `${upstream.base_url}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${upstream.api_key}`,
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!upstreamRes.ok) {
        if (upstream.id)
          await updateUpstreamStats(c.env.DB, upstream.id, false);
        continue;
      }

      if (upstream.id) await updateUpstreamStats(c.env.DB, upstream.id, true);

      // Track tokens asynchronously from response (best-effort for streaming)
      if (!isStream) {
        const json = await upstreamRes.json<{
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        }>();
        const tokensIn = json.usage?.prompt_tokens ?? 0;
        const tokensOut = json.usage?.completion_tokens ?? 0;
        await incrementTokenUsage(
          c.env.DB,
          apiKey.id,
          tokensIn,
          tokensOut,
          "/v1/chat/completions",
          model,
        );
        return c.json(json);
      }

      // Streaming: pipe response body directly
      await incrementTokenUsage(
        c.env.DB,
        apiKey.id,
        0,
        0,
        "/v1/chat/completions",
        model,
      );
      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Transfer-Encoding": "chunked",
        },
      });
    } catch {
      if (upstream.id) await updateUpstreamStats(c.env.DB, upstream.id, false);
    }
  }

  return c.json(
    {
      error: { message: "All upstream providers failed", type: "server_error" },
    },
    503,
  );
});

export default chat;
