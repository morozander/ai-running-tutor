#!/usr/bin/env tsx
/**
 * Rules-truth checker: catches drift between .agentic rules and the actual repo.
 *
 * Checks (v1 — cheap, high-signal, low-false-positive):
 *   1. PATH REFERENCES   backtick paths in rules/packages md must exist (resolved from
 *                        repo root OR the rule's package root). Prose refs = ERROR;
 *                        code-block file headers & table cells = WARNING (often illustrative).
 *   2. SCRIPT REFERENCES `pnpm <script>` / `npm run <script>` must exist in the package.json
 *                        inferred from the rule's folder (_shared may match any).
 *   3. GLOBS             every frontmatter glob must match ≥1 real file (dead glob = rule never loads).
 *   4. WORKFLOW DOCS     cross-file consistency of the .claude workflow documentation:
 *                        (a) the verifier roster in verify/SKILL.md's model-strategy table must
 *                            match the .claude/agents/*.md files bidirectionally;
 *                        (b) the verify_retries schema keys (work + start SKILL.md) must equal the
 *                            coordinator.md retry_counts keys — a category tracked in one place but
 *                            not the other is exactly the drift that broke the loop accounting;
 *                        (c) a doc line that enumerates part of the wave-1 roster without naming
 *                            (nearly) all of it — or pointing at verify/SKILL.md — is flagged
 *                            (warning) as a stale partial roster.
 *
 * Usage: pnpm rules:check   — exits 1 if any high-confidence violation.
 */
import { existsSync, promises as fsp } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const AGENTIC_DIR = path.join(REPO_ROOT, '.agentic');

const PKG_BASES: Record<string, string[]> = {
  backend: ['backend'],
  frontend: ['frontend'],
  mobile: ['mobile/expo-boilerplate', 'mobile'],
  iaac: ['iaac', 'iaac/terragrunt'],
};
const ALL_BASES = [...new Set(Object.values(PKG_BASES).flat())];
const PKG_JSON: Record<string, string[]> = {
  backend: ['backend/package.json'],
  frontend: ['frontend/package.json'],
  mobile: ['mobile/expo-boilerplate/package.json'],
  iaac: [],
};
const ALL_PKG_JSON = ['package.json', '.agentic/scripts/package.json', ...Object.values(PKG_JSON).flat()];

// Only verify references that end in a real file extension — keeps false positives near zero.
const EXT_RE =
  /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|mdx|css|scss|html|yml|yaml|hcl|tf|tfvars|sh|graphql|gql|sql|svg|png|jpg|webp|toml|xml|plist|gradle|kt|swift)$/;
const PNPM_BUILTINS = new Set([
  'install', 'i', 'add', 'remove', 'rm', 'run', 'exec', 'dlx', 'create', 'init', 'why', 'list', 'ls',
  'outdated', 'update', 'up', 'audit', 'link', 'unlink', 'import', 'prune', 'rebuild', 'store', 'config',
  'setup', 'env', 'patch', 'licenses', 'root', 'bin', 'pack', 'publish', 'fetch', 'deploy', 'dedupe',
]);
const RUNTIME_PREFIXES = ['figma/', '.agentic/plans/']; // generated per-ticket at run time, never committed

type Finding = { file: string; line: number; claim: string; why: string };
const errors: Finding[] = [];
const warnings: Finding[] = [];
const skipped: Finding[] = [];
const seen = new Set<string>();
const scriptNames = new Map<string, Set<string>>(); // package.json rel path → script names

function record(list: Finding[], f: Finding) {
  const key = `${list === skipped ? 's' : 'f'}:${f.file}:${f.line}:${f.claim}`;
  if (!seen.has(key)) { seen.add(key); list.push(f); }
}

let repoFiles: string[] = []; // every committed-ish file path, repo-root-relative

async function main() {
  for (const rel of ALL_PKG_JSON) {
    const abs = path.join(REPO_ROOT, rel);
    if (!existsSync(abs)) continue;
    const pkg = JSON.parse(await fsp.readFile(abs, 'utf8'));
    scriptNames.set(rel, new Set(Object.keys(pkg.scripts ?? {})));
  }

  repoFiles = await listFiles(REPO_ROOT);
  const files = (await listFiles(AGENTIC_DIR)).filter(
    (f) => f.endsWith('.md') && (f.startsWith('rules/') || f.startsWith('packages/')),
  );
  for (const rel of files.sort()) await checkFile(rel);

  await checkWorkflowDocs();

  report();
  process.exit(errors.length > 0 ? 1 : 0);
}

