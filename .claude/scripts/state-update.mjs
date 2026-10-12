#!/usr/bin/env node
// Locked, atomic mutations for .claude/state/<TICKET>.json.
//
// Why this exists: the /work driver and the post-tool-use hook both write the
// state file. A driver that holds state in memory across a dispatch and writes
// it back whole will clobber whatever the hook appended in between. So NOBODY
// does read-modify-write on the file directly — every mutation goes through
// this script, which takes a lock, re-reads fresh, mutates, and renames a tmp
// file into place.
//
// Usage:
//   node .claude/scripts/state-update.mjs <state-file> get [<dot.path>]
//   node .claude/scripts/state-update.mjs <state-file> set <dot.path>=<value> [...]
//   node .claude/scripts/state-update.mjs <state-file> incr <dot.path> [...]
//   node .claude/scripts/state-update.mjs <state-file> append-history --summary "<text>" \
//        [--phase <p>] [--tokens <n>] [--est-cost <x>]
//
// set:            value parses as JSON when it can (numbers, true/false/null,
//                 quoted strings, objects); otherwise it's taken as a string.
//                 Touches updated_at.
// incr:           +1 on each path (missing paths start at 0). Touches updated_at.
// append-history: appends { phase, ts, duration_s, summary } — phase defaults to
//                 the CURRENT state.phase; ts is now; duration_s is computed from
//                 the previous history entry's ts (or created_at for the first
//                 entry; omitted when no parseable predecessor exists), so
//                 per-phase duration telemetry accrues automatically.
//                 --tokens/--est-cost are recorded when given (must be numeric),
//                 never estimated by this script.
//
// All argument validation happens BEFORE the lock is taken, and every failure
// path releases the lock (errors are thrown, not exited, inside the locked
// region) — a crashed invocation must never leave the state file unlockable.
//
// Exit codes: 0 ok, 1 lock timeout / invalid state JSON / bad mutation path, 2 usage.

import { mkdirSync, rmdirSync, renameSync, statSync, readFileSync, writeFileSync } from 'node:fs';

const LOCK_STALE_MS = 10_000;
const LOCK_WAIT_MS = 100;
const LOCK_RETRIES = 150; // 15s budget — MUST exceed LOCK_STALE_MS so a waiter outlives a stale lock

const [stateFile, op, ...rest] = process.argv.slice(2);

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage: state-update.mjs <state-file> get|set|incr|append-history [...]');
  process.exit(2);
}

const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);
function checkPathSegments(dotted) {
  const segments = dotted.split('.');
  if (segments.some((s) => s === '' || FORBIDDEN_SEGMENTS.has(s))) {
    usage(`invalid path "${dotted}" — empty or reserved segment`);
  }
  return dotted;
}

const parseValue = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // bare string
  }
};

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--') || i + 1 >= args.length || args[i + 1].startsWith('--')) {
      usage(`flag ${args[i]} needs a value`);
    }
    flags[args[i].slice(2)] = args[i + 1];
    i++;
  }
  return flags;
}

// ─── validate arguments BEFORE locking ───────────────────────────────────────

if (!stateFile || !op) usage();

let mutation; // (state, nowIso) => void
if (op === 'get') {
  // read-only, no lock needed
} else if (op === 'set') {
  if (rest.length === 0) usage('set needs at least one <dot.path>=<value>');
  const pairs = rest.map((pair) => {
    const eq = pair.indexOf('=');
    if (eq < 1) usage(`not a <dot.path>=<value> pair: "${pair}"`);
    return [checkPathSegments(pair.slice(0, eq)), parseValue(pair.slice(eq + 1))];
  });
  mutation = (state) => {
    for (const [dotted, value] of pairs) setPath(state, dotted, value);
  };
} else if (op === 'incr') {
  if (rest.length === 0) usage('incr needs at least one <dot.path>');
  rest.forEach(checkPathSegments);
  mutation = (state) => {
    for (const dotted of rest) {
      const current = getPath(state, dotted);
      setPath(state, dotted, (typeof current === 'number' ? current : 0) + 1);
    }
  };
} else if (op === 'append-history') {
  const flags = parseFlags(rest);
  if (!flags.summary) usage('append-history needs --summary');
  for (const numeric of ['tokens', 'est-cost']) {
    if (numeric in flags && !Number.isFinite(Number(flags[numeric]))) {
      usage(`--${numeric} must be numeric, got "${flags[numeric]}"`);
    }
  }
  mutation = (state, now) => {
    state.history ??= [];
    // created_at anchors only the FIRST entry; a later entry lacking ts gives
    // no usable predecessor (falling back to created_at would inflate wildly)
    const prevTs = state.history.length > 0 ? state.history.at(-1).ts : state.created_at;
    const prevMs = prevTs ? Date.parse(prevTs) : NaN;
    const entry = {
      phase: flags.phase || state.phase,
      ts: now,
      ...(Number.isFinite(prevMs) ? { duration_s: Math.max(0, Math.round((Date.parse(now) - prevMs) / 1000)) } : {}),
      summary: flags.summary,
    };
    if ('tokens' in flags) entry.tokens = Number(flags.tokens);
    if ('est-cost' in flags) entry.est_cost = Number(flags['est-cost']);
    state.history.push(entry);
  };
} else {
  usage(`unknown op "${op}"`);
}

// ─── state I/O (throw, never exit, so the lock always releases) ─────────────

function readState() {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch (err) {
    throw new Error(`state file unreadable or invalid JSON: ${stateFile} (${err.message})`);
  }
}

function writeState(state) {
  const tmp = `${stateFile}.tmp.${process.pid}`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(tmp, stateFile);
}

const getPath = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setPath(obj, dotted, value) {
  const keys = dotted.split('.');
  const last = keys.pop();
  let node = obj;
  for (const k of keys) {
    if (node[k] == null) node[k] = {};
    else if (typeof node[k] !== 'object' || Array.isArray(node[k])) {
      throw new Error(`cannot set "${dotted}" — "${k}" is not an object`);
    }
    node = node[k];
  }
  node[last] = value;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withLock(fn) {
  const lockDir = `${stateFile}.lock`;
  for (let i = 0; i < LOCK_RETRIES; i++) {
    try {
      mkdirSync(lockDir); // atomic on POSIX — only one holder
      try {
        return fn();
      } finally {
        try { rmdirSync(lockDir); } catch {}
      }
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // steal locks abandoned by a crashed holder — rename first (atomic), so
      // two stealers can't both "win": the loser's rename throws ENOENT.
      try {
        if (Date.now() - statSync(lockDir).mtimeMs > LOCK_STALE_MS) {
          const grave = `${lockDir}.stale.${process.pid}`;
          renameSync(lockDir, grave);
          try { rmdirSync(grave); } catch {}
        }
      } catch {}
      await sleep(LOCK_WAIT_MS);
    }
  }
  throw new Error(`could not acquire ${lockDir} after ${(LOCK_RETRIES * LOCK_WAIT_MS) / 1000}s`);
}

// ─── main ────────────────────────────────────────────────────────────────────

try {
  if (op === 'get') {
    const state = readState();
    const value = rest[0] ? getPath(state, checkPathSegments(rest[0])) : state;
    console.log(JSON.stringify(value, null, 2));
  } else {
    await withLock(() => {
      const state = readState();
      const now = new Date().toISOString();
      mutation(state, now);
      state.updated_at = now;
      writeState(state);
      console.log(JSON.stringify({ ok: true, op, updated_at: now }));
    });
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
