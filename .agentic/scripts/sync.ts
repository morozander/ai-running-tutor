#!/usr/bin/env tsx
/**
 * Sync .agentic/ rules to tool-specific outputs:
 *   - .cursor/rules/<flat-name>.mdc   (Cursor-compatible MDC files)
 *   - .cursor/agents/<name>.md        (from .claude/agents/, model aliases → Cursor slugs)
 *   - CLAUDE.md                       (symlink → .agentic/AGENTS.md)
 *   - <package>/CLAUDE.md             (symlink → .agentic/packages/<package>.md)
 *
 * Usage:
 *   pnpm sync          # write outputs
 *   pnpm sync --check  # exit 1 if any output differs from source (CI use)
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AGENTIC_DIR = path.join(REPO_ROOT, '.agentic');
const CURSOR_RULES_DIR = path.join(REPO_ROOT, '.cursor', 'rules');
const CLAUDE_AGENTS_DIR = path.join(REPO_ROOT, '.claude', 'agents');
const CURSOR_AGENTS_DIR = path.join(REPO_ROOT, '.cursor', 'agents');

// .claude/agents/*.md use Claude Code model aliases (opus/sonnet/haiku), which
// Cursor does not resolve. Generated .cursor/agents/*.md pin explicit Cursor
// model slugs instead (.cursor wins name conflicts over the compat-loaded
// .claude/agents, so Cursor uses these and Claude Code ignores them).
// This map is also the experiment knob: point a tier at gpt-5 / composer to
// run the same workflow on a different model family.
const CURSOR_MODEL_MAP: Record<string, string> = {
  opus: 'claude-opus-4-8',
  sonnet: 'claude-sonnet-5',
  haiku: 'claude-4.5-haiku', // Cursor kept the older naming scheme for Haiku
};

const PACKAGE_SYMLINKS: Array<{ pkg: string; source: string }> = [
  { pkg: 'backend', source: '.agentic/packages/backend.md' },
  { pkg: 'frontend', source: '.agentic/packages/frontend.md' },
  { pkg: 'mobile', source: '.agentic/packages/mobile.md' },
  { pkg: 'iaac', source: '.agentic/packages/iaac.md' },
];

type RuleFrontmatter = {
  name: string;
  description: string;
  globs?: string[] | string;
  alwaysApply?: boolean;
  applies_to?: string[];
  priority?: 'low' | 'normal' | 'high';
};

const isCheck = process.argv.includes('--check');
let mismatchCount = 0;

async function main() {
  await syncCursorRules();
  await syncCursorAgents();
  await syncRootSymlink();
  await syncPackageSymlinks();

  if (isCheck && mismatchCount > 0) {
    console.error(`\n${mismatchCount} file(s) out of sync. Run \`pnpm sync\` to regenerate.`);
    process.exit(1);
  }
  console.log(isCheck ? '\nAll outputs in sync.' : '\nSync complete.');
}

// ─── Cursor rules ──────────────────────────────────────────────────────────

async function syncCursorRules() {
  const rules = await collectRules(path.join(AGENTIC_DIR, 'rules'));

  await ensureDir(CURSOR_RULES_DIR);
  const expectedFiles = new Set<string>();

  for (const rule of rules) {
    if (rule.appliesToCursor === false) continue;

    const mdcContent = renderCursorMdc(rule);
    const mdcPath = path.join(CURSOR_RULES_DIR, `${rule.flatName}.mdc`);
    await writeOrCheck(mdcPath, mdcContent);
    expectedFiles.add(`${rule.flatName}.mdc`);
  }

  // Remove .mdc files that no longer have a source
  const existingFiles = await fs.readdir(CURSOR_RULES_DIR).catch(() => []);
  for (const file of existingFiles) {
    if (file.endsWith('.mdc') && !expectedFiles.has(file)) {
      const filePath = path.join(CURSOR_RULES_DIR, file);
      if (isCheck) {
        console.error(`✗ Stale file (would be removed): .cursor/rules/${file}`);
        mismatchCount++;
      } else {
        await fs.unlink(filePath);
        console.log(`  removed .cursor/rules/${file}`);
      }
    }
  }
}

// ─── Cursor subagents ──────────────────────────────────────────────────────
//
// Source of truth: .claude/agents/*.md (Claude Code format). Cursor compat-loads
// that directory too, but cannot resolve the opus/sonnet/haiku model aliases, so
// we generate .cursor/agents/*.md with explicit slugs from CURSOR_MODEL_MAP.
// The `tools:` field is Claude-specific and dropped (Cursor manages tool access
// itself); everything else passes through verbatim.

type AgentFrontmatter = {
  name: string;
  description: string;
  model?: string;
  tools?: string;
};

async function syncCursorAgents() {
  const files = await fs.readdir(CLAUDE_AGENTS_DIR).catch(() => [] as string[]);
  await ensureDir(CURSOR_AGENTS_DIR);
  const expectedFiles = new Set<string>();

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const raw = await fs.readFile(path.join(CLAUDE_AGENTS_DIR, file), 'utf8');
    const parsed = matter(raw);
    const fm = parsed.data as AgentFrontmatter;

    if (!fm.name) {
      throw new Error(`Missing 'name' in frontmatter: .claude/agents/${file}`);
    }

    await writeOrCheck(path.join(CURSOR_AGENTS_DIR, file), renderCursorAgent(fm, parsed.content));
    expectedFiles.add(file);
  }

  // Remove generated agents that no longer have a source
  const existingFiles = await fs.readdir(CURSOR_AGENTS_DIR).catch(() => [] as string[]);
  for (const file of existingFiles) {
    if (file.endsWith('.md') && !expectedFiles.has(file)) {
      const filePath = path.join(CURSOR_AGENTS_DIR, file);
      if (isCheck) {
        console.error(`✗ Stale file (would be removed): .cursor/agents/${file}`);
        mismatchCount++;
      } else {
        await fs.unlink(filePath);
        console.log(`  removed .cursor/agents/${file}`);
      }
    }
  }
}

function renderCursorAgent(fm: AgentFrontmatter, body: string): string {
  const model = fm.model ? (CURSOR_MODEL_MAP[fm.model] ?? fm.model) : 'inherit';
  const lines: string[] = ['---'];
  lines.push(`name: ${fm.name}`);
  lines.push(`description: ${JSON.stringify(fm.description ?? '')}`);
  lines.push(`model: ${model}`);
  lines.push('---');
  lines.push('');
  lines.push('<!-- GENERATED from .claude/agents/ by .agentic/scripts/sync.ts — edit the source, then `pnpm sync` -->');
  lines.push('');
  lines.push(body.trim());
  lines.push('');
  return lines.join('\n');
}

type CollectedRule = {
  flatName: string;
  category: string;
  description: string;
  globs: string;
  alwaysApply: boolean;
  appliesToCursor: boolean;
  body: string;
};

async function collectRules(rulesDir: string): Promise<CollectedRule[]> {
  const categories = await fs.readdir(rulesDir);
  const rules: CollectedRule[] = [];

  for (const category of categories) {
    const categoryDir = path.join(rulesDir, category);
    const stat = await fs.stat(categoryDir);
    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(categoryDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const filePath = path.join(categoryDir, file);
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = matter(raw);
      const fm = parsed.data as RuleFrontmatter;

      if (!fm.name) {
        throw new Error(`Missing 'name' in frontmatter: ${filePath}`);
      }

      const flatName = makeFlatName(category, fm.name);
      const appliesTo = fm.applies_to ?? ['cursor', 'claude'];

      rules.push({
        flatName,
        category,
        description: fm.description ?? '',
        globs: normalizeGlobs(fm.globs),
        alwaysApply: fm.alwaysApply ?? false,
        appliesToCursor: appliesTo.includes('cursor'),
        body: parsed.content.trim(),
      });
    }
  }

  return rules;
}

function makeFlatName(category: string, name: string): string {
  // _shared/kebab-case → kebab-case
  // backend/architecture → backend-architecture  (already has "backend-" prefix in name? avoid double)
  if (category === '_shared') return name;
  if (name.startsWith(`${category}-`)) return name;
  return `${category}-${name}`;
}

function normalizeGlobs(globs: string[] | string | undefined): string {
  if (!globs) return '';
  if (typeof globs === 'string') return globs;
  return globs.join(',');
}

function renderCursorMdc(rule: CollectedRule): string {
  const lines: string[] = ['---'];
  lines.push(`description: ${rule.description}`);
  if (rule.globs) lines.push(`globs: ${quoteIfNeeded(rule.globs)}`);
  lines.push(`alwaysApply: ${rule.alwaysApply}`);
  lines.push('---');
  lines.push('');
  lines.push(rule.body);
  lines.push('');
  return lines.join('\n');
}

function quoteIfNeeded(value: string): string {
  // Cursor accepts comma-separated globs; quote only if it contains special YAML chars
  if (/[:#{}\[\]&*!|>%@`]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

// ─── Root symlink: CLAUDE.md → .agentic/AGENTS.md ──────────────────────────

async function syncRootSymlink() {
  const target = path.join(REPO_ROOT, 'CLAUDE.md');
  const source = '.agentic/AGENTS.md';
  await ensureSymlink(target, source);

  const agentsTarget = path.join(REPO_ROOT, 'AGENTS.md');
  await ensureSymlink(agentsTarget, source);
}

// ─── Per-package symlinks: <pkg>/CLAUDE.md → .agentic/packages/<pkg>.md ────

async function syncPackageSymlinks() {
  for (const { pkg, source } of PACKAGE_SYMLINKS) {
    const pkgDir = path.join(REPO_ROOT, pkg);
    const exists = await fs.access(pkgDir).then(() => true).catch(() => false);
    if (!exists) continue;

    const target = path.join(pkgDir, 'CLAUDE.md');
    const agentsTarget = path.join(pkgDir, 'AGENTS.md');
    // Relative path from the symlink location → source
    const relativeSource = path.relative(pkgDir, path.join(REPO_ROOT, source));
    await ensureSymlink(target, relativeSource);
    await ensureSymlink(agentsTarget, relativeSource);
  }
}

// ─── Filesystem helpers ────────────────────────────────────────────────────

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeOrCheck(filePath: string, content: string) {
  const existing = await fs.readFile(filePath, 'utf8').catch(() => null);
  if (existing === content) return;

  if (isCheck) {
    console.error(`✗ Out of sync: ${path.relative(REPO_ROOT, filePath)}`);
    mismatchCount++;
    return;
  }

  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
  console.log(`  wrote ${path.relative(REPO_ROOT, filePath)}`);
}

async function ensureSymlink(target: string, source: string) {
  const existingLink = await fs.readlink(target).catch(() => null);
  if (existingLink === source) return;

  // If existing path is a regular file (not a symlink), refuse to clobber.
  const stat = await fs.lstat(target).catch(() => null);
  if (stat && !stat.isSymbolicLink()) {
    if (isCheck) {
      console.error(`✗ Not a symlink (would be replaced): ${path.relative(REPO_ROOT, target)}`);
      mismatchCount++;
      return;
    }
    throw new Error(
      `Refusing to overwrite non-symlink: ${target}. Remove it manually if intentional.`,
    );
  }

  if (isCheck) {
    console.error(`✗ Symlink out of sync: ${path.relative(REPO_ROOT, target)} → ${source}`);
    mismatchCount++;
    return;
  }

  if (stat) await fs.unlink(target);
  await fs.symlink(source, target);
  console.log(`  symlinked ${path.relative(REPO_ROOT, target)} → ${source}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
