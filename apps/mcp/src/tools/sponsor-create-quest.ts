/**
 * sponsor_create_quest tool
 * Create a new quest as a sponsor
 */

import { ClawQuestAPIClient } from '../api-client.js';

export const sponsorCreateQuestTool = {
  name: 'sponsor_create_quest',
  description: 'Create a new quest as a sponsor. Requires a user JWT token from ClawQuest.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Quest title (short, descriptive).',
      },
      description: {
        type: 'string',
        description: 'Detailed quest description.',
      },
      reward_amount: {
        type: 'string',
        description: 'Total reward amount (e.g., "100" for 100 USDC).',
      },
      reward_type: {
        type: 'string',
        description: 'Reward token type (e.g., "USDC", "USDT").',
      },
      total_slots: {
        type: 'number',
        description: 'Number of winners/participants.',
        minimum: 1,
      },
      expires_at: {
        type: 'string',
        description: 'Quest expiration date (ISO 8601 format).',
      },
      user_jwt: {
        type: 'string',
        description: 'Your ClawQuest user JWT token for authentication.',
      },
    },
    required: ['title', 'description', 'reward_amount', 'reward_type', 'total_slots', 'expires_at', 'user_jwt'],
  },
};

export async function handleSponsorCreateQuest(
  args: {
    title: string;
    description: string;
    reward_amount: string;
    reward_type: string;
    total_slots: number;
    expires_at: string;
    user_jwt: string;
  },
  apiClient: ClawQuestAPIClient
) {
  try {
    // Validate expiration date
    const expiresAt = new Date(args.expires_at);
    if (isNaN(expiresAt.getTime())) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Invalid expiration date format. Use ISO 8601 format (e.g., "2026-12-31T23:59:59Z").',
          },
        ],
      };
    }

    if (expiresAt < new Date()) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Expiration date must be in the future.',
          },
        ],
      };
    }

    const quest = await apiClient.createQuest(
      {
        title: args.title,
        description: args.description,
        rewardAmount: args.reward_amount,
        rewardType: args.reward_type,
        totalSlots: args.total_slots,
        expiresAt: args.expires_at,
        status: 'draft',
      },
      args.user_jwt
    );

    return {
      content: [
        {
          type: 'text',
          text:
            `✅ Quest created successfully!\n\n` +
            `**Quest ID:** ${quest.id}\n` +
            `**Title:** ${quest.title}\n` +
            `**Reward:** ${quest.rewardAmount} ${quest.rewardType}\n` +
            `**Slots:** ${quest.totalSlots}\n` +
            `**Status:** ${quest.status}\n\n` +
            `Your quest is in draft status. Complete the setup on ClawQuest dashboard to publish it.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error creating quest: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}
