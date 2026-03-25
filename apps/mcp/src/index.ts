/**
 * ClawQuest MCP Server
 * Cloudflare Workers entry point
 */

import { ClawQuestAPIClient } from './api-client.js';
import { questSearchTool, handleQuestSearch } from './tools/quest-search.js';
import { questDetailsTool, handleQuestDetails } from './tools/quest-details.js';
import { questApplyTool, handleQuestApply } from './tools/quest-apply.js';
import { questStatusTool, handleQuestStatus } from './tools/quest-status.js';
import { sponsorCreateQuestTool, handleSponsorCreateQuest } from './tools/sponsor-create-quest.js';

interface Env {
  CLAWQUEST_API_URL: string;
  CLAWQUEST_API_KEY?: string;
}

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Handle MCP protocol requests
 */
async function handleMCPRequest(request: JSONRPCRequest, env: Env): Promise<JSONRPCResponse> {
  const apiClient = new ClawQuestAPIClient({
    apiUrl: env.CLAWQUEST_API_URL || 'https://api.clawquest.ai',
    apiKey: env.CLAWQUEST_API_KEY,
  });

  try {
    switch (request.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'clawquest',
              version: '0.1.0',
            },
          },
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: [
              questSearchTool,
              questDetailsTool,
              questApplyTool,
              questStatusTool,
              sponsorCreateQuestTool,
            ],
          },
        };

      case 'tools/call': {
        const { name, arguments: args } = request.params;
        let result;

        switch (name) {
          case 'quest_search':
            result = await handleQuestSearch(args, apiClient);
            break;
          case 'quest_details':
            result = await handleQuestDetails(args, apiClient);
            break;
          case 'quest_apply':
            result = await handleQuestApply(args, apiClient);
            break;
          case 'quest_status':
            result = await handleQuestStatus(args, apiClient);
            break;
          case 'sponsor_create_quest':
            result = await handleSponsorCreateQuest(args, apiClient);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          jsonrpc: '2.0',
          id: request.id,
          result,
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`,
          },
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
    };
  }
}

/**
 * Cloudflare Workers HTTP handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers for browser/client access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (request.url.endsWith('/health')) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          server: 'clawquest-mcp',
          version: '0.1.0',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // MCP protocol endpoint
    if (request.method === 'POST') {
      try {
        const body = (await request.json()) as JSONRPCRequest;
        const response = await handleMCPRequest(body, env);

        return new Response(JSON.stringify(response), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      } catch (error) {
        console.error('MCP request error:', error);
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32700,
              message: 'Parse error',
            },
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }
    }

    // Invalid method
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  },
};
