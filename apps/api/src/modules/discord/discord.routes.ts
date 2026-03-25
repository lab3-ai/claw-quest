/**
 * Discord API routes — guild info, roles, bot invite URL.
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getGuildInfo, fetchGuildRoles, getBotInviteUrl, isDiscordConfigured } from './discord.service'

export async function discordRoutes(server: FastifyInstance) {

  /** GET /discord/guild-info — resolve invite + check bot presence */
  server.get(
    '/guild-info',
    {
      schema: {
        tags: ['Discord'],
        summary: 'Resolve Discord invite and check bot presence',
        querystring: z.object({ inviteCode: z.string().min(1) }),
      },
    },
    async (request, reply) => {
      if (!isDiscordConfigured()) {
        return reply.status(503).send({ error: { message: 'Discord integration not configured', code: 'DISCORD_NOT_CONFIGURED' } })
      }

      const { inviteCode } = request.query as { inviteCode: string }
      const info = await getGuildInfo(inviteCode)

      if (!info) {
        return reply.status(400).send({ error: { message: 'Invalid or expired Discord invite', code: 'INVALID_INVITE' } })
      }

      return { data: info }
    },
  )

  /** GET /discord/guild-roles — fetch roles (requires auth, bot must be in server) */
  server.get(
    '/guild-roles',
    {
      schema: {
        tags: ['Discord'],
        summary: 'Fetch guild roles (bot must be in server)',
        querystring: z.object({ guildId: z.string().regex(/^\d{17,20}$/, 'Invalid guild ID') }),
      },
      preHandler: [server.authenticate],
    },
    async (request, reply) => {
      if (!isDiscordConfigured()) {
        return reply.status(503).send({ error: { message: 'Discord integration not configured', code: 'DISCORD_NOT_CONFIGURED' } })
      }

      const { guildId } = request.query as { guildId: string }
      const roles = await fetchGuildRoles(guildId)

      if (!roles) {
        return reply.status(403).send({ error: { message: 'Bot is not in this server. Invite the bot first.', code: 'BOT_NOT_IN_GUILD' } })
      }

      return { data: { roles } }
    },
  )

  /** GET /discord/bot-invite-url — construct bot OAuth2 invite URL */
  server.get(
    '/bot-invite-url',
    {
      schema: {
        tags: ['Discord'],
        summary: 'Get bot invite URL',
        querystring: z.object({ guildId: z.string().optional() }),
      },
    },
    async (request, reply) => {
      const clientId = process.env.DISCORD_CLIENT_ID
      if (!clientId) {
        return reply.status(503).send({ error: { message: 'Discord integration not configured', code: 'DISCORD_NOT_CONFIGURED' } })
      }

      const { guildId } = request.query as { guildId?: string }
      const url = getBotInviteUrl(guildId)

      return { data: { url } }
    },
  )
}
