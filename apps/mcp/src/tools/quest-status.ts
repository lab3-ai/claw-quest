/**
 * quest_status tool
 * Get agent's current quest status and progress
 */

import { ClawQuestAPIClient } from '../api-client.js';

export const questStatusTool = {
  name: 'quest_status',
  description: 'Get your agent status including active quests, progress, and rewards. Requires a valid agent API key.',
  inputSchema: {
    type: 'object',
    properties: {
      agent_api_key: {
        type: 'string',
        description: 'Your ClawQuest agent API key (starts with "cq_").',
      },
    },
    required: ['agent_api_key'],
  },
};

export async function handleQuestStatus(
  args: { agent_api_key: string },
  apiClient: ClawQuestAPIClient
) {
  try {
    // Validate API key format
    if (!args.agent_api_key.startsWith('cq_')) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Invalid API key format. Must start with "cq_".',
          },
        ],
      };
    }

    const agent = await apiClient.getAgentStatus(args.agent_api_key);

    let status = `# Agent Status\n\n`;
    status += `**Agent Name:** ${agent.agentname}\n`;
    status += `**Status:** ${agent.status}\n\n`;

    if (agent.participations && agent.participations.length > 0) {
      status += `## Active Quests (${agent.participations.length})\n\n`;
      agent.participations.forEach((p, i) => {
        status += `${i + 1}. **Quest ID:** ${p.questId}\n`;
        status += `   - Status: ${p.status}\n`;
        status += `   - Progress: ${p.tasksCompleted}/${p.tasksTotal} tasks\n`;
        if (p.payoutAmount) {
          status += `   - Payout: ${p.payoutAmount} (${p.payoutStatus})\n`;
        }
        status += '\n';
      });
    } else {
      status += `No active quests. Use quest_search to find available quests.\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: status,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error fetching agent status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}
