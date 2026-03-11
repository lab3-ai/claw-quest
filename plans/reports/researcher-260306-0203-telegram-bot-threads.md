# Telegram Bot Topics/Threads Research Report

**Date:** 2026-03-06
**Status:** Complete research on feasibility for per-quest conversational flows

---

## Executive Summary

Telegram's forum topics (threads) feature **can technically work in private chats**, but with significant constraints. While **private chats WITH FORUM TOPICS ENABLED** can support per-thread message routing, the feature is:

- **Opt-in complexity** — requires BotFather setup + user/bot both having topics enabled
- **Limited context isolation** — each topic gets its own `message_thread_id`, but bot system prompt is global (not per-thread)
- **Group-centric design** — feature was built primarily for supergroups; private chat support is secondary
- **Operationally fragile** — one wrong `message_thread_id` parameter value causes "message thread not found" error

**Verdict:** Feasible but operationally complex. **Mini Apps are the stronger alternative** for quest creation UX (embedded web form vs conversational flow).

---

## 1. What Are Telegram Threads/Topics for Bots?

### Official Definition

Per [Telegram Blog - Comments in Video Chats, Threads for Bots](https://telegram.org/blog/comments-in-video-chats-threads-for-bots):

> "Bots now support **threaded conversations** to manage several different topics in parallel. This is especially useful for **AI chatbots** and lets users easily access information from previous discussion topics."

### How They Work

Threads enable:
- **Parallel conversations** — multiple topics active simultaneously in one chat
- **Context isolation** — replies to a message stay in that thread, don't pollute main chat
- **AI chatbot optimization** — manage multiple user intents/tasks in one bot session

### Architecture

- **Thread ID** = unique identifier per topic within a chat (`message_thread_id` field)
- **General topic** (always exists, ID=1) — main chat flow
- **Custom topics** — created by bots or users, each has name + icon

---

## 2. Private Chat Support — YES, WITH CAVEATS

### The Key Discovery

Telegram **DOES support forum topics in private 1-on-1 DM chats**, but:

1. **Must be enabled explicitly** — not default, both bot and user must opt-in
2. **Requires BotFather configuration** — via `/setdomainwhitelist` and Threaded Mode toggle
3. **User has field `has_topics_enabled`** — bot can check if private chat supports topics

### Private Chat Requirements

Per [Telegram Bot API - Message & ForumTopic documentation](https://core.telegram.org/bots/api):

- `message_thread_id` field is supported in **private chats only when forum topic mode is enabled**
- User object contains `has_topics_enabled` (boolean) to indicate capability
- Message object contains `is_topic_message` to indicate message sent to a topic

### Constraints

**Critical limitation:** In regular private DMs (without topics enabled), sending `message_thread_id` causes:
```
Error 400: Bad Request - message thread not found
```

This is a hard API constraint — the bot must **check chat type and topic capability** before including `message_thread_id`.

---

## 3. Bot API Methods for Topic Management

### Creating Topics: `createForumTopic`

**Signature:**
```
POST /createForumTopic
```

**Parameters:**
| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `chat_id` | Integer or String | Yes | Chat identifier |
| `name` | String | Yes | Topic name (1-128 chars) |
| `icon_color` | Integer | No | RGB color code (see color table below) |
| `icon_custom_emoji_id` | String | No | Custom emoji for icon |

**Allowed Icon Colors:**
- `7322096` (0x6FB9F0) — Blue
- `16766590` (0xFFD67E) — Yellow
- `13338331` (0xCB86DB) — Purple
- `9367192` (0x8EEE98) — Green
- `16749490` (0xFF93B2) — Pink
- `16478047` (0xFB6F5F) — Orange

**Returns:** `ForumTopic` object with:
- `message_thread_id` (integer)
- `name` (string)
- `icon_color` (integer)
- `icon_custom_emoji_id` (string, optional)

### Editing Topics: `editForumTopic`

Update name, color, or custom emoji of existing topic.

### Deleting Topics: `deleteForumTopic`

Remove a topic permanently.

### Sending to Topics: `sendMessage` + `message_thread_id`

**Key method parameters:**
```
POST /sendMessage
{
  "chat_id": 12345,
  "text": "Hello in a thread",
  "message_thread_id": 789  // Target the topic
}
```

Supported in these methods:
- `sendMessage`
- `sendPhoto`, `sendVideo`, `sendAnimation`, `sendAudio`, `sendDocument`
- `sendSticker`, `sendVideoNote`, `sendVoice`
- `sendLocation`, `sendVenue`, `sendContact`
- `sendPoll`, `sendDice`
- `copyMessage`, `forwardMessage` (with reply_parameters)
- `sendChatAction` (typing indicator in topic)

---

## 4. grammY Framework Support

### Access via Context

**Message metadata:**
```typescript
bot.on("message", async (ctx) => {
  const threadId = ctx.msg.message_thread_id;  // Undefined if not in topic
  const isTopicMessage = ctx.msg.is_topic_message;

  // Check if user chat has topics enabled
  const hasTopics = ctx.from?.has_topics_enabled;
});
```

### Sending to Topics

**Via `ctx.api.sendMessage()` with options:**
```typescript
await ctx.api.sendMessage(chatId, "Message in topic", {
  message_thread_id: topicId
});
```

**Via context shorthand:**
```typescript
await ctx.reply("Response in same topic", {
  message_thread_id: ctx.msg.message_thread_id
});
```

**Problem:** grammY doesn't auto-propagate `message_thread_id` in replies — **you must explicitly pass it** every time.

### Routing by Thread

**No built-in middleware** for per-thread routing. You'd need to implement:
```typescript
bot.on("message", async (ctx) => {
  const threadId = ctx.msg.message_thread_id || 1;  // Default to General

  // Route to different handler per thread
  if (threadId === topicForQuest1) {
    await handleQuestFlow1(ctx);
  } else if (threadId === topicForQuest2) {
    await handleQuestFlow2(ctx);
  }
});
```

---

## 5. Setting Up Private Chat Topics via BotFather

### Configuration Steps

1. **Open @BotFather** on Telegram
2. **Select your bot** via `/mybots` → choose bot name
3. **Enable Threaded Mode:**
   - Command: `/setdomainwhitelist`
   - Or: Use BotFather's Mini App UI under "Bot Features" → toggle "Threaded Mode"

### Important Notes

- **Fee applies** — per [Telegram Bot Developer Terms of Service §6.2.6](https://telegram.org/blog/comments-in-video-chats-threads-for-bots):
  > "This feature is subject to an additional fee for Telegram Star purchases"
- **User opt-in** — even after bot enables it, user must enable topics in their private chat settings
- **Legacy support** — existing bots must migrate to thread support; it's not retroactive

---

## 6. Real-World Implementation: OpenClaw Reference

### How OpenClaw Uses Threads

OpenClaw (an AI assistant framework) implements sophisticated thread routing:

**Session isolation by thread:**
```
Session key format: thread:<chatId>:<topicId>
```

Each thread gets:
- Isolated session memory
- Per-thread configuration (can override group settings)
- Optional per-thread agent routing (different AI agent per topic)

### Key Implementation Details

From [OpenClaw Telegram Documentation](https://docs.openclaw.ai/channels/telegram):

1. **Topic config structure:**
   ```yaml
   channels:
     telegram:
       groups:
         <chatId>:
           topics:
             <topicId>:
               agentId: "agent-name"
               systemPrompt: "Custom prompt for this topic"
               skills: [...]
   ```

2. **Session inheritance:** Topics inherit group defaults unless explicitly overridden

3. **Critical bug workaround:** Never send `message_thread_id=1` (General topic):
   - Telegram rejects it with "message thread not found"
   - Solution: Omit `message_thread_id` for General topic, include for custom topics

4. **Typing indicators:** Still include `message_thread_id` for `sendChatAction` even in General

### Limitations OpenClaw Encountered

From [GitHub Issue #12929](https://github.com/openclaw/openclaw/issues/12929) and [#11620](https://github.com/openclaw/openclaw/issues/11620):

- **Regular private DMs don't support threads** — must explicitly enable topics
- **Session divergence bug** — topics created with different prefixes (just topic ID vs `<chatId>:<topicId>`) caused duplicate sessions
- **Thread ID validation critical** — must whitelist thread IDs to prevent 400 errors

---

## 7. Feasibility for ClawQuest Quest Creation

### Proposed Flow (Threads Approach)

```
User: /start or "Create quest"
Bot: "Enable threaded mode?" (instructions to BotFather)
Bot: createForumTopic(name="Quest: My First Quest", icon_color=BLUE)
Bot: "Thread created! Ask questions about your quest here..."
User: "What's a good reward?"
Bot: (in thread context) "I'd suggest 1000 USDC for 10 participants..."
User: (continues conversationally)
```

### Pros

- **Familiar UX** — conversational, multi-turn interaction
- **Native Telegram** — no external webapp/UI needed
- **Multiple quests** — user can manage 5 quests in 5 threads simultaneously
- **Message history** — Telegram naturally preserves thread context

### Cons

- **Setup friction** — requires BotFather config + user opt-in + potential fee
- **Global system prompt** — can't give bot different instruction set per thread (limitation of grammY/Telegram API)
  - Workaround: routing logic in your code to switch behavior per thread
- **Manual thread routing** — no middleware support, must code `if (threadId === X) { ... }`
- **Fragile error handling** — wrong `message_thread_id` crashes flow (requires validation)
- **UX discovery** — most users unaware this feature exists; needs education
- **Limited to opt-in users** — doesn't work for users who haven't enabled topics

### Implementation Effort

**Backend (grammY):**
- ~200 lines: thread detection, routing, sending
- Need persistent storage to map: `user → [quest ID → topic ID]`
- Error handling for 400 Bad Request responses

**Frontend (Telegram):**
- Button: "Create new quest" → calls bot command `/create_quest`
- Instructions card: "Enable Threaded Mode in @BotFather"
- QR code to bot settings (nice-to-have)

**Database:**
- Add `questTelegramTopicId` to Quest model (nullable)
- Add `hasEnabledThreadedMode` to TelegramLink model

**Estimated effort:** 1-2 days for core flow, 1 day for error handling + tests

---

## 8. Alternative: Telegram Mini Apps

### What Are Mini Apps?

Per [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps):

Lightweight HTML5 web applications embedded directly in Telegram. Can be launched via:
- Inline keyboard button with `web_app` parameter
- Bot command
- Menu button

### How They Work

**Button launch:**
```typescript
// In grammY
const keyboard = InlineKeyboard.from([[
  InlineKeyboardButton.webApp("Create Quest", { url: "https://quest-create.app" })
]]);

await ctx.reply("Create a new quest:", { reply_markup: keyboard });
```

**App receives context:**
```javascript
// In Mini App (HTML/JS)
const tg = window.Telegram.WebApp;
tg.initData;  // User ID, chat ID, start param
tg.ready();   // Tell Telegram app is loaded
```

### Pro/Con Analysis

| Aspect | Threads | Mini Apps |
|--------|---------|-----------|
| **Form complexity** | Limited (text input) | Full HTML5 form (perfect) |
| **Multi-step flow** | Conversational, slow | Single page or wizard (fast) |
| **Visual design** | Telegram defaults | Full custom UI |
| **Context isolation** | Per-thread | Single page app |
| **Setup friction** | High (BotFather config) | Low (just a URL) |
| **User adoption** | Requires opt-in | Instant, in-chat |
| **Real-time feedback** | Async messages | Immediate UI response |
| **Data entry UX** | Type each field separately | Form-like with validation |

### Mini App Recommendation

For quest creation specifically, **Mini Apps are superior because:**

1. **Wizard/stepper pattern** — Quest creation is inherently multi-step (Details → Tasks → Reward → Review)
   - Threads force conversational style, inefficient for structured data
2. **Real-time validation** — Custom skill URLs, token names, token amounts need immediate feedback
3. **Visual mockups** — Quest preview before saving critical for user confidence
4. **No setup friction** — Click button → create quest, done
   - Threads require BotFather config + opt-in + potential fee

---

## 9. Recommended Path Forward

### For Immediate Need (Conversation-Driven Quest Building)

**Use Threads IF:**
- Team has budget/time for BotFather + user education
- Want to keep all interactions within Telegram (no external websites)
- Bot already supports similar multi-topic conversations

**Use Mini Apps IF (RECOMMENDED):**
- Want fast, professional UX for quest creation
- Need structured data entry (forms beat conversational)
- Don't want to manage thread state / routing complexity

### Hybrid Approach (Best of Both)

Implement **Mini App for quest creation** + **Threads for ongoing quest management:**

```
Flow:
1. User clicks "Create Quest" → Mini App form (quest wizard)
2. User submits → Quest created, gets quest ID
3. User wants to manage quest tasks → /manage_quest <questId>
4. Bot creates or switches to existing topic for that quest
5. User converses with bot in topic (edit, add tasks, preview, fund)
```

This gets:
- ✓ Efficient form-based creation (Mini App)
- ✓ Natural conversational management (Threads)
- ✓ Organized topic history per quest

---

## 10. Key Technical Gotchas

### 1. Message Thread ID = 1 is Special

**DO NOT** include `message_thread_id: 1` in API calls:
```typescript
// ❌ WRONG — causes "message thread not found"
await ctx.api.sendMessage(chatId, "text", { message_thread_id: 1 });

// ✓ CORRECT — omit thread ID for General topic
await ctx.api.sendMessage(chatId, "text", {});
```

### 2. Private DMs Without Topics Enabled Reject Thread IDs

```typescript
// ❌ WRONG — user hasn't enabled topics in BotFather settings
if (!ctx.from?.has_topics_enabled) {
  // Don't include message_thread_id!
}
```

### 3. Custom Emoji IDs Are 64-Bit Strings

```typescript
// ✓ CORRECT
await ctx.api.createForumTopic(chatId, "My Topic", {
  icon_custom_emoji_id: "5318352130671013619"  // String, not integer
});
```

### 4. Icon Color Must Match Allowed Set

Only 6 colors allowed; arbitrary RGB will be rejected:
```typescript
// ❌ WRONG
{ icon_color: 16711680 }  // Random red — rejected

// ✓ CORRECT
{ icon_color: 16478047 }  // 0xFB6F5F orange — one of 6 allowed
```

### 5. grammY Doesn't Auto-Propagate Thread ID in Replies

Every reply must manually include `message_thread_id`:
```typescript
bot.on("message", async (ctx) => {
  // ❌ WRONG — reply goes to General, not original thread
  await ctx.reply("Response");

  // ✓ CORRECT
  await ctx.reply("Response", {
    message_thread_id: ctx.msg.message_thread_id
  });
});
```

---

## 11. Unresolved Questions

1. **Star cost for private chat topics** — Telegram's terms reference a fee but don't specify amount or billing model (per-create? per-month?)

2. **User experience of enabling topics** — Does BotFather UI guide non-technical users clearly? Any data on adoption friction?

3. **Thread limit per private chat** — Is there a maximum number of topics a bot can create in one private chat? (Forums have 100+, unclear for DMs)

4. **Session memory scaling** — If storing thread IDs in DB, what's the scalability limit? (Likely not an issue for ClawQuest scale)

5. **Mini App payment integration** — Can Mini Apps trigger direct on-chain transactions, or must they callback to bot API? (Relevant for quest funding flow)

6. **iOS vs Android Mini App UX parity** — Are there known UI/UX differences between platforms? (Affects quest wizard design)

---

## 12. References & Sources

- [Telegram Blog - Threads for Bots](https://telegram.org/blog/comments-in-video-chats-threads-for-bots)
- [Telegram Bot API - Official Docs](https://core.telegram.org/bots/api)
- [Telegram Threads API Documentation](https://core.telegram.org/api/threads)
- [Telegram Forums API Documentation](https://core.telegram.org/api/forum)
- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [grammY Documentation - Context & Basics](https://grammy.dev/guide/basics)
- [grammY Context Reference](https://grammy.dev/ref/core/context)
- [OpenClaw Telegram Integration Docs](https://docs.openclaw.ai/channels/telegram)
- [OpenClaw GitHub Issue #12929 - Thread ID Error](https://github.com/openclaw/openclaw/issues/12929)
- [OpenClaw GitHub Issue #11620 - Topics/Forum Mode Toggle Bug](https://github.com/openclaw/openclaw/issues/11620)

---

## Summary

**Telegram Threads for private chats are technically viable but operationally complex.** They provide native conversation threading but require user setup, lack per-thread system prompts, and have brittle error handling.

**Mini Apps are the recommended primary approach** for structured quest creation (wizard/form), with **Threads as a secondary option** for conversational quest management after creation.

**Estimated implementation for threads-based quest creation: 2-3 days** including error handling, BotFather setup docs, and user education.

**Estimated implementation for Mini App approach: 3-5 days** including form UI, validation, Telegram SDK integration, and callback handling.

Recommend **Mini App MVP + optional Threads for v2** to maximize user adoption quickly.
