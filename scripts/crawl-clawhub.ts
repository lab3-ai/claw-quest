/**
 * Crawl public skills from ClawHub.ai and store in Supabase PostgreSQL.
 *
 * Usage:  npx tsx scripts/crawl-clawhub.ts
 *
 * Uses DATABASE_URL from apps/api/.env (direct connection, port 5432).
 */

import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

const CONVEX_URL = "https://wry-manatee-359.convex.cloud";
const PAGE_SIZE = 100;
const DELAY_MS = 500;

// ─── Load DATABASE_URL ───────────────────────────────────────────────────────

function loadDatabaseUrl(): string {
  const envFile = resolve(__dirname, "../apps/api/.env");
  try {
    const content = readFileSync(envFile, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^DATABASE_URL="([^"]+)"/);
      if (m) {
        // Switch from pgbouncer (6543) to direct (5432) and remove pgbouncer param
        return m[1]
          .replace(":6543/", ":5432/")
          .replace("?pgbouncer=true", "");
      }
    }
  } catch {}
  throw new Error("DATABASE_URL not found in apps/api/.env");
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConvexSkillItem {
  skill: {
    _id: string;
    slug: string;
    displayName: string;
    summary?: string;
    stats: {
      downloads: number;
      installsAllTime: number;
      installsCurrent: number;
      stars: number;
      comments: number;
      versions: number;
    };
    badges: Record<string, unknown>;
    tags: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
  };
  owner: {
    handle: string;
    displayName: string;
    image?: string;
  };
  ownerHandle: string;
  latestVersion: {
    _id: string;
    version: string;
    parsed?: { clawdis?: Record<string, unknown> };
  };
}

interface ConvexResponse {
  status: string;
  value: {
    page: ConvexSkillItem[];
    isDone: boolean;
    continueCursor: string;
  };
}

// ─── Fetch one page from Convex ──────────────────────────────────────────────

async function fetchPage(cursor: string | null): Promise<ConvexResponse> {
  const resp = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "skills:listPublicPageV2",
      args: {
        sort: "downloads",
        dir: "desc",
        highlightedOnly: false,
        nonSuspiciousOnly: false,
        paginationOpts: { numItems: PAGE_SIZE, cursor },
      },
      format: "json",
    }),
  });
  if (!resp.ok) throw new Error(`Convex ${resp.status}: ${await resp.text()}`);
  const data = (await resp.json()) as ConvexResponse;
  if (data.status !== "success") throw new Error(JSON.stringify(data));
  return data;
}

// ─── Upsert one page into PG ────────────────────────────────────────────────

async function upsertRows(client: pg.Client, items: ConvexSkillItem[]) {
  const values: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const item of items) {
    const { skill: s, owner: o, latestVersion: v } = item;
    const placeholders = [];
    for (const val of [
      s._id,
      s.slug,
      s.displayName,
      s.summary || null,
      s.stats.downloads,
      s.stats.installsAllTime,
      s.stats.installsCurrent,
      s.stats.stars,
      s.stats.comments,
      s.stats.versions,
      o?.handle || item.ownerHandle || null,
      o?.displayName || null,
      o?.image || null,
      v?.version || null,
      v?._id || null,
      JSON.stringify(s.badges || {}),
      JSON.stringify(s.tags || {}),
      JSON.stringify(v?.parsed?.clawdis || null),
      s.createdAt ? new Date(s.createdAt).toISOString() : null,
      s.updatedAt ? new Date(s.updatedAt).toISOString() : null,
      new Date().toISOString(),
    ]) {
      params.push(val);
      placeholders.push(`$${idx++}`);
    }
    values.push(`(${placeholders.join(",")})`);
  }

  const sql = `
    INSERT INTO clawhub_skills (
      clawhub_id, slug, display_name, summary,
      downloads, installs_all_time, installs_current, stars, comments, versions,
      owner_handle, owner_display_name, owner_image,
      latest_version, latest_version_id,
      badges, tags, parsed_clawdis,
      clawhub_created_at, clawhub_updated_at, crawled_at
    ) VALUES ${values.join(",\n")}
    ON CONFLICT (clawhub_id) DO UPDATE SET
      slug = EXCLUDED.slug,
      display_name = EXCLUDED.display_name,
      summary = EXCLUDED.summary,
      downloads = EXCLUDED.downloads,
      installs_all_time = EXCLUDED.installs_all_time,
      installs_current = EXCLUDED.installs_current,
      stars = EXCLUDED.stars,
      comments = EXCLUDED.comments,
      versions = EXCLUDED.versions,
      owner_handle = EXCLUDED.owner_handle,
      owner_display_name = EXCLUDED.owner_display_name,
      owner_image = EXCLUDED.owner_image,
      latest_version = EXCLUDED.latest_version,
      latest_version_id = EXCLUDED.latest_version_id,
      badges = EXCLUDED.badges,
      tags = EXCLUDED.tags,
      parsed_clawdis = EXCLUDED.parsed_clawdis,
      clawhub_updated_at = EXCLUDED.clawhub_updated_at,
      crawled_at = EXCLUDED.crawled_at
  `;

  await client.query(sql, params);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const dbUrl = loadDatabaseUrl();
  console.log("ClawHub Skills Crawler");
  console.log("======================");
  console.log(`DB: ...${dbUrl.slice(-40)}`);
  console.log(`Convex: ${CONVEX_URL}`);
  console.log(`Page size: ${PAGE_SIZE}\n`);

  const client = new pg.Client(dbUrl);
  await client.connect();
  console.log("Connected to PostgreSQL");

  // Check table
  const { rows } = await client.query(
    "SELECT COUNT(*) as cnt FROM clawhub_skills"
  );
  console.log(`Existing rows: ${rows[0].cnt}\n`);

  let cursor: string | null = null;
  let total = 0;
  let page = 0;
  const t0 = Date.now();

  while (true) {
    page++;
    const pt = Date.now();

    let data: ConvexResponse;
    try {
      data = await fetchPage(cursor);
    } catch (err: any) {
      console.error(`Page ${page} error: ${err.message}`);
      await sleep(3000);
      try {
        data = await fetchPage(cursor);
      } catch (e: any) {
        console.error(`Page ${page} retry failed: ${e.message}`);
        break;
      }
    }

    const items = data!.value.page;
    if (!items.length) break;

    await upsertRows(client, items);
    total += items.length;

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `Page ${page}: +${items.length} (total: ${total}) [${Date.now() - pt}ms, ${elapsed}s]`
    );

    if (data!.value.isDone) {
      console.log("All pages done!");
      break;
    }

    cursor = data!.value.continueCursor;
    await sleep(DELAY_MS);
  }

  // Final count
  const { rows: finalRows } = await client.query(
    "SELECT COUNT(*) as cnt FROM clawhub_skills"
  );
  console.log(`\nDone! Crawled ${total} skills in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`DB total: ${finalRows[0].cnt}`);

  await client.end();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
