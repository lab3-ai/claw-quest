/** Web3 keyword classification job — auto-detects web3 skills from ClawHub data. */

import type { FastifyInstance } from 'fastify';
import type { JsonValue } from '@prisma/client/runtime/library';
import {
  UNAMBIGUOUS_KEYWORDS, MODERATE_KEYWORDS, CONTEXT_WORDS,
  NEGATIVE_PATTERNS, CATEGORY_RULES,
} from './web3-categories';

interface ClassifyResult {
  isWeb3: boolean;
  category: string | null;
}

// Pre-compile word-boundary regexes for moderate keywords
const MODERATE_REGEXES = MODERATE_KEYWORDS.map(kw => ({
  keyword: kw,
  regex: new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
}));

/** Classify a single skill by scanning its text fields for web3 keywords. */
export function classifySkill(skill: {
  slug: string;
  display_name: string;
  summary: string | null;
  tags: JsonValue;
}): ClassifyResult {
  const searchText = [
    skill.slug,
    skill.display_name,
    skill.summary ?? '',
    JSON.stringify(skill.tags),
  ].join(' ').toLowerCase();

  // Early exit: negative patterns suppress classification
  if (NEGATIVE_PATTERNS.some(np => searchText.includes(np))) {
    return { isWeb3: false, category: null };
  }

  // Tier 1: Any unambiguous keyword → instant match
  const hasUnambiguous = UNAMBIGUOUS_KEYWORDS.some(kw => searchText.includes(kw));
  if (hasUnambiguous) {
    const category = CATEGORY_RULES.find(rule =>
      rule.keywords.some(kw => searchText.includes(kw))
    )?.category ?? 'Other';
    return { isWeb3: true, category };
  }

  // Tier 2: Moderate keywords with word-boundary matching
  const moderateMatches = MODERATE_REGEXES.filter(m => m.regex.test(searchText));
  if (moderateMatches.length === 0) return { isWeb3: false, category: null };

  // Require context: either a context word present, or 2+ moderate keywords
  const hasContext = CONTEXT_WORDS.some(cw => searchText.includes(cw));
  if (!hasContext && moderateMatches.length < 2) return { isWeb3: false, category: null };

  const category = CATEGORY_RULES.find(rule =>
    rule.keywords.some(kw => searchText.includes(kw))
  )?.category ?? 'Other';
  return { isWeb3: true, category };
}

/** Classify a single skill by ID and update the DB. Called after sync inserts. */
export async function classifySingleSkill(server: FastifyInstance, skillId: string): Promise<void> {
  const skill = await server.prisma.clawhub_skills.findUnique({
    where: { id: skillId },
    select: { slug: true, display_name: true, summary: true, tags: true },
  });
  if (!skill) return;

  const { isWeb3, category } = classifySkill(skill);

  await server.prisma.clawhub_skills.update({
    where: { id: skillId },
    data: {
      web3_auto_detected: isWeb3,
      web3_category: category,
      is_web3: isWeb3,
    },
  });
}

/** Classify all unclassified skills. Idempotent — safe to run multiple times. */
export async function classifyAllUnclassified(server: FastifyInstance): Promise<number> {
  const skills = await server.prisma.clawhub_skills.findMany({
    where: { web3_auto_detected: false, web3_admin_override: null },
    select: { id: true, slug: true, display_name: true, summary: true, tags: true },
  });

  let classified = 0;
  for (const skill of skills) {
    const { isWeb3, category } = classifySkill(skill);
    if (isWeb3) {
      await server.prisma.clawhub_skills.update({
        where: { id: skill.id },
        data: { web3_auto_detected: true, web3_category: category, is_web3: true },
      });
      classified++;
    }
  }

  server.log.info(`[web3-classify] Classified ${classified} web3 skills out of ${skills.length} total`);
  return classified;
}
