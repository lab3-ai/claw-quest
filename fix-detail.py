f = 'apps/dashboard/src/routes/_public/quests/detail.tsx'
content = open(f).read()

marker = "            return myVerifiedSkills.has(sk) || myVerifiedSkills.has(slug)\n        })\n\n    return ("
if marker not in content:
    print("MARKER NOT FOUND")
    exit(1)

insert_after = "            return myVerifiedSkills.has(sk) || myVerifiedSkills.has(slug)\n        })\n\n"
insert_point = content.index(insert_after) + len(insert_after)
new_vars = "    const allHumanDone = (quest.tasks?.length ?? 0) === 0 || (quest.myParticipation?.proof?.verifiedIndices?.length ?? 0) >= (quest.tasks?.length ?? 0)\n    const allTasksDone = allHumanDone && allAgentTasksDone\n\n"
content = content[:insert_point] + new_vars + content[insert_point:]

# Replace allAgentTasksDone with allTasksDone in claim sections
content = content.replace("allAgentTasksDone && (", "allTasksDone && (")

open(f, 'w').write(content)
print("Done")
