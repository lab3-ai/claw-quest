#!/usr/bin/env bash
# test-skill-verify-flow.sh
# End-to-end test: create skill → create quest → verify skill via challenge system
# Usage: ./scripts/test-skill-verify-flow.sh
# Requirements: curl, jq

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
API="${API_BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin-clawquest@clawquest.ai}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"      # skip login by providing token directly
AGENT_API_KEY="${AGENT_API_KEY:-}"  # cq_... key

SKILL_SLUG="test-bybit-trading-$(date +%s)"
QUEST_TITLE="Test Quest — Bybit Skill Verify $(date +%H:%M:%S)"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓ $*${NC}"; }
info() { echo -e "${CYAN}→ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠ $*${NC}"; }
fail() { echo -e "${RED}✗ $*${NC}"; exit 1; }
hr()   { echo -e "${CYAN}────────────────────────────────────────${NC}"; }

# ── Prerequisites ─────────────────────────────────────────────────────────────
command -v jq  >/dev/null 2>&1 || fail "jq is required (brew install jq)"
command -v curl >/dev/null 2>&1 || fail "curl is required"

# Helper: generate HS256 JWT for admin (dev only — uses JWT_SECRET from api/.env)
gen_admin_jwt() {
  local secret user_id email
  secret=$(grep -E '^(ADMIN_JWT_SECRET|JWT_SECRET)=' "$(dirname "$0")/../apps/api/.env" 2>/dev/null \
    | head -1 | cut -d= -f2- | tr -d '"')
  [[ -z "$secret" ]] && fail "Could not read JWT_SECRET from apps/api/.env"
  user_id=$(PGPASSWORD=postgrespassword psql -h localhost -p 5432 -U postgres -d clawquest -t \
    -c "SELECT id FROM \"User\" WHERE role='admin' LIMIT 1;" 2>/dev/null | xargs)
  email=$(PGPASSWORD=postgrespassword psql -h localhost -p 5432 -U postgres -d clawquest -t \
    -c "SELECT email FROM \"User\" WHERE role='admin' LIMIT 1;" 2>/dev/null | xargs)
  [[ -z "$user_id" ]] && fail "No admin user found in DB"
  node -e "
    const {createHmac}=require('crypto');
    const hdr=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
    const exp=Math.floor(Date.now()/1000)+86400;
    const bdy=Buffer.from(JSON.stringify({id:'$user_id',email:'$email',role:'admin',iat:Math.floor(Date.now()/1000),exp})).toString('base64url');
    const sig=createHmac('sha256','$secret').update(hdr+'.'+bdy).digest('base64url');
    console.log(hdr+'.'+bdy+'.'+sig);
  " 2>/dev/null
}

if [[ -z "$ADMIN_TOKEN" && -z "$ADMIN_PASSWORD" ]]; then
  warn "No ADMIN_TOKEN or ADMIN_PASSWORD set — attempting to generate JWT from local DB+secret"
  ADMIN_TOKEN=$(gen_admin_jwt)
  ok "Generated admin JWT from local dev secret"
fi

if [[ -z "$AGENT_API_KEY" ]]; then
  echo -n "Agent API key (cq_...): "
  read -rs AGENT_API_KEY; echo
fi

hr
info "API: $API"
info "Skill slug: $SKILL_SLUG"
hr

# ── Step 1: Admin login ───────────────────────────────────────────────────────
echo
info "Step 1: Admin login"
if [[ -n "$ADMIN_TOKEN" ]]; then
  ok "Using provided ADMIN_TOKEN (skipping login)"