// ── 4. workflow-doc consistency ───────────────────────────────────────────────

async function checkWorkflowDocs() {
  const read = async (rel: string) => {
    const abs = path.join(REPO_ROOT, rel);
    return existsSync(abs) ? await fsp.readFile(abs, 'utf8') : null;
  };

  // (a) roster: verify/SKILL.md model-strategy table ↔ .claude/agents/*.md files
  const verifySkillRel = '.claude/skills/verify/SKILL.md';
  const verifySkill = await read(verifySkillRel);
  const tableAgents = new Set<string>();
  if (verifySkill) {
    // tolerate the table being the LAST section (no following heading) and CRLF
    const section = verifySkill.replace(/\r\n/g, '\n').match(/## Model strategy\n([\s\S]*?)(\n## |$)/)?.[1] ?? '';
    if (!section) record(errors, { file: verifySkillRel, line: 0, claim: '## Model strategy', why: 'could not locate the Model strategy section — the roster source of truth is unparseable' });
    // tolerate formatter-padded cells (any whitespace around the backticked name)
    for (const m of section.matchAll(/^\|\s*`([a-z][a-z-]+)`(?:\s*\(if needed\))?\s*\|/gm)) tableAgents.add(m[1] ?? '');
    tableAgents.delete('');
  }
  const agentFiles = (await fsp.readdir(path.join(REPO_ROOT, '.claude/agents'))).filter((f) => f.endsWith('.md'));
  const verifyPhaseAgents = agentFiles
    .map((f) => f.replace(/\.md$/, ''))
    .filter((n) => n.endsWith('-verifier') || n === 'coordinator' || n === 'security-deep-review');
  for (const name of tableAgents) {
    if (!agentFiles.includes(`${name}.md`)) {
      record(errors, { file: verifySkillRel, line: 0, claim: name, why: `model-strategy table lists "${name}" but .claude/agents/${name}.md does not exist` });
    }
  }
  for (const name of verifyPhaseAgents) {
    if (!tableAgents.has(name)) {
      record(errors, { file: verifySkillRel, line: 0, claim: name, why: `.claude/agents/${name}.md exists but is missing from the model-strategy table (the roster's source of truth)` });
    }
  }

  // (b) retry keys: verify_retries (work, start) === retry_counts (coordinator)
  const keySet = (src: string | null, field: string): Set<string> | null => {
    const m = src?.match(new RegExp(`"${field}":\\s*\\{([^}]*)\\}`));
    if (!m) return null;
    // [\w-] so a hyphenated category can't silently vanish from every set at once
    return new Set([...(m[1] ?? '').matchAll(/"([\w-]+)":/g)].map((k) => k[1] ?? ''));
  };
  const retrySources: Array<[string, string]> = [
    ['.claude/skills/work/SKILL.md', 'verify_retries'],
    ['.claude/skills/start/SKILL.md', 'verify_retries'],
    ['.claude/agents/coordinator.md', 'retry_counts'],
  ];
  const retrySets: Array<[string, Set<string>]> = [];
  for (const [rel, field] of retrySources) {
    const set = keySet(await read(rel), field);
    if (set) retrySets.push([rel, set]);
    else record(warnings, { file: rel, line: 0, claim: field, why: `could not locate a "${field}" schema block to compare` });
  }
  const [base, ...others] = retrySets;
  if (base) {
    for (const [rel, set] of others) {
      for (const k of base[1]) if (!set.has(k)) record(errors, { file: rel, line: 0, claim: k, why: `retry category "${k}" is in ${base[0]} but missing here — loop accounting will silently drop it` });
      for (const k of set) if (!base[1].has(k)) record(errors, { file: base[0], line: 0, claim: k, why: `retry category "${k}" is in ${rel} but missing here — loop accounting will silently drop it` });
    }
  }

  // (c) partial-roster enumerations in the narrative docs
  const wave1 = [...tableAgents]
    .filter((n) => n.endsWith('-verifier'))
    .map((n) => n.replace(/-verifier$/, ''))
    .filter((n) => n !== 'design-parity'); // wave 2
  // match both the bare name ("qa") and the suffixed agent name ("qa-verifier")
  const nameRe = (n: string) => new RegExp(`(^|[^\\w-])${n}(-verifier)?([^\\w-]|$)`);
  const narrativeDocs = ['.claude/ONBOARDING.md', '.claude/skills/using-workflow/SKILL.md', '.claude/skills/work/SKILL.md', '.claude/skills/handoff/SKILL.md'];
  for (const rel of narrativeDocs) {
    const src = await read(rel);
    if (!src) continue;
    let inFence = false;
    src.split('\n').forEach((line, i) => {
      if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return; }
      if (inFence) return; // code blocks list report paths / example output, not roster claims
      const named = wave1.filter((n) => nameRe(n).test(line));
      const enumerating = named.length >= 2 && /verif|subagent|parallel|wave/i.test(line);
      // missing exactly ONE verifier is the most common drift — only ALL named (or a pointer) passes
      const complete = named.length >= wave1.length || /verify\/SKILL\.md/.test(line);
      if (enumerating && !complete) {
        record(warnings, { file: rel, line: i + 1, claim: named.join(', '), why: `names ${named.length}/${wave1.length} wave-1 verifiers — stale partial roster? Name them all or point at verify/SKILL.md` });
      }
    });
  }
}

