# `.agentic/` — AI coding rules source of truth

This directory holds the **canonical rule files** for AI coding agents working in this monorepo. It generates tool-specific outputs (Cursor, Claude Code, etc.) via [`scripts/sync.ts`](./scripts/sync.ts).

## Why

Cursor and Claude Code both need the same architectural rules but consume them in different formats:

- **Cursor** reads `.cursor/rules/*.mdc` (one file per rule, frontmatter-based scoping)
- **Claude Code** reads `CLAUDE.md` at repo root + `<package>/CLAUDE.md` at package roots

Maintaining both by hand drifts. `.agentic/` is the source; both targets are generated.

## Layout

```
.agentic/
├── AGENTS.md                # root context (symlinked to /CLAUDE.md, /AGENTS.md)
├── README.md                # this file
├── rules/                   # the actual rule files
│   ├── _shared/             # rules that apply across packages
│   ├── backend/             # NestJS/MikroORM/GraphQL/Lambda rules
│   ├── frontend/            # React/Vite/Apollo/Tailwind rules
│   ├── mobile/              # Expo/Apollo/Amplify rules
│   └── iaac/                # Terragrunt/AWS rules
├── packages/                # per-package context (symlinked to <pkg>/CLAUDE.md)
│   ├── backend.md
│   ├── frontend.md
│   ├── mobile.md
│   └── iaac.md
└── scripts/
    ├── sync.ts              # the codegen script
    ├── package.json
    └── tsconfig.json
```

## Rule file format

Every file under `rules/` has YAML frontmatter:

```yaml
---
name: backend-architecture           # used for the generated .mdc filename
description: Short summary           # shown in Cursor rule picker
globs: ["backend/src/**/*.ts"]      # array → Cursor comma-separated string
alwaysApply: false                  # Cursor: applies regardless of glob match
applies_to: [cursor, claude]        # which tools should consume this rule
priority: high                      # informational (sync.ts doesn't use it yet)
---

# Markdown body — the rule content
```

## Running sync

```bash
cd .agentic/scripts
pnpm install                # first time only
pnpm sync                   # regenerate outputs

# CI: verify outputs are committed and up to date
pnpm sync:check             # exit 1 if anything differs
```

## What `sync.ts` does

1. **Cursor rules** — for each `rules/**/<name>.md`, writes `.cursor/rules/<flat-name>.mdc` with Cursor-compatible frontmatter (strips `applies_to`, `priority`)
2. **Root symlinks** — creates `/CLAUDE.md` and `/AGENTS.md` as symlinks to `.agentic/AGENTS.md`
3. **Package symlinks** — creates `<pkg>/CLAUDE.md` and `<pkg>/AGENTS.md` as symlinks to `.agentic/packages/<pkg>.md`
4. **Stale cleanup** — removes `.cursor/rules/*.mdc` files that no longer have a source in `.agentic/`

## When to edit what

- **Edit `.agentic/rules/<category>/<name>.md`** — to change a rule's content
- **Edit `.agentic/packages/<pkg>.md`** — to update a package's ambient context
- **Edit `.agentic/AGENTS.md`** — to update repo-wide context
- **Never edit** `.cursor/rules/*.mdc` directly — changes are overwritten by `sync.ts`
- **Never edit** symlinked `CLAUDE.md` / `AGENTS.md` directly — edit the source in `.agentic/`

## Adding a new rule

```bash
# 1. Create the source
cat > .agentic/rules/frontend/new-rule.md <<'EOF'
---
name: frontend-new-rule
description: What this rule covers
globs: ["frontend/src/**/*.tsx"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Rule Content

Body of the rule...
EOF

# 2. Sync
cd .agentic/scripts && pnpm sync

# 3. Commit both source and generated output
git add .agentic/rules/frontend/new-rule.md .cursor/rules/frontend-new-rule.mdc
git commit -m "feat(agentic): add frontend-new-rule"
```