else
  ADMIN_RESP=$(curl -sf -X POST "$API/admin/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
  ADMIN_TOKEN=$(echo "$ADMIN_RESP" | jq -r '.token')
  [[ "$ADMIN_TOKEN" == "null" || -z "$ADMIN_TOKEN" ]] && fail "Admin login failed: $(echo "$ADMIN_RESP" | jq -r '.message // .error // .')"
  ok "Logged in as $ADMIN_EMAIL"
fi

# ── Step 2: Create skill with full verification_config ────────────────────────
echo
info "Step 2: Create skill '$SKILL_SLUG' with verification_config"
SKILL_RESP=$(curl -sf -X POST "$API/admin/skills" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"slug\": \"$SKILL_SLUG\",
    \"display_name\": \"Bybit Trading (Test)\",
    \"summary\": \"Test skill for Bybit spot kline API\",
    \"tags\": {\"category\": \"trading\", \"exchange\": \"bybit\"},
    \"verification_config\": {
      \"type\": \"api_call\",
      \"skill_display\": \"Bybit Trading\",
      \"task_description\": \"Fetch spot kline (candlestick) data from Bybit API\",
      \"api_endpoint\": \"https://api.bybit.com/v5/market/kline\",
      \"params\": {
        \"category\": \"spot\",
        \"symbol\": \"\${symbol}\",
        \"interval\": \"\${interval}\",
        \"limit\": \"\${limit}\"
      },
      \"variable_options\": {
        \"symbol\": [\"DOGEUSDT\", \"BTCUSDT\", \"ETHUSDT\"],
        \"interval\": [\"5\", \"15\", \"60\"],
        \"limit\": [3, 5]
      },
      \"submission_fields\": [\"result\", \"ts\"],
      \"validation\": {\"type\": \"non_empty_response\", \"check_path\": \"result\"}
    }
  }")
SKILL_CREATED=$(echo "$SKILL_RESP" | jq -r '.skill.slug // empty')
[[ -z "$SKILL_CREATED" ]] && fail "Skill creation failed: $SKILL_RESP"
ok "Skill created: $SKILL_CREATED"

# ── Step 3: Verify skill verification-info endpoint ───────────────────────────
echo
info "Step 3: Verify GET /quests/skills/$SKILL_SLUG/verification-info"
VFY_INFO=$(curl -sf "$API/quests/skills/$SKILL_SLUG/verification-info")
TASK_DESC=$(echo "$VFY_INFO" | jq -r '.verification_config.task_description // empty')
[[ -z "$TASK_DESC" ]] && fail "verification-info missing task_description: $VFY_INFO"
ok "verification-info OK — task_description: $TASK_DESC"

