#!/usr/bin/env node
// Run-report generator — builds a self-contained, backend-free HTML report for one ticket:
// the plan/exploration/handoff docs, the verify reports as status cards, and the evidence
// (journey recordings + screenshots) grouped by the scenario that produced them, with a
// click-to-open modal viewer. This file IS the report template — its <style>/<script> and
// section layout define how every ticket report looks; edit here to restyle all reports.
//
// Reads:  <root>/.agentic/plans/<TICKET>/  +  <root>/.claude/state/<TICKET>.json
// Writes: <root>/.agentic/dashboard/<TICKET>.html   (dir is gitignored; media linked in place)
//
// Usage:  pnpm --dir .agentic/scripts report <TICKET>        (from repo root)
//         node .agentic/scripts/gen-report.mjs <TICKET> [repoRoot]
import { readFileSync, existsSync, readdirSync, writeFileSync, statSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, relative, basename, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const TICKET = process.argv[2];
if (!TICKET) { console.error('Usage: node gen-report.mjs <TICKET> [repoRoot]'); process.exit(2); }
// Repo root defaults to two levels up from this script (.agentic/scripts/ -> repo root).
const ROOT = process.argv[3] || resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = join(ROOT, '.agentic/dashboard');
const OUT_FILE = join(OUT_DIR, `${TICKET}.html`);
const ASSET_DIR = join(OUT_DIR, `${TICKET}.assets`); // media copied here so the report survives recordings cleanup
const PLAN_DIR = join(ROOT, '.agentic/plans', TICKET);
const STATE_FILE = join(ROOT, '.claude/state', `${TICKET}.json`);

marked.setOptions({ gfm: true, breaks: false });

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const readJSON = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const readText = (p) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
const rel = (p) => relative(OUT_DIR, p); // link target relative to the html file
// Copy a media file into the ticket's asset dir and return its href relative to the HTML, so the
// report stays self-contained after handoff deletes the gitignored verify/recordings/ originals.
function assetHref(srcPath) {
  const relFromPlan = relative(PLAN_DIR, srcPath);
  const dest = join(ASSET_DIR, relFromPlan);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(srcPath, dest);
  return relative(OUT_DIR, dest);
}
const human = (n) => { if (n == null) return ''; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`; };
const fmtDate = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? String(s) : d.toISOString().slice(0, 16).replace('T', ' ') + 'Z'; };

// pick a status-ish value + normalize to a css class
function statusOf(obj) {
  if (!obj) return null;
  const raw = obj.decision ?? obj.status ?? obj.severity ?? obj.verdict ?? (obj.reports?.ok === true ? 'pass' : obj.reports?.ok === false ? 'fail' : null);
  return raw ? String(raw) : null;
}
function statusClass(s) {
  const v = String(s || '').toLowerCase();
  if (['pass', 'passed', 'ok', 'green', 'done'].some((x) => v.includes(x))) return 'ok';
  if (['not-applicable', 'not_applicable', 'n/a', 'skipped', 'info', 'review-ready'].some((x) => v.includes(x))) return 'na';
  if (['escalate', 'fail', 'failed', 'error', 'critical', 'blocked', 'human_blocker'].some((x) => v.includes(x))) return 'bad';
  if (['loop', 'fixable', 'warn', 'pending', 'planning', 'implementing', 'verifying'].some((x) => v.includes(x))) return 'warn';
  return 'na';
}
const badge = (text, cls) => `<span class="badge ${cls || statusClass(text)}">${esc(text)}</span>`;

function details(summaryHtml, bodyHtml, open = false) {
  return `<details${open ? ' open' : ''}><summary>${summaryHtml}</summary><div class="det-body">${bodyHtml}</div></details>`;
}
function jsonBlock(obj) {
  return `<pre class="json">${esc(JSON.stringify(obj, null, 2))}</pre>`;
}

// ---------- load ----------
if (!existsSync(PLAN_DIR)) { console.error(`No plan dir: ${PLAN_DIR}`); process.exit(1); }
const state = readJSON(STATE_FILE) || {};
const raw = readJSON(join(PLAN_DIR, 'raw.json')) || {};

// Jira base URL — read JIRA_BASE_URL from .claude/.env (that key only; never touch the PAT), fallback to the repo default.
function jiraBaseUrl() {
  const env = readText(join(ROOT, '.claude/.env')) || '';
  const m = env.match(/^JIRA_BASE_URL\s*=\s*(.+)$/m);
  return (m ? m[1] : 'https://tracker.geniusee.tk').trim().replace(/\/+$/, '');
}
const JIRA_URL = `${jiraBaseUrl()}/browse/${TICKET}`;
const jiraSummary = raw.summary || raw.fields?.summary || '';
const jiraStatus = raw.status || raw.fields?.status?.name || '';
const jiraType = raw.issueType || raw.fields?.issuetype?.name || state.ticket_type || '';

// markdown docs (ordered, friendly labels)
const DOC_ORDER = [
  ['plan.md', 'Plan'], ['root-cause.md', 'Root cause'], ['exploration.md', 'Exploration'],
  ['plan-review.md', 'Plan review'], ['handoff.md', 'Handoff'], ['plan.v1.md', 'Plan (v1)'],
];
const presentMd = readdirSync(PLAN_DIR).filter((f) => extname(f) === '.md');
const docs = [];
for (const [file, label] of DOC_ORDER) if (presentMd.includes(file)) docs.push({ file, label });
for (const f of presentMd) if (!docs.find((d) => d.file === f)) docs.push({ file: f, label: f.replace(/\.md$/, '') });

// verify reports (ordered)
const VERIFY_DIR = join(PLAN_DIR, 'verify');
const REPORT_ORDER = ['coordinator', 'qa', 'code-review', 'security', 'build-check', 'runtime-smoke', 'design-parity', 'integrity'];
const reports = [];
if (existsSync(VERIFY_DIR)) {
  const jsons = readdirSync(VERIFY_DIR).filter((f) => extname(f) === '.json');
  const ordered = [...REPORT_ORDER.map((n) => `${n}.json`).filter((f) => jsons.includes(f)), ...jsons.filter((f) => !REPORT_ORDER.map((n) => `${n}.json`).includes(f))];
  for (const f of ordered) reports.push({ name: f.replace(/\.json$/, ''), data: readJSON(join(VERIFY_DIR, f)) });
}

// evidence media
const MEDIA = { video: ['.mp4', '.webm', '.mov'], image: ['.png', '.jpg', '.jpeg', '.gif', '.svg'] };
const MEDIA_EXT_RE = /\.(mp4|webm|mov|png|jpe?g|gif|svg)$/i;
function collectMedia(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) { out.push(...collectMedia(p)); continue; }
    const ext = extname(f).toLowerCase();
    const kind = MEDIA.video.includes(ext) ? 'video' : MEDIA.image.includes(ext) ? 'image' : 'file';
    out.push({ path: p, name: f, group: basename(dir), kind, size: st.size });
  }
  return out;
}
// ---- scenario metadata: which flow/report produced each media file (scanned from verify reports) ----
const CAPTION_KEYS = ['flow', 'scenario', 'label', 'caption', 'description', 'title', 'step', 'name', 'screen', 'route', 'ac'];
const THEME_KEYS = new Set(['light', 'dark', 'mobile', 'tablet', 'desktop']);
const fileMeta = {};       // basename -> { caption, note, source, duration, canary, ac }
const sourceScenario = {}; // report name -> { text, flows[] }
const pick = (obj, keys) => { for (const k of keys) if (typeof obj[k] === 'string' && obj[k].trim()) return obj[k]; return null; };

// Walk a report; caption each media path from its own object, falling back to the nearest
// captioned ancestor (so design-parity's screens[].screenshots.{light,dark} inherit the screen name).
function scanMedia(node, source, parentCap) {
  if (Array.isArray(node)) { for (const v of node) scanMedia(v, source, parentCap); return; }
  if (!node || typeof node !== 'object') return;
  const selfCap = pick(node, CAPTION_KEYS);
  const capForChildren = selfCap || parentCap;
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string' && MEDIA_EXT_RE.test(v)) {
      const bn = basename(v);
      const base = selfCap || parentCap;
      const cap = base ? (THEME_KEYS.has(k) ? `${base} · ${k}` : base) : (THEME_KEYS.has(k) ? k : null);
      const prev = fileMeta[bn];
      if (!prev || (!prev.caption && cap)) {
        fileMeta[bn] = {
          caption: cap || prev?.caption || null,
          note: (typeof node.note === 'string' ? node.note : null) || prev?.note || null,
          source: prev?.source || source,
          duration: node.duration_seconds ?? prev?.duration,
          canary: node.render_canary_visible ?? prev?.canary,
          ac: (typeof node.ac === 'string' ? node.ac : null) || prev?.ac || null,
        };
      } else if (prev && !prev.source) prev.source = source;
    }
  }
  for (const v of Object.values(node)) if (v && typeof v === 'object') scanMedia(v, source, capForChildren);
}
for (const { name, data } of reports) {
  if (!data) continue;
  scanMedia(data, name, null);
  const text = pick(data, ['scenario']) || data.summary || (typeof data.mode === 'string' ? data.mode : null);
  const flows = Array.isArray(data.maestro_flow?.flows_run) ? data.maestro_flow.flows_run : null;
  if (text || flows) sourceScenario[name] = { text, flows };
}

const media = collectMedia(VERIFY_DIR).filter((m) => m.kind !== 'file');
for (const m of media) m.meta = fileMeta[m.name] || null;

// ---------- render sections ----------
// Overview
function overviewHtml() {
  const facts = [
    ['Type', jiraType], ['Phase', badge(state.phase)], ['Verify', badge(state.verify_decision)],
    ['Branch', `<code>${esc(state.branch)}</code>`], ['Base', `<code>${esc(state.base_branch)}</code>`],
    ['DoR', state.dor_status], ['Figma', state.figma_status],
    ['Verify loops', state.iterations ? `${state.iterations.verify_loops} loops / ${state.iterations.fix_dispatches} fixes` : ''],
    ['Created', fmtDate(state.created_at)], ['Updated', fmtDate(state.updated_at)],
    ['MR', state.mr_url ? `<a href="${esc(state.mr_url)}" target="_blank">${esc(state.mr_url.replace(/^https?:\/\//, ''))}</a>` : ''],
  ].filter(([, v]) => v !== '' && v != null);
  const grid = `<div class="facts">${facts.map(([k, v]) => `<div class="fact"><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`).join('')}</div>`;

  let vf = '';
  if (state.verify_findings) {
    const f = state.verify_findings;
    vf = `<h3>Verify findings journey</h3><div class="callout ${statusClass(f.decision)}">
      <div class="callout-head">${badge(f.decision)} <span class="muted">at ${esc(f.at_ceiling || '')}</span></div>
      ${f.reason ? `<p><b>Reason:</b> ${esc(f.reason)}</p>` : ''}
      ${f.remediation ? `<p><b>Remediation:</b> ${esc(f.remediation)}</p>` : ''}
    </div><p class="muted">Final decision recorded on state: ${badge(state.verify_decision)}</p>`;
  }

  const hist = (state.history || []);
  const timeline = hist.length ? `<h3>History <span class="muted">(${hist.length} entries)</span></h3>` + details(
    '<b>Show timeline</b>',
    `<ol class="timeline">${hist.map((h) => `<li><span class="ts">${esc(fmtDate(h.ts))}</span> ${badge(h.phase)} ${h.duration_s != null ? `<span class="muted">${Math.round(h.duration_s)}s</span>` : ''}<div class="sum">${esc(h.summary || '')}</div></li>`).join('')}</ol>`,
    false,
  ) : '';

  // Ticket description is Jira wiki-markup, not Markdown — don't parse it (garbles). Link out, keep raw as plain text.
  const desc = raw.description || raw.parsed?.description || '';
  const descText = typeof desc === 'string' ? desc : JSON.stringify(desc, null, 2);
  const descHtml = descText.trim()
    ? details('<b>Ticket description</b> <span class="muted">(raw from Jira)</span>', `<pre class="json">${esc(descText)}</pre>`)
    : '';

  return grid + descHtml + vf + timeline;
}

// Docs
function docsHtml() {
  if (!docs.length) return '<p class="muted">No markdown docs.</p>';
  const tabs = docs.map((d, i) => `<button class="subtab${i === 0 ? ' active' : ''}" data-doc="doc-${i}">${esc(d.label)}</button>`).join('');
  const panes = docs.map((d, i) => {
    const md = readText(join(PLAN_DIR, d.file)) || '';
    return `<div class="subpane prose${i === 0 ? ' active' : ''}" id="doc-${i}">
      <div class="pane-meta"><code>${esc(d.file)}</code> · ${human(Buffer.byteLength(md))}</div>
      ${marked.parse(md)}</div>`;
  }).join('');
  return `<div class="subtabs">${tabs}</div>${panes}`;
}

// Verify
function reportCard({ name, data }) {
  if (!data) return `<div class="card"><div class="card-head">${esc(name)} ${badge('missing', 'bad')}</div></div>`;
  const st = statusOf(data);
  const summary = data.summary || (name === 'integrity' ? (data.reports?.ok ? 'Integrity gate OK' : 'Integrity gate issues') : '');
  let extra = '';

  if (name === 'coordinator') {
    const s = data.findings_by_severity || {};
    const sev = Object.entries(s).map(([k, v]) => `<span class="pill ${v ? statusClass(k) : 'na'}">${esc(k)}: ${v}</span>`).join(' ');
    const safety = data.safety_checks ? Object.entries(data.safety_checks).map(([k, v]) => `${esc(k)} ${badge(v)}`).join(' · ') : '';
    extra = `<div class="rowline">${sev}</div>
      ${safety ? `<div class="rowline"><b>Safety:</b> ${safety}${data.safety_skipped ? ' ' + badge('safety skipped', 'bad') : ''}</div>` : ''}
      ${data.iterations ? `<div class="rowline muted">loops ${data.iterations.verify_loops}/${data.iterations.max_verify_loops} · ${data.iterations.fix_dispatches} fix dispatches</div>` : ''}
      ${(data.blockers && data.blockers.length) ? `<div class="rowline">${badge(data.blockers.length + ' blockers', 'bad')}</div>` : ''}`;
  }
  if (name === 'qa' && Array.isArray(data.ac_coverage)) {
    extra += `<table class="ac"><thead><tr><th>AC</th><th>Status</th><th>Test</th></tr></thead><tbody>${data.ac_coverage.map((a) => `<tr><td>${esc(a.ac)}</td><td>${badge(a.status)}</td><td class="mono">${esc((a.test_name || '').split(',')[0].slice(0, 80))}${a.note ? `<div class="muted small">${esc(a.note.slice(0, 200))}</div>` : ''}</td></tr>`).join('')}</tbody></table>`;
    if (data.test_failures?.length) extra += `<div class="rowline"><b>Failures:</b> ${data.test_failures.map((t) => `${badge(t.severity)} <span class="mono">${esc(t.test)}</span>`).join('<br>')}</div>`;
  }
  if (name === 'build-check' && data.results) {
    for (const [pkg, res] of Object.entries(data.results)) {
      const checks = Object.entries(res).filter(([, v]) => v === 'pass' || v === 'fail').map(([k, v]) => `<span class="pill ${statusClass(v)}">${esc(k)}</span>`).join(' ');
      extra += `<div class="rowline"><b>${esc(pkg)}:</b> ${checks}</div>`;
    }
  }
  const findings = Array.isArray(data.findings) ? data.findings : [];
  if (findings.length) extra += `<div class="rowline">${badge(findings.length + ' findings', 'warn')}</div>` + `<ul>${findings.slice(0, 10).map((f) => `<li>${badge(f.severity || 'info')} ${esc(f.title || f.summary || JSON.stringify(f).slice(0, 120))}</li>`).join('')}</ul>`;

  return `<div class="card">
    <div class="card-head"><span class="rep-name">${esc(name)}</span> ${st ? badge(st) : ''}</div>
    ${summary ? `<p class="rep-sum">${esc(summary)}</p>` : ''}
    ${extra}
    ${details('<span class="muted">raw json</span>', jsonBlock(data))}
  </div>`;
}
function verifyHtml() {
  if (!reports.length) return '<p class="muted">No verify reports.</p>';
  return reports.map(reportCard).join('');
}

// Evidence — grouped by the verify report/scenario that produced each file
function durChip(d) { return d == null ? '' : `<span class="pill na">${esc(typeof d === 'number' ? Math.round(d) + 's' : d)}</span>`; }
function evidenceHtml() {
  if (!media.length) return '<p class="muted">No evidence media.</p>';
  const groups = {};
  for (const m of media) (groups[m.meta?.source || '__unlinked__'] ??= []).push(m);
  const order = [...REPORT_ORDER.filter((s) => groups[s]), ...Object.keys(groups).filter((s) => !REPORT_ORDER.includes(s) && s !== '__unlinked__'), '__unlinked__'];
  let out = '';
  for (const src of order) {
    const items = groups[src];
    if (!items?.length) continue;
    const scen = sourceScenario[src];
    const label = src === '__unlinked__' ? 'Unlinked captures' : src;
    out += `<section class="evgroup"><h3 class="evhead">${esc(label)} <span class="muted">(${items.length})</span></h3>`;
    if (src === '__unlinked__') {
      out += `<p class="muted small">Not referenced by any verify report — filename only.</p>`;
    } else if (scen) {
      out += `<div class="scenario">`;
      if (scen.text) { const t = scen.text.length > 700 ? scen.text.slice(0, 700) + '…' : scen.text; out += `<p><b>Scenario:</b> ${esc(t)}</p>`; }
      if (scen.flows) out += `<ul class="flows">${scen.flows.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`;
      out += `</div>`;
    }
    const vids = items.filter((m) => m.kind === 'video');
    const imgs = items.filter((m) => m.kind === 'image');
    if (vids.length) out += vids.map((v) => {
      const cap = v.meta?.caption || v.name;
      const href = assetHref(v.path);
      const chips = `${v.meta?.ac ? `<span class="pill na">${esc(v.meta.ac)}</span>` : ''}${durChip(v.meta?.duration)}${v.meta?.canary === true ? '<span class="pill ok">canary ✓</span>' : ''}`;
      return `<div class="vidrow">
        <button class="thumb vthumb" data-kind="video" data-src="${esc(href)}" data-cap="${esc(cap)}">
          <video src="${esc(href)}#t=0.1" preload="metadata" muted playsinline></video>
          <span class="play">▶</span>
        </button>
        <div class="vidmeta">
          <div class="vidcap">${esc(cap)} ${chips}</div>
          <div class="muted small mono">${esc(v.name)}</div>
          ${v.meta?.note ? `<p class="muted small vidnote">${esc(v.meta.note)}</p>` : ''}
        </div>
      </div>`;
    }).join('');
    if (imgs.length) out += `<div class="imggrid">${imgs.map((im) => {
      const cap = im.meta?.caption || im.name;
      const href = assetHref(im.path);
      return `<button class="shot" data-kind="image" data-src="${esc(href)}" data-cap="${esc(cap)}"><img loading="lazy" src="${esc(href)}" alt="${esc(im.name)}"><span title="${esc(cap)}">${esc(cap)}</span></button>`;
    }).join('')}</div>`;
    out += `</section>`;
  }
  return out;
}

// ---------- page ----------
const TABS = [
  ['overview', 'Overview', overviewHtml()],
  ['docs', 'Docs', docsHtml()],
  ['verify', `Verify${reports.length ? ` (${reports.length})` : ''}`, verifyHtml()],
  ['evidence', `Evidence${media.length ? ` (${media.length})` : ''}`, evidenceHtml()],
];

const coordDecision = reports.find((r) => r.name === 'coordinator')?.data?.decision || state.verify_decision;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(TICKET)} — run report</title>
<style>
:root{--bg:#0d1117;--panel:#161b22;--panel2:#1c2230;--bd:#2a3242;--fg:#e6edf3;--mut:#8b949e;--acc:#4493f8;
  --ok:#2ea043;--okbg:#132d1a;--bad:#f85149;--badbg:#2d1315;--warn:#d29922;--warnbg:#2d2410;--na:#6e7681;--nabg:#1c2230;}
@media(prefers-color-scheme:light){:root{--bg:#f6f8fa;--panel:#fff;--panel2:#f0f3f6;--bd:#d0d7de;--fg:#1f2328;--mut:#636c76;--acc:#0969da;--okbg:#dafbe1;--badbg:#ffebe9;--warnbg:#fff8c5;--nabg:#eaeef2;}}
*{box-sizing:border-box}
[hidden]{display:none!important}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
code,.mono,pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.wrap{max-width:1100px;margin:0 auto;padding:20px}
header.top{border-bottom:1px solid var(--bd);padding-bottom:16px;margin-bottom:8px}
.crumb{color:var(--mut);font-size:12px;margin-bottom:6px}
h1{font-size:22px;margin:0 0 6px}h1 .key{color:var(--acc)}
.sub{color:var(--mut);margin:0 0 10px}
.hbadges{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.badge{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid transparent;text-transform:none;white-space:nowrap}
.badge.ok{color:var(--ok);background:var(--okbg);border-color:var(--ok)}
.badge.bad{color:var(--bad);background:var(--badbg);border-color:var(--bad)}
.badge.warn{color:var(--warn);background:var(--warnbg);border-color:var(--warn)}
.badge.na{color:var(--mut);background:var(--nabg);border-color:var(--bd)}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--bd);margin:14px 0 18px;flex-wrap:wrap}
.tab{background:none;border:0;border-bottom:2px solid transparent;color:var(--mut);padding:8px 14px;font-size:14px;cursor:pointer;font-weight:600}
.tab.active{color:var(--fg);border-bottom-color:var(--acc)}
.pane{display:none}.pane.active{display:block}
.facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:8px}
.fact{background:var(--panel);border:1px solid var(--bd);border-radius:8px;padding:8px 10px}
.fact .k{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.fact .v{margin-top:2px;word-break:break-word}
.callout{border:1px solid var(--bd);border-left-width:4px;border-radius:8px;padding:10px 12px;background:var(--panel);margin:8px 0}
.callout.bad{border-left-color:var(--bad)}.callout.ok{border-left-color:var(--ok)}.callout.warn{border-left-color:var(--warn)}
.callout p{margin:6px 0}
.card{background:var(--panel);border:1px solid var(--bd);border-radius:10px;padding:14px 16px;margin-bottom:12px}
.card-head{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.rep-name{font-weight:700;font-size:15px;text-transform:capitalize}
.rep-sum{margin:6px 0;color:var(--fg)}
.rowline{margin:8px 0}
.pill{display:inline-block;padding:1px 7px;border-radius:6px;font-size:11px;border:1px solid var(--bd);margin:2px 2px 0 0}
.pill.ok{color:var(--ok);border-color:var(--ok)}.pill.bad{color:var(--bad);border-color:var(--bad)}.pill.warn{color:var(--warn);border-color:var(--warn)}
table.ac{width:100%;border-collapse:collapse;margin:8px 0;font-size:13px}
table.ac th,table.ac td{border:1px solid var(--bd);padding:6px 8px;text-align:left;vertical-align:top}
table.ac th{background:var(--panel2);color:var(--mut);font-weight:600}
.small{font-size:11px}.muted{color:var(--mut)}
details{margin:8px 0}summary{cursor:pointer;color:var(--mut)}
.det-body{margin-top:8px}
pre.json{background:var(--panel2);border:1px solid var(--bd);border-radius:8px;padding:12px;overflow:auto;max-height:460px;font-size:12px;margin:0}
.subtabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px}
.subtab{background:var(--panel2);border:1px solid var(--bd);border-radius:6px;color:var(--mut);padding:5px 12px;cursor:pointer;font-weight:600;font-size:13px}
.subtab.active{color:var(--fg);border-color:var(--acc)}
.subpane{display:none}.subpane.active{display:block}
.pane-meta{color:var(--mut);font-size:12px;margin-bottom:10px}
.prose{background:var(--panel);border:1px solid var(--bd);border-radius:10px;padding:8px 20px}
.prose h1,.prose h2{border-bottom:1px solid var(--bd);padding-bottom:.3em}
.prose pre{background:var(--panel2);border:1px solid var(--bd);border-radius:8px;padding:12px;overflow:auto}
.prose code{background:var(--panel2);padding:.15em .4em;border-radius:4px;font-size:.9em}
.prose pre code{background:none;padding:0}
.prose table{border-collapse:collapse}.prose th,.prose td{border:1px solid var(--bd);padding:6px 10px}
.prose blockquote{border-left:3px solid var(--bd);margin:0;padding-left:14px;color:var(--mut)}
.timeline{list-style:none;padding:0;margin:0}
.timeline li{border-left:2px solid var(--bd);padding:0 0 12px 14px;position:relative}
.timeline li::before{content:"";position:absolute;left:-5px;top:5px;width:8px;height:8px;border-radius:50%;background:var(--acc)}
.timeline .ts{color:var(--mut);font-size:12px;margin-right:6px}
.timeline .sum{margin-top:3px;font-size:13px}
.vidrow{display:flex;gap:16px;align-items:flex-start;background:var(--panel);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:12px}
.vidmeta{flex:1;min-width:0}
.vidcap{font-weight:700;font-size:13px;margin-bottom:4px}
.vidnote{margin:8px 0 0;line-height:1.5}
.thumb{position:relative;flex:0 0 auto;padding:0;border:1px solid var(--bd);border-radius:8px;overflow:hidden;cursor:pointer;background:#000;line-height:0}
.vthumb video{width:220px;height:140px;object-fit:cover;display:block;pointer-events:none}
.thumb .play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:30px;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.7);transition:transform .1s}
.thumb:hover .play{transform:scale(1.15)}
@media(max-width:640px){.vidrow{flex-direction:column}.vthumb video{width:100%;height:auto;max-height:44vh}}
.imggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.shot{display:block;width:100%;border:1px solid var(--bd);border-radius:8px;overflow:hidden;background:var(--panel);cursor:pointer;padding:0;text-align:left;font:inherit;color:inherit}
.shot img{width:100%;height:150px;object-fit:cover;display:block;background:var(--panel2)}
.shot span{display:block;padding:5px 7px;font-size:11px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center}
.lb-bg{position:absolute;inset:0;background:rgba(0,0,0,.82)}
.lb-inner{position:relative;z-index:1;max-width:92vw;max-height:92vh;display:flex;flex-direction:column;gap:8px}
.lb-body{display:flex;align-items:center;justify-content:center}
.lb-body video,.lb-body img{max-width:92vw;max-height:82vh;border-radius:8px;background:#000;display:block}
.lb-cap{color:#fff;font-size:13px;text-align:center;max-width:92vw}
.lb-x{position:absolute;top:-36px;right:0;background:none;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer;z-index:2}
.evgroup{margin-bottom:22px}
.evhead{text-transform:capitalize;border-bottom:1px solid var(--bd);padding-bottom:6px}
.scenario{background:var(--panel);border:1px solid var(--bd);border-radius:8px;padding:10px 14px;margin:0 0 12px;font-size:13px}
.scenario p{margin:0 0 6px}
.flows{margin:6px 0 0;padding-left:18px;font-size:12px;color:var(--mut)}
.flows li{margin:2px 0}
figcaption b{font-size:12px}
h3{margin:20px 0 8px}
</style></head>
<body><div class="wrap">
<header class="top">
  <div class="crumb">Run report · generated ${esc(fmtDate(new Date().toISOString()))}</div>
  <h1><span class="key">${esc(TICKET)}</span> ${esc(jiraSummary)}</h1>
  <p class="sub">${esc(jiraType)}${jiraStatus ? ' · Jira: ' + esc(jiraStatus) : ''} · <a href="${esc(JIRA_URL)}" target="_blank">View in Jira ↗</a></p>
  <div class="hbadges">${badge(state.phase || 'unknown')} ${coordDecision ? 'verify ' + badge(coordDecision) : ''} ${state.branch ? `<code>${esc(state.branch)}</code>` : ''}</div>
</header>
<nav class="tabs">${TABS.map(([id, label], i) => `<button class="tab${i === 0 ? ' active' : ''}" data-tab="${id}">${esc(label)}</button>`).join('')}</nav>
${TABS.map(([id, , body], i) => `<section class="pane${i === 0 ? ' active' : ''}" id="${id}">${body}</section>`).join('')}
</div>
<div id="lb" class="lb" hidden><div class="lb-bg"></div><div class="lb-inner"><button class="lb-x" aria-label="Close">✕</button><div class="lb-body"></div><div class="lb-cap"></div></div></div>
<script>
document.querySelectorAll('.tab').forEach(function(b){b.addEventListener('click',function(){
  document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});
  document.querySelectorAll('.pane').forEach(function(x){x.classList.remove('active')});
  b.classList.add('active');document.getElementById(b.dataset.tab).classList.add('active');
})});
(function(){
  var lb=document.getElementById('lb'), body=lb.querySelector('.lb-body'), cap=lb.querySelector('.lb-cap');
  function clear(){ while(body.firstChild) body.removeChild(body.firstChild); }
  function open(kind,src,c){
    clear();
    var el=document.createElement(kind==='video'?'video':'img');
    if(kind==='video'){el.controls=true;el.autoplay=true;el.playsInline=true;}
    el.src=src; body.appendChild(el);
    cap.textContent=c||''; lb.hidden=false; document.body.style.overflow='hidden';
  }
  function close(){ lb.hidden=true; clear(); document.body.style.overflow=''; }
  document.querySelectorAll('.thumb,.shot').forEach(function(b){b.addEventListener('click',function(){open(b.dataset.kind,b.dataset.src,b.dataset.cap);});});
  lb.querySelector('.lb-bg').addEventListener('click',close);
  lb.querySelector('.lb-x').addEventListener('click',close);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!lb.hidden)close();});
})();
document.querySelectorAll('.subtab').forEach(function(b){b.addEventListener('click',function(){
  var scope=b.closest('.pane');
  scope.querySelectorAll('.subtab').forEach(function(x){x.classList.remove('active')});
  scope.querySelectorAll('.subpane').forEach(function(x){x.classList.remove('active')});
  b.classList.add('active');document.getElementById(b.dataset.doc).classList.add('active');
})});
</script>
</body></html>`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, html);
console.log(`Wrote ${OUT_FILE} (${human(Buffer.byteLength(html))})`);
const vcount = media.filter((m) => m.kind === 'video').length;
const captioned = media.filter((m) => m.meta?.caption).length;
console.log(`  docs: ${docs.length} · reports: ${reports.length} · media: ${media.length} (${vcount} video, ${captioned} captioned)`);
