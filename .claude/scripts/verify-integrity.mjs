#!/usr/bin/env node
// Deterministic integrity gate for the verify pipeline.
//
// The canary/evidence protocol says the mechanical re-checks are "the teeth" —
// so they run here, as code, not as prose instructions to an LLM. The
// coordinator still owns everything that needs judgment (count cross-checks
// against file contents, internal contradictions, severity, routing); this
// script owns what a script can check, and the coordinator is not dispatched
// until it exits 0 (or the driver escalates the recorded failure).
//
// Usage:
//   node .claude/scripts/verify-integrity.mjs reports <verify-dir> --canary <CANARY-...> \
//        [--expect qa,code-review,...] [--carried qa,...]
//   node .claude/scripts/verify-integrity.mjs coordinator <verify-dir> --canary <CANARY-...>
//   node .claude/scripts/verify-integrity.mjs shas <sha> [<sha>...]
//
// reports:     validate every expected verifier report (parse + status + canary
//              echo + non-empty evidence block with at least one commit-SHA
//              claim), `git cat-file -e <sha>^{commit}` every claimed SHA,
//              stat every claimed artifact path. Writes <verify-dir>/integrity.json.
//              --carried lists reports carried forward from a prior pass (they
//              hold the PRIOR pass's canary, so the canary check is skipped —
//              everything else still runs). A security-deep.json whose canary
//              is from a prior pass is treated as carried automatically (it is
//              conditional, so re-verify passes won't re-produce it).
// coordinator: validate coordinator.json (parse + decision enum + canary +
//              retry-count keys + routing/escalation consistency). Appends its
//              result to <verify-dir>/integrity.json.
// shas:        each argument must LOOK like a commit SHA (7-40 hex chars — a
//              ref name or "HEAD" is not evidence) AND resolve to an existing
//              commit object. The driver's re-check for non-verify sub-skill
//              returns (/implement, /handoff).
//
// FAIL CLOSED: a SHA-shaped claim that is malformed is a failure, not a skip —
// otherwise a fabricated "HEAD"/"ABC..." would sail through the very gate that
// exists to catch fabrication.
//
// Exit codes: 0 = all checks passed, 1 = failures (see stdout JSON), 2 = usage.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const DEFAULT_ROSTER = ['qa', 'code-review', 'security', 'build-check', 'runtime-smoke', 'design-parity'];
const VALID_STATUS = ['pass', 'fixable', 'blocked', 'inconclusive', 'skipped', 'not-applicable'];
const VALID_DECISIONS = ['PASS', 'LOOP', 'ESCALATE'];
const KNOWN_RETRY_KEYS = [
  'test_failure', 'type_error', 'security_finding', 'ac_unmet', 'convention_violation',
  'design_parity', 'build_failure', 'runtime_failure', 'process_gap',
];
const SHA_RE = /^[0-9a-f]{7,40}$/i;
// a key whose last segment carries one of these tokens is claiming a commit SHA
const SHA_KEY_TOKENS = new Set(['sha', 'shas', 'commit', 'commits']);

const failures = [];
const warnings = [];
const fail = (report, check, detail) => failures.push({ report, check, detail });
const warn = (report, check, detail) => warnings.push({ report, check, detail });

