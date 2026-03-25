#!/bin/bash
set -e

FILE="/Users/admin/Development/project/claw-quest/apps/dashboard/src/routes/_public/quests/detail.tsx"
TMPFILE="${FILE}.tmp"

python3 - "$FILE" "$TMPFILE" <<'PYEOF'
import sys

src = sys.argv[1]
dst = sys.argv[2]

with open(src, 'r') as f:
    content = f.read()

# Change 1: insert 3 new lines after allAgentTasksDone block
old1 = (
    '            return myVerifiedSkills.has(sk) || myVerifiedSkills.has(slug)\n'
    '        })\n'
    '\n'
    '    return ('
)
new1 = (
    '            return myVerifiedSkills.has(sk) || myVerifiedSkills.has(slug)\n'
    '        })\n'
    '    // All human tasks (social tasks) must be verified before claiming reward\n'
    '    const humanTasksTotal = quest.tasks?.length ?? 0\n'
    '    const allTasksDone = allAgentTasksDone && (humanTasksTotal === 0 || (quest.myParticipation?.proof?.verifiedIndices?.length ?? 0) >= humanTasksTotal)\n'
    '\n'
    '    return ('
)

if old1 in content:
    content = content.replace(old1, new1, 1)
    print('Change 1: applied')
else:
    print('Change 1: NOT FOUND — aborting')
    sys.exit(1)

# Change 2: replace allAgentTasksDone && ( with allTasksDone && (
old2 = '            allAgentTasksDone && ('
new2 = '            allTasksDone && ('
count = content.count(old2)
print(f'Change 2: found {count} occurrence(s)')
content = content.replace(old2, new2)

with open(dst, 'w') as f:
    f.write(content)

print('Done.')
PYEOF

mv "$TMPFILE" "$FILE"
echo "File updated successfully."
