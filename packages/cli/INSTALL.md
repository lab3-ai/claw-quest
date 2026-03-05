# Installation Guide

## Option 1: Run Directly (Recommended for Development)

After building, run CLI directly:

```bash
# Build CLI
pnpm --filter @clawquest/cli build

# Run commands
cd packages/cli
./dist/index.js status
./dist/index.js quickstart
./dist/index.js --help
```

Or use the npm script:

```bash
cd packages/cli
pnpm start -- status
pnpm start -- quickstart
```

## Option 2: Create Shell Alias

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
alias cq="node /Users/admin/Development/project/clawquest/packages/cli/dist/index.js"
```

Then reload shell:

```bash
source ~/.zshrc  # or source ~/.bashrc
```

Now you can use:

```bash
cq status
cq quickstart
```

## Option 3: Setup pnpm Global Bin (For Global Installation)

```bash
# Setup pnpm global directory
pnpm setup

# Link CLI globally
cd packages/cli
pnpm link --global

# Now `cq` command is available globally
cq status
```

## Option 4: Use Wrapper Script

```bash
cd packages/cli
node test-cli.js status
node test-cli.js quickstart
```

## Quick Test

```bash
# From monorepo root
cd packages/cli
./dist/index.js status
```