# ── Step 4: Create a quest requiring this skill ───────────────────────────────
echo
info "Step 4: Create quest requiring skill '$SKILL_SLUG'"
EXPIRE=$(date -u -v+1d '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '+1 day' '+%Y-%m-%dT%H:%M:%SZ')
QUEST_RESP=$(curl -sf -X POST "$API/quests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -d "{
    \"title\": \"$QUEST_TITLE\",
    \"description\": \"Auto-generated test quest for skill verification\",
    \"sponsor\": \"TestBot\",
    \"status\": \"draft\",
    \"type\": \"FCFS\",
    \"rewardType\": \"USD\",
    \"rewardAmount\": 0,
    \"totalSlots\": 1,
    \"expiresAt\": \"$EXPIRE\",
    \"requiredSkills\": [\"$SKILL_SLUG\"],
    \"tasks\": [],
    \"tags\": [\"test\", \"auto\"]
  }")
QUEST_ID=$(echo "$QUEST_RESP" | jq -r '.id // empty')
[[ -z "$QUEST_ID" ]] && fail "Quest creation failed: $QUEST_RESP"
ok "Quest created: $QUEST_ID"
info "Quest URL: $API/quests/$QUEST_ID"

# ── Step 5: Request a skill challenge ─────────────────────────────────────────
echo
info "Step 5: POST /challenges — request challenge for '$SKILL_SLUG'"
CHALLENGE_RESP=$(curl -sf -X POST "$API/challenges" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -d "{\"skillSlug\":\"$SKILL_SLUG\",\"questId\":\"$QUEST_ID\"}")
TOKEN=$(echo "$CHALLENGE_RESP" | jq -r '.token // empty')
[[ -z "$TOKEN" ]] && fail "Challenge creation failed: $CHALLENGE_RESP"
EXPIRES=$(echo "$CHALLENGE_RESP" | jq -r '.expiresAt')
ok "Challenge created: $TOKEN (expires $EXPIRES)"

# ── Step 6: Fetch challenge markdown ─────────────────────────────────────────
echo
info "Step 6: GET /verify/$TOKEN — fetch challenge markdown"
MARKDOWN=$(curl -sf "$API/verify/$TOKEN")
[[ -z "$MARKDOWN" ]] && fail "Empty markdown response"
ok "Markdown received (${#MARKDOWN} chars)"
echo
echo "$MARKDOWN"
echo

# ── Step 7: Execute the embedded bash script ──────────────────────────────────
echo
info "Step 7: Extract params from challenge and call Bybit API"

# Parse params from stored challenge (re-fetch via prisma alternative: parse markdown)
CHALLENGE_ROW=$(PGPASSWORD=postgrespassword psql -h localhost -p 5432 -U postgres -d clawquest -t \
  -c "SELECT params FROM \"SkillChallenge\" WHERE token='$TOKEN';" 2>/dev/null | tr -d '[:space:]' | sed 's/^[[:space:]]*//')
if [[ -n "$CHALLENGE_ROW" ]] && echo "$CHALLENGE_ROW" | jq . >/dev/null 2>&1; then
  SYMBOL=$(echo "$CHALLENGE_ROW" | jq -r '.symbol')
  INTERVAL=$(echo "$CHALLENGE_ROW" | jq -r '.interval')
  LIMIT=$(echo "$CHALLENGE_ROW" | jq -r '.limit')
  info "Resolved params: symbol=$SYMBOL interval=$INTERVAL limit=$LIMIT"
else
  warn "Could not read params from DB directly — using defaults"
  SYMBOL="BTCUSDT"; INTERVAL="5"; LIMIT="3"
fi

BYBIT_URL="https://api.bybit.com/v5/market/kline?category=spot&symbol=${SYMBOL}&interval=${INTERVAL}&limit=${LIMIT}"
info "Calling Bybit: $BYBIT_URL"
BYBIT_RESP=$(curl -sf "$BYBIT_URL")
RESULT_LIST=$(echo "$BYBIT_RESP" | jq '.result.list // empty')
[[ -z "$RESULT_LIST" || "$RESULT_LIST" == "null" ]] && fail "Bybit API call failed: $BYBIT_RESP"
ok "Bybit returned ${LIMIT} candles for $SYMBOL"

# ── Step 8: Submit result to /verify/:token ───────────────────────────────────
echo
info "Step 8: POST /verify/$TOKEN — submit result"
TS=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
SUBMIT_BODY=$(jq -n --argjson result "$RESULT_LIST" --arg ts "$TS" '{result: $result, ts: $ts}')
SUBMIT_RESP=$(curl -sf -X POST "$API/verify/$TOKEN" \
  -H "Content-Type: application/json" \
  -d "$SUBMIT_BODY")
PASSED=$(echo "$SUBMIT_RESP" | jq -r '.passed')
MESSAGE=$(echo "$SUBMIT_RESP" | jq -r '.message')

echo
hr
if [[ "$PASSED" == "true" ]]; then
  ok "PASSED: $MESSAGE"
else
  fail "FAILED: $MESSAGE"
fi
hr

echo
info "Summary"
echo "  Skill slug:  $SKILL_SLUG"
echo "  Quest ID:    $QUEST_ID"
echo "  Token:       $TOKEN"
echo "  Result:      passed=$PASSED"
echo
info "UI check: open your browser to http://localhost:5173/quests/$QUEST_ID"
info "          Click 'How to verify' on the skill row to see the guide"
echo
