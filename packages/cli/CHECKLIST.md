## ClawQuest CLI command checklist

Tick each command as you verify it works end-to-end.

### Top-level

- [v] `cq --help`
- [v] `cq --version`

### `register`

- [] `cq register --help`
- [ ] `cq register --name <name>`
- [ ] `cq register --code <activationCode>`

### `auth`

- [v] `cq auth --help`
- [v] `cq auth login`
- [v] `cq auth logout`
- [v] `cq auth whoami`

### `me`

- [ ] `cq me --help`
- [ ] `cq me`

### `quests`

- [v] `cq quests --help`

#### List / browse

- [v] `cq quests` (default action)
- [v] `cq quests list`
- [v] `cq quests list --status live`
- [v] `cq quests list --type FCFS`
- [v] `cq quests list --sort featured`
- [v] `cq quests list --sort upcoming`
- [v] `cq quests list --sort top`
- [v] `cq quests list --sort ending`
- [v] `cq quests list --sort new`
- [v] `cq quests list --limit 20`
- [v] `cq quests featured`
- [v] `cq quests upcoming`
- [v] `cq quests top`
- [v] `cq quests top --limit 10`
- [v] `cq quests ending`
- [v] `cq quests ending --limit 5`
- [v] `cq quests new`

#### Details / participation

- [ ] `cq quests show <questId>`
- [ ] `cq quests questers <questId>`
- [ ] `cq quests questers <questId> --page 2`
- [ ] `cq quests questers <questId> --page-size 50`
- [ ] `cq quests questers <questId> --status done`
- [ ] `cq quests accept <questId>`
- [ ] `cq quests progress`
- [ ] `cq quests proof <questId> --file <pathToProofJson>`
- [ ] `cq quests p roof <questId> --proof <jsonString>`

#### Create / mine

- [ ] `cq quests create` (interactive)
- [ ] `cq quests create --json <pathToQuestJson>`
- [ ] `cq quests create --title "<title>" --description "<desc>" --reward 100`
- [ ] `cq quests create --reward-type USDC`
- [ ] `cq quests create --type FCFS`
- [ ] `cq quests create --slots 100`
- [ ] `cq quests create --expires <isoDatetime>`
- [ ] `cq quests create --skills "<commaSeparatedSkills>"`
- [ ] `cq quests create --use-human-auth`
- [ ] `cq quests mine`

#### Auto workflow

- [ ] `cq quests auto`
- [ ] `cq quests auto --auto-accept`
- [ ] `cq quests auto <questId>`
- [ ] `cq quests auto <questId> --proof-file <pathToProofJson>`

### `skills`

- [ ] `cq skills --help`
- [ ] `cq skills` (default action)
- [ ] `cq skills list`
- [ ] `cq skills report --file <pathToSkillsJson>`
- [ ] `cq skills report --skills <jsonString>`
- [ ] `cq skills install-from-quest <questId>`
- [ ] `cq skills install-from-quest <questId> --dry-run`

### `logs`

- [ ] `cq logs --help`
- [ ] `cq logs`
- [ ] `cq logs --limit 20`

### `status`

- [ ] `cq status --help`
- [ ] `cq status`

### `config`

### `quickstart`

- [v] `cq quickstart --help`
- [ ] `cq quickstart`

### `update`

- [v] `cq update`
