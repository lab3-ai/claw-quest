# Telegram Bot API `getChatMember` Research

**Date:** 2026-03-03
**Source:** Telegram Bot API v9.5 (March 2026)

## 1. Endpoint Format

```
GET/POST https://api.telegram.org/bot{TOKEN}/getChatMember
```

**Required Parameters:**
- `chat_id` (Integer | String): Unique identifier or @username
- `user_id` (Integer): Target user ID

**Returns:** `ChatMember` object

## 2. Membership Statuses

| Status | Meaning | Counts as "Joined" |
|--------|---------|------------------|
| `creator` | Chat creator | ✓ Yes |
| `administrator` | Admin user | ✓ Yes |
| `member` | Regular member | ✓ Yes |
| `restricted` | Member with restrictions | ✓ Yes |
| `left` | User voluntarily left | ✗ No |
| `kicked` | Removed by admin | ✗ No |

**Rule:** User "joined" if status is `creator`, `administrator`, `member`, or `restricted`.

## 3. Bot Requirements

- **Must be admin** in target chat for reliable access
- Default privacy mode blocks member queries if bot is not admin
- Works in groups, supergroups, and channels
- **Chat ID formats:** `@channel_name`, numeric ID, or `-100{id}` for supergroups

## 4. Chat ID Formats

- **Private chats:** Numeric ID (positive integer)
- **Supergroups:** `-100{groupID}` (negative, starts with -100)
- **Channels:** `@channel_username` or numeric ID
- **Groups:** Numeric ID or @username

## 5. Error Cases

| Scenario | Error | Handling |
|----------|-------|----------|
| Bot not admin | 403 Forbidden | Wrap in try-catch |
| Invalid chat_id | 400 Bad Request | Validate format |
| User never in chat | 200 OK + 404 | Returns error in response |
| Bot not in chat | 403 Forbidden | Verify membership first |

**Response Format:**
```json
{
  "ok": false,
  "error_code": 403,
  "description": "Bot is not a member of the supergroup chat"
}
```

## 6. Rate Limits

- **Global:** 30 requests/sec (all endpoints combined)
- **Per-chat:** No specific getChatMember limit documented
- **Recommendation:** Implement exponential backoff for 429 responses

## 7. Privacy Mode

- **Default:** Enabled (unless bot added as admin)
- **Impact:** When enabled, bot can only see member info for itself and admins
- **Solution:** Add bot as group admin to access all member data
- **Post-v11.3:** No bulk `getChatMembers`; only `getChatMember` (singular) + `getChatAdministrators`

## Implementation Example (grammY)

```typescript
import { Bot } from "grammy";

const bot = new Bot(token);

bot.command("checkjoin", async (ctx) => {
  try {
    const member = await ctx.api.getChatMember(chatId, userId);

    const isJoined = ["creator", "administrator", "member", "restricted"]
      .includes(member.status);

    ctx.reply(`User joined: ${isJoined}`);
  } catch (err) {
    // Bot not admin or chat not found
    ctx.reply("Cannot verify membership. Bot must be admin.");
  }
});
```

## Key Takeaways

1. **Admin required:** Always promote bot to admin before using `getChatMember`
2. **Statuses:** Check if result is one of 4 "joined" statuses
3. **Channels:** Works with channels but requires admin access
4. **Error handling:** 403 = bot not admin; wrap calls in try-catch
5. **Performance:** No rate limit warnings for single user checks; safe for validation

---

**Unresolved Questions:**
- Exact rate limit for getChatMember (only global 30 RPS documented)
- Timeout behavior for restricted chats (Telegram documentation unclear)