// existence of a COMMIT object — ^{commit} peels/rejects trees, blobs, and
// (combined with SHA_RE) refuses ref names outright
function commitExists(sha) {
  try {
    execFileSync('git', ['-C', REPO_ROOT, 'cat-file', '-e', `${sha}^{commit}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

const isShaKey = (key) => (key.split('_').some((t) => SHA_KEY_TOKENS.has(t.toLowerCase())));

// Walk the evidence block; mechanically re-check every claim a script can check.
// SHA claims live under keys whose last segment mentions sha/commit; artifact
// paths under keys mentioning artifact/path/screenshot (strings with a "/"
// that aren't URLs). Returns the number of VALID sha claims seen.
function recheckEvidence(report, evidence, verifyDir) {
  let shaClaims = 0;
  const visit = (node, lastKey, hint) => {
    if (node == null) return;
    if (typeof node === 'string') {
      const value = node.trim();
      if (isShaKey(lastKey) && !/\s/.test(value) && value.length <= 64) {
        // a single-token value under a sha/commit key IS a SHA claim — judge it
        if (!SHA_RE.test(value)) {
          fail(report, 'sha_malformed', `"${lastKey}": "${value}" is not a commit SHA (7-40 hex chars) — refs/HEAD/prose are not evidence`);
        } else if (!commitExists(value)) {
          fail(report, 'sha_not_found', `claimed commit ${value} does not resolve to an existing commit (git cat-file -e <sha>^{commit})`);
        } else {
          shaClaims++;
        }
      } else if (/artifact|path|screenshot|recording|video/i.test(hint) && value.includes('/') && !/^[a-z]+:\/\//.test(value)) {
        const abs = path.isAbsolute(value) ? value : path.join(REPO_ROOT, value);
        // tolerate paths given relative to the verify dir itself
        if (!existsSync(abs) && !existsSync(path.join(verifyDir, value))) {
          fail(report, 'artifact_missing', `claimed artifact ${value} not found on disk`);
        }
      }
      return;
    }
    if (Array.isArray(node)) return node.forEach((v) => visit(v, lastKey, hint));
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) visit(v, k, `${hint}.${k}`);
    }
  };
  visit(evidence, 'evidence', 'evidence');
  return shaClaims;
}

function checkOneReport(name, verifyDir, canary, { skipCanary = false, staleCanaryIsWarning = false } = {}) {
  const file = path.join(verifyDir, `${name}.json`);
  const report = readJson(file);
  if (report === null) {
    // absent or unparseable = inconclusive, never pass (coordinator.md)
    fail(name, 'missing_report', existsSync(file) ? 'report exists but is not valid JSON' : 'expected report is absent');
    return;
  }
  if (typeof report.status !== 'string' || !VALID_STATUS.includes(report.status)) {
    fail(name, 'invalid_status', `status is ${JSON.stringify(report.status)} — expected one of ${VALID_STATUS.join('|')}`);
  }
  if (!skipCanary && report.canary !== canary) {
    if (staleCanaryIsWarning) {
      warn(name, 'stale_canary_carried', `canary ${JSON.stringify(report.canary)} is from a prior pass — treated as carried-forward (conditional report)`);
    } else {
      fail(name, 'canary_mismatch', `report canary ${JSON.stringify(report.canary)} ≠ this pass's ${canary} (stale or fabricated return)`);
    }
  }
  if (report.evidence == null || typeof report.evidence !== 'object' || Array.isArray(report.evidence) || Object.keys(report.evidence).length === 0) {
    fail(name, 'missing_evidence', 'no non-empty machine-checkable `evidence` object in the report');
    return;
  }
  if (report.evidence.lsp == null) {
    warn(name, 'no_lsp_block', 'evidence has no lsp {calls, usedFor} — coordinator judges whether that is legitimate');
  }
  const shaClaims = recheckEvidence(name, report.evidence, verifyDir);
  if (shaClaims === 0 && !failures.some((f) => f.report === name && (f.check === 'sha_malformed' || f.check === 'sha_not_found'))) {
    fail(name, 'no_sha_claim', 'evidence contains no valid commit-SHA claim — the protocol requires the commit the verifier ran against');
  }
}

function checkReports(verifyDir, canary, expect, carried) {
  for (const name of expect) {
    checkOneReport(name, verifyDir, canary, { skipCanary: carried.includes(name) });
  }
  // security-deep is conditional — validate it whenever it exists; a prior-pass
  // canary on it means it was produced by an earlier pass (carried), not fabricated
  if (existsSync(path.join(verifyDir, 'security-deep.json')) && !expect.includes('security-deep')) {
    checkOneReport('security-deep', verifyDir, canary, {
      skipCanary: carried.includes('security-deep'),
      staleCanaryIsWarning: true,
    });
  }
}

function checkCoordinator(verifyDir, canary) {
  const report = readJson(path.join(verifyDir, 'coordinator.json'));
  if (report === null) return fail('coordinator', 'missing_report', 'coordinator.json absent or unparseable');
  if (!VALID_DECISIONS.includes(report.decision)) {
    fail('coordinator', 'invalid_decision', `decision is ${JSON.stringify(report.decision)} — expected PASS|LOOP|ESCALATE`);
  }
  if (report.canary !== canary) {
    fail('coordinator', 'canary_mismatch', `coordinator canary ${JSON.stringify(report.canary)} ≠ this pass's ${canary}`);
  }
  for (const key of Object.keys(report.retry_counts ?? {})) {
    if (!KNOWN_RETRY_KEYS.includes(key)) {
      fail('coordinator', 'unknown_retry_key', `retry_counts.${key} is not a state verify_retries category (${KNOWN_RETRY_KEYS.join(', ')})`);
    }
  }
  if (report.evidence_recheck == null) {
    fail('coordinator', 'missing_evidence_recheck', 'no evidence_recheck block — the coordinator must record its judgment checks');
  }
  if (report.decision === 'LOOP' && !(Array.isArray(report.fix_routing) && report.fix_routing.length > 0)) {
    fail('coordinator', 'loop_without_routing', 'decision is LOOP but fix_routing is empty — nothing for /implement fix-mode to apply');
  }
  if (report.decision === 'ESCALATE' && !report.escalation_reason) {
    fail('coordinator', 'escalate_without_reason', 'decision is ESCALATE but escalation_reason is empty');
  }
}

function writeResult(verifyDir, mode, canary) {
  const file = path.join(verifyDir, 'integrity.json');
  const prior = readJson(file) ?? {};
  const result = {
    ...prior,
    [mode]: { ok: failures.length === 0, canary, checked_at: new Date().toISOString(), failures, warnings },
  };
  writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
  return result[mode];
}

// ─── main ────────────────────────────────────────────────────────────────────

const [mode, ...rest] = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[i + 1] ?? '', i++;
  else positional.push(rest[i]);
}

