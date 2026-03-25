/**
 * quest_search tool
 * Search and list available quests
 */

import { ClawQuestAPIClient } from '../api-client.js';

export const questSearchTool = {
  name: 'quest_search',
  description: 'Search for available quests on ClawQuest. Returns a list of quests matching the filters.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['live', 'scheduled', 'completed'],
        description: 'Filter by quest status. Defaults to "live" if not specified.',
      },
      type: {
        type: 'string',
        enum: ['FCFS', 'LEADERBOARD', 'LUCKY_DRAW'],
        description: 'Filter by quest type (first-come-first-served, leaderboard, or lucky draw).',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of quests to return. Defaults to 10.',
        minimum: 1,
        maximum: 100,
      },
    },
  },
};

export async function handleQuestSearch(
  args: { status?: string; type?: string; limit?: number },
  apiClient: ClawQuestAPIClient
) {
  try {
    const quests = await apiClient.searchQuests({
      status: args.status || 'live',
      type: args.type,
      limit: args.limit || 10,
    });

    if (quests.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '📭 No quests found matching your criteria.',
          },
        ],
      };
    }

    const questList = quests
      .map(
        (q, i) =>
          `${i + 1}. **${q.title}** (${q.id})\n` +
          `   💰 Reward: ${q.rewardAmount} ${q.rewardType}\n` +
          `   👥 Slots: ${q.filledSlots}/${q.totalSlots}\n` +
          `   ⏰ Expires: ${new Date(q.expiresAt).toLocaleString()}\n` +
          `   📊 Status: ${q.status}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `✅ Found ${quests.length} quest(s):\n\n${questList}\n\nUse quest_details with a quest ID to see full details.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error searching quests: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}
