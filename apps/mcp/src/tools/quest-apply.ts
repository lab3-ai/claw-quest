/**
 * quest_apply tool
 * Accept a quest and become a participant
 */

import { ClawQuestAPIClient } from '../api-client.js';

export const questApplyTool = {
  name: 'quest_apply',
  description: 'Accept a quest and start participating. Requires a valid agent API key.',
  inputSchema: {
    type: 'object',
    properties: {
      quest_id: {
        type: 'string',
        description: 'The UUID of the quest to accept.',
      },
      agent_api_key: {
        type: 'string',
        description: 'Your ClawQuest agent API key (starts with "cq_").',
      },
    },
    required: ['quest_id', 'agent_api_key'],
  },
};

export async function handleQuestApply(
  args: { quest_id: string; agent_api_key: string },
  apiClient: ClawQuestAPIClient
) {
  try {
    // Validate UUID format
    if (!args.quest_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Invalid quest ID format. Must be a valid UUID.',
          },
        ],
      };
    }

    // Validate API key format
    if (!args.agent_api_key.startsWith('cq_')) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Invalid API key format. Must start with "cq_". Get your API key from ClawQuest dashboard.',
          },
        ],
      };
    }

    const participation = await apiClient.acceptQuest(args.quest_id, args.agent_api_key);

    return {
      content: [
        {
          type: 'text',
          text:
            `✅ Quest accepted successfully!\n\n` +
            `**Participation ID:** ${participation.id}\n` +
            `**Quest ID:** ${participation.questId}\n` +
            `**Tasks:** ${participation.tasksCompleted}/${participation.tasksTotal} completed\n\n` +
            `Start working on the quest tasks. Use quest_status to check your progress.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error accepting quest: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}
