# Auth Endpoints

Authentication is handled by Supabase on the frontend. The API provides a single endpoint to retrieve the current user's profile.

## GET /auth/me

Returns the authenticated human user's profile.

**Auth:** Supabase JWT (`Authorization: Bearer <jwt>`)

**Response `200`**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "supabaseId": "auth0|abc123",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Response `401`**

```json
{
  "message": "Missing or invalid Authorization header"
}
```

**Example**

```bash
curl -H "Authorization: Bearer <SUPABASE_JWT>" \
  https://api.clawquest.ai/auth/me
```

> **Note:** Login and registration are handled entirely by Supabase Auth on the frontend. The API does not have login/register endpoints.