async function checkFile(rel: string) {
  const display = path.join('.agentic', rel);
  const parts = rel.split('/');
  const category = (parts[0] === 'rules' ? parts[1] : path.basename(rel, '.md')) ?? ''; // packages/backend.md → backend
  const raw = await fsp.readFile(path.join(AGENTIC_DIR, rel), 'utf8');
  const lines = raw.split('\n');

  // ── 3. globs ──
  const fm = matter(raw).data as { globs?: string[] | string };
  const globs = typeof fm.globs === 'string' ? [fm.globs] : (fm.globs ?? []);
  const globsLine = lines.findIndex((l) => l.startsWith('globs:')) + 1;
  // A glob matching nothing TODAY is usually a forward declaration (it attaches when an
  // agent CREATES the first matching file, e.g. features/** before any feature exists) —
  // warning, not error. The genuine-drift case (glob points at the WRONG dir while the
  // real files live elsewhere) still surfaces through the body's path-claim checks.
  for (const g of globs) {
    if (!(await globHasMatch(g))) {
      record(warnings, { file: display, line: globsLine, claim: `globs: ${g}`, why: 'glob matches no existing file today — fine if forward-declared; verify it is not pointing at a renamed/moved dir' });
    }
  }

  // ── body scan ──
  let inFence = false;
  let fmEnd = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  for (let i = 0; i < lines.length; i++) {
    if (i <= fmEnd) continue;
    const line = lines[i] ?? '';
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    const ln = i + 1;
    if (inFence) {
      // file-header comments (`// src/x.ts`) — WARNING level: often illustrative pattern examples
      const header = line.match(/^\s*(?:\/\/|#)\s*(\S+)\s*$/);
      if (header?.[1]) checkPath(header[1], category, display, ln, warnings);
      // command lines: must start the statement (after optional `$`, `cd x &&`, `mise exec --`)
      for (const part of line.split('&&')) {
        const cmd = part.trim().replace(/^\$\s*/, '').replace(/^mise exec --\s*/, '');
        if (/^(pnpm|npm)\b/.test(cmd)) checkScript(cmd, category, display, ln);
      }
    } else {
      // Prose path refs are mostly CONVENTION TARGETS ("schemas live in features/<x>/schemas/")
      // that only exist once foundation tasks build them — those are warnings.
      // A line that explicitly claims CURRENT truth — "(THIS repo)" tag or "the real <path>" —
      // asserts existence NOW, so a miss there is a high-confidence error.
      // Only spans AFTER a "(THIS repo)" / "the real" marker assert CURRENT truth —
      // a convention-target path earlier on the same line is aspirational (warning).
      const marker = line.match(/\(THIS repo\)|the real `/i);
      const markerIdx = marker?.index ?? Number.POSITIVE_INFINITY;
      for (const m of line.matchAll(/`([^`\n]+)`/g)) {
        const span = (m[1] ?? '').trim();
        if (/^(?:mise exec --\s+)?(pnpm|npm)\s/.test(span)) checkScript(span.replace(/^mise exec --\s*/, ''), category, display, ln);
        else checkPath(span, category, display, ln, (m.index ?? 0) > markerIdx ? errors : warnings);
      }
    }
  }
}

function checkPath(claim: string, category: string, file: string, line: number, level: Finding[]) {
  let p = claim.replace(/^\.\//, '');
  if (!/^[\w@./()[\]<>*-]+$/.test(p) || !p.includes('/') || !EXT_RE.test(p)) return; // not a checkable repo path
  if (/^https?:|^[a-z0-9-]+\.(com|dev|io|org|net|app)\//.test(p)) return; // URL
  if (/[*<>]|\.\.\./.test(p) || /PROJ-\d|TICKET/.test(p)) return record(skipped, { file, line, claim, why: 'placeholder/glob syntax — not a literal path claim' });
  if (/[[\]]/.test(p)) return record(skipped, { file, line, claim, why: 'bracket segment (dynamic-route pattern) — likely illustrative' });
  if (RUNTIME_PREFIXES.some((pre) => p.startsWith(pre))) return record(skipped, { file, line, claim, why: 'runtime-generated artifact path — not committed' });

  const bases = PKG_BASES[category] ?? ALL_BASES;
  let candidates: string[];
  if (p.startsWith('@/')) {
    const rest = p.slice(2);
    candidates = bases.flatMap((b) => [path.join(b, rest), path.join(b, 'src', rest)]);
    level = warnings; // alias resolution is heuristic
  } else {
    candidates = [p, ...bases.map((b) => path.join(b, p)), path.join('.agentic', p), path.join('.agentic/rules', p)];
  }
  if (candidates.some((c) => existsSync(path.join(REPO_ROOT, c)))) return;
  record(level, { file, line, claim, why: `path not found (tried repo root + ${bases.join(', ')})` });
}

function checkScript(cmd: string, category: string, file: string, line: number) {
  const tokens = cmd.split(/\s+/);
  const tool = tokens[0] ?? '';
  let script = tokens[1] ?? '';
  if (tool === 'npm') {
    if (script !== 'run') return; // npm install / npm ci / … — not a script claim
    script = tokens[2] ?? '';
  } else if (script === 'run') {
    script = tokens[2] ?? '';
  } else if (PNPM_BUILTINS.has(script)) return;
  if (!script || !/^[A-Za-z][\w:.-]*$/.test(script)) return;

  const pkgFiles = (PKG_JSON[category] ?? ALL_PKG_JSON).filter((f) => scriptNames.has(f));
  const claim = `${tool} ${tokens[1] === 'run' ? 'run ' : ''}${script}`;
  if (pkgFiles.length === 0) return record(skipped, { file, line, claim, why: `no package.json governs "${category}" — cannot validate script` });
  if (pkgFiles.some((f) => scriptNames.get(f)?.has(script))) return;
  const available = [...new Set(pkgFiles.flatMap((f) => [...(scriptNames.get(f) ?? [])]))];
  const stem = (s: string) => s.split(':')[0] ?? s;
  const near = available.filter((s) => s.includes(stem(script)) || script.includes(stem(s))).slice(0, 4);
  record(errors, {
    file, line, claim,
    why: `script "${script}" not in ${pkgFiles.join(' / ')}${near.length ? ` — did you mean: ${near.join(', ')}?` : ''}`,
  });
}

// Own walker + glob→regex: fs.glob's `**` skips dotfiles (false "dead glob" for `**/.env*`),
// while Cursor's matcher does load such rules — so match dotfiles like Cursor does.
async function listFiles(root: string, rel = ''): Promise<string[]> {
  const out: string[] = [];
  const entries = await fsp.readdir(path.join(root, rel), { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await listFiles(root, r)));
    else out.push(r);
  }
  return out;
}

function globToRegExp(glob: string): RegExp {
  const g = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials (keeps * ? /)
    .replace(/\*\*\//g, '\u0000') // `**/` spans zero-or-more dirs
    .replace(/\*\*/g, '\u0001') // bare `**` spans anything
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\u0000/g, '(?:.*/)?')
    .replace(/\u0001/g, '.*');
  return new RegExp(`^${g}$`);
}

async function globHasMatch(pattern: string): Promise<boolean> {
  const re = globToRegExp(pattern);
  return repoFiles.some((f) => re.test(f));
}

function report() {
  const section = (title: string, list: Finding[]) => {
    if (list.length === 0) return;
    console.log(`\n${title} (${list.length}):`);
    for (const f of list) console.log(`  ${f.file}:${f.line} → ${f.claim} → ${f.why}`);
  };
  console.log('RULES-TRUTH CHECK');
  section('ERRORS — high confidence: fix the rule or retag the literal as an illustration', errors);
  section('WARNINGS — ambiguous/illustrative context: review, no exit-code impact', warnings);
  section('SKIPPED — placeholders & runtime paths (not validated)', skipped);
  console.log(`\nSummary: ${errors.length} error(s), ${warnings.length} warning(s), ${skipped.length} skipped.`);
  if (errors.length === 0) console.log('Rules are truth-consistent with the repo.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
