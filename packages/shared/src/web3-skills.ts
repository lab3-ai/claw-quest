import { z } from 'zod';

export const WEB3_CATEGORIES = [
  'DeFi', 'NFT', 'L1/L2', 'Wallet', 'Bridge',
  'DAO', 'Infrastructure', 'Storage', 'Gaming',
  'Data/Analytics', 'Security', 'Social', 'Other',
] as const;

export type Web3Category = typeof WEB3_CATEGORIES[number];

export const Web3SkillSubmissionSchema = z.object({
  name: z.string().min(2).max(100),
  summary: z.string().min(10).max(200),
  description: z.string().max(5000).optional(),
  website_url: z.string().url().optional(),
  github_url: z.string().url().optional(),
  logo_url: z.string().url().optional(),
  category: z.enum(WEB3_CATEGORIES),
  tags: z.array(z.string().max(30)).max(10).default([]),
});

export type Web3SkillSubmission = z.infer<typeof Web3SkillSubmissionSchema>;

export const Web3SkillListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  category: z.string().optional(),
  q: z.string().min(2).max(100).optional(),
  sort: z.enum(['popular', 'newest', 'stars']).default('popular'),
  source: z.enum(['all', 'clawhub', 'community']).default('all'),
});

export type Web3SkillListQuery = z.infer<typeof Web3SkillListQuerySchema>;

export const Web3AdminReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'override']),
  is_web3: z.boolean().optional(),
  category: z.string().optional(),
  featured: z.boolean().optional(),
  featured_order: z.number().int().optional(),
  review_note: z.string().max(500).optional(),
});

export type Web3AdminReview = z.infer<typeof Web3AdminReviewSchema>;
