const fs = require('fs');
const file = 'apps/dashboard/src/routes/_public/quests/detail.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add allTasksDone variable (after allAgentTasksDone block, before return)
const agentDoneEnd = content.indexOf("            return myVerifiedSkills.has(sk) || myVerifiedSkills.has(slug)\n        })\n\n    return (");
if (agentDoneEnd === -1) {
    console.error('Marker not found for allTasksDone insertion');
    process.exit(1);
}
const insertPoint = agentDoneEnd + "            return myVerifiedSkills.has(sk) || myVerifiedSkills.has(slug)\n        })\n\n".length;
const allTasksDoneVar = "    const allHumanDone = (quest.tasks?.length ?? 0) === 0 || (quest.myParticipation?.proof?.verifiedIndices?.length ?? 0) >= (quest.tasks?.length ?? 0)\n    const allTasksDone = allHumanDone && allAgentTasksDone\n\n";
content = content.slice(0, insertPoint) + allTasksDoneVar + content.slice(insertPoint);

// 2. Replace allAgentTasksDone with allTasksDone in claim sections
content = content.replace(/allAgentTasksDone && \(/g, 'allTasksDone && (');

fs.writeFileSync(file, content);
console.log('Done - allTasksDone inserted and claim sections updated');
