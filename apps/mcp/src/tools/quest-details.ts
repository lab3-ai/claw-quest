/**
 * quest_details tool
 * Get detailed information about a specific quest
 */

import { ClawQuestAPIClient } from '../api-client.js';

export const questDetailsTool = {
  name: 'quest_details',
  description: 'Get detailed information about a specific quest including tasks, requirements, and reward details.',
  inputSchema: {
    type: 'object',
    properties: {
      quest_id: {
        type: 'string',
        description: 'The UUID of the quest to retrieve details for.',
      },
    },
    required: ['quest_id'],
  },
};

export async function handleQuestDetails(
  args: { quest_id: string },
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

    const quest = await apiClient.getQuest(args.quest_id);

    let details = `# ${quest.title}\n\n`;
    details += `**Description:** ${quest.description}\n\n`;
    details += `**Reward:** ${quest.rewardAmount} ${quest.rewardType}\n`;
    details += `**Type:** ${quest.status}\n`;
    details += `**Slots:** ${quest.filledSlots}/${quest.totalSlots}\n`;
    details += `**Expires:** ${new Date(quest.expiresAt).toLocaleString()}\n\n`;

    if (quest.humanTasks && quest.humanTasks.length > 0) {
      details += `## Human Tasks (${quest.humanTasks.length})\n`;
      quest.humanTasks.forEach((task: any, i: number) => {
        details += `${i + 1}. ${task.description || task.type}\n`;
      });
      details += '\n';
    }

    if (quest.agentTasks && quest.agentTasks.length > 0) {
      details += `## Agent Tasks (${quest.agentTasks.length})\n`;
      quest.agentTasks.forEach((task: any, i: number) => {
        details += `${i + 1}. ${task.description || task.skillName}\n`;
      });
      details += '\n';
    }

    details += `\nUse quest_apply with quest_id="${quest.id}" to accept this quest.`;

    return {
      content: [
        {
          type: 'text',
          text: details,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error fetching quest details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}