if (mode === 'shas') {
  if (positional.length === 0) {
    console.error('usage: verify-integrity.mjs shas <sha> [<sha>...]');
    process.exit(2);
  }
  for (const sha of positional) {
    if (!SHA_RE.test(sha)) {
      fail('shas', 'sha_malformed', `"${sha}" is not a commit SHA (7-40 hex chars) — refs/HEAD/branch names are not evidence`);
    } else if (!commitExists(sha)) {
      fail('shas', 'sha_not_found', `claimed commit ${sha} does not resolve to an existing commit (git cat-file -e <sha>^{commit})`);
    }
  }
  console.log(JSON.stringify({ ok: failures.length === 0, failures }, null, 2));
  process.exit(failures.length === 0 ? 0 : 1);
}

if ((mode !== 'reports' && mode !== 'coordinator') || positional.length !== 1 || !flags.canary) {
  console.error('usage: verify-integrity.mjs reports|coordinator <verify-dir> --canary <token> [--expect a,b] [--carried a,b]');
  process.exit(2);
}

const verifyDir = path.resolve(positional[0]);
if (!existsSync(verifyDir)) {
  console.error(`verify dir not found: ${verifyDir}`);
  process.exit(2);
}

const splitList = (raw) => (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean);

if (mode === 'reports') {
  const expect = 'expect' in flags ? splitList(flags.expect) : DEFAULT_ROSTER;
  if (expect.length === 0) {
    console.error('--expect resolved to an EMPTY roster — refusing a vacuous pass');
    process.exit(2);
  }
  checkReports(verifyDir, flags.canary, expect, splitList(flags.carried));
} else {
  checkCoordinator(verifyDir, flags.canary);
}

const result = writeResult(verifyDir, mode, flags.canary);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
