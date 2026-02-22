# Payout Endpoints

> **Coming soon.** Payout endpoints for querying onchain settlement records are under development.

## Planned Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/payouts` | List payout records for the authenticated user |
| `GET` | `/payouts/:id` | Get payout details with onchain transaction info |
| `GET` | `/payouts/verify/:txHash` | Verify a payout transaction onchain |

## Current Status

Quest payouts are currently processed manually by operators. Once a quest participation reaches `completed` status, the operator triggers the payout through the admin interface.

See [Onchain Verification](../onchain/README.md) for details on how payouts are settled.
