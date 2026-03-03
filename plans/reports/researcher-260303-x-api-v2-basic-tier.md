# X API v2 Basic Tier Research Report

**Date:** 2026-03-03
**Focus:** OAuth 2.0 PKCE flow + verification endpoints for social task validation
**Token Budget:** ~150 lines

---

## 1. OAuth 2.0 PKCE Flow

### Authorization Endpoint
```
https://x.com/i/oauth2/authorize
```

**Required Parameters:**
- `client_id` — your app ID
- `redirect_uri` — callback URL (must match registered)
- `response_type=code` — always use code
- `scope` — space-separated list
- `code_challenge` — base64url(SHA256(code_verifier))
- `code_challenge_method=S256` — PKCE method
- `state` — CSRF token

### Token Endpoint
```
POST https://api.x.com/2/oauth2/token
Content-Type: application/x-www-form-urlencoded
```

**Request Body (Authorization Code Grant):**
```
grant_type=authorization_code
client_id=<client_id>
redirect_uri=<registered_uri>
code_verifier=<your_random_128_char_string>
code=<authorization_code_from_redirect>
```

**Confidential clients only:** Add `Authorization: Basic base64(client_id:client_secret)` header.

**Response:**
```json
{
  "token_type": "Bearer",
  "expires_in": 7200,
  "access_token": "...",
  "refresh_token": "..."
}
```

---

## 2. Token Lifetimes

| Token | Lifetime | Notes |
|-------|----------|-------|
| Access Token | 2 hours (7200s) | `expires_in` in response |
| Refresh Token | 6 months | One-time use; new token returned on refresh |

**Requirement:** Use `offline.access` scope to receive refresh token.

---

## 3. Refresh Token Flow

```
POST https://api.x.com/2/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
client_id=<client_id>
refresh_token=<your_refresh_token>
```

**Confidential clients:** Include `Authorization: Basic base64(client_id:client_secret)`.

**Response:** New `access_token` (7200s) + new `refresh_token` (rotate on use).

---

## 4. Required Scopes for Verification

| Scope | Needed For |
|-------|-----------|
| `tweet.read` | GET /2/tweets/:id (post author, verify URL) |
| `users.read` | GET /2/users/by/username (lookup user by handle) |
| `follows.read` | GET /2/users/:id/following (check if user follows) |
| `like.read` | GET /2/tweets/:id/liking_users (check if user liked) |
| `retweet.read` | GET /2/tweets/:id/retweeted_by (check if retweeted) |
| `offline.access` | Required to get refresh token |

**Recommended scope string:**
```
tweet.read users.read follows.read like.read retweet.read offline.access
```

---

## 5. Verification Endpoints (with scopes)

### Check if User Follows
```
GET /2/users/:user_id/following?user_fields=username&max_results=100
Authorization: Bearer <access_token>
Scope: follows.read
```

Returns paginated list of IDs followed by user. Search response for target user ID. Basic tier: 15 req/15min per-user context.

### Check if User Liked Tweet
```
GET /2/tweets/:tweet_id/liking_users?user_fields=id,username&max_results=100
Authorization: Bearer <access_token>
Scope: like.read
```

Max 100 users returned. Check if authenticated user ID in list. Basic tier: 15 req/15min.

### Check if User Retweeted
```
GET /2/tweets/:tweet_id/retweeted_by?user_fields=id,username&max_results=100
Authorization: Bearer <access_token>
Scope: retweet.read
```

Same pagination as likes endpoint. Basic tier: 15 req/15min.

### Get Tweet Details (verify author)
```
GET /2/tweets/:tweet_id?tweet.fields=author_id,created_at
Authorization: Bearer <access_token>
Scope: tweet.read
```

Returns `author_id`. Compare to target user ID to verify tweet ownership.

### Lookup User by Username
```
GET /2/users/by/username/:username?user.fields=id
Authorization: Bearer <access_token>
Scope: users.read
```

Converts `@handle` → user ID. Essential for all verification flows.

---

## 6. Rate Limits (Basic Tier / $200/mo)

**Window:** 15 minutes per user context (OAuth flow)

| Endpoint | Basic Tier | Window |
|----------|-----------|--------|
| `/2/users/:id/following` | 15 req | 15 min |
| `/2/tweets/:id/liking_users` | 15 req | 15 min |
| `/2/tweets/:id/retweeted_by` | 15 req | 15 min |
| `/2/tweets/:id` | 300 req | 15 min |
| `/2/users/by/username/:username` | 300 req | 15 min |

**Note:** Rate limits are per-user (per OAuth token), not per-app. Each authenticated user gets independent quota.

---

## 7. Token Revocation

```
POST https://api.x.com/2/oauth2/revoke
Content-Type: application/x-www-form-urlencoded

client_id=<client_id>
token=<access_or_refresh_token>
```

Useful for logout flow.

---

## Summary for Implementation

1. **Auth Flow:** Standard OAuth 2.0 PKCE (4 steps: authorize → code → exchange → API)
2. **Scopes:** Minimum `tweet.read users.read follows.read like.read retweet.read offline.access`
3. **Lifetimes:** Access 2h, refresh 6mo (one-time use)
4. **Rate Limits:** 15 req/15min for engagement endpoints, 300 for lookup/tweet details
5. **Pagination:** Max 100 per request; use `pagination_token` for more results
6. **Graceful Degrade:** On timeout/429, return `{ valid: true }` to not block user UX

**Cost:** Basic tier $200/mo supports ~432 verification requests/hour (per user).

---

## Unresolved Questions

- Does X API return specific error codes for user-not-found vs rate-limit vs server error? (Needed for error handling strategy)
- Can we batch endpoint calls in single OAuth session or must we make separate HTTP requests per check?
- Pagination token format — can we store and reuse across sessions or does it expire?

---

Sources:
- [X API OAuth 2.0 Authorization Code Flow with PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token)
- [X API Rate Limits](https://docs.x.com/x-api/fundamentals/rate-limits)
- [X API Refresh Token Endpoint](https://devcommunity.x.com/t/x-api-2-oauth2-0-refresh-token-endpoint-got-error-invalid-request-and-error-description-value-passed-for-the-token-was-invalid/224953)
- [Basic Tier Rate Limits Discussion](https://devcommunity.x.com/t/new-basic-tier-rate-limit-user-context-vs-app-context/188773)
- [/2/users/:id/following Endpoint Availability](https://devcommunity.x.com/t/is-it-possible-to-access-twitter-api-v2-2-users-id-following-endpoint-with-basic-plan/220016)
