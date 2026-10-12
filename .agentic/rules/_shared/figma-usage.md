---
name: figma-usage
description: How to use the Figma MCP without hitting View-seat rate limits — fetch once, cache, bake tokens into the design system.
globs:
alwaysApply: false
applies_to: [claude, cursor]
priority: 50
---

# Figma usage & rate-limit avoidance

The remote Figma MCP is rate-limited (View seats have a low tool-call cap). Design verification depends on Figma, so treat calls as scarce.

(Designers have a human-facing version of what the flow consumes — frame naming, which states need frames, tokens over raw values, annotations, brand surfaces: `.agentic/guides/designer-handoff.md`. Point them at it when a handoff comes in incomplete.)

## Server selection — remote primary (navigable), local fallback (user-assisted)

The agent must observe MANY frames across MULTIPLE pages (anchor + siblings + cross-page references) and sometimes search the design — which the URL/node-id remote server supports and the selection-only local server cannot. So:

- **Primary: `figma` (remote `mcp.figma.com`).** Navigate by URL/node-id across pages, list a file's pages/frames, `search_design_system`, and fetch any frame's `get_metadata` / `get_screenshot` / `get_variable_defs`. On a paid **Dev/Full seat (Pro+)** the quota is workable (~200/day) — this is how the agent explores the whole design. Still apply cache + fetch-once + backoff (below).
- **Fallback: `figma-desktop` (local `http://127.0.0.1:3845/mcp`).** No remote quota, but reads ONLY the desktop app's **CURRENT SELECTION** — it cannot navigate or search. Use it when the remote is unreachable/exhausted, or for a high-fidelity render of one specific frame. Because it's selection-based, the agent **PROMPTS the dev**: *"Select `<frame>` in the Figma desktop app (Dev Mode) and reply when ready,"* then reads `get_metadata`/`get_screenshot`/`get_variable_defs` on the selection. Iterate once per frame the agent still needs.
- Record which server(s) were used in `figma/_status.json`.

## Rules

1. **Fetch once per ticket, cache, read from cache everywhere else.**
   `/start` is the phase that calls the Figma MCP and caches everything. It writes frame metadata, screenshots (`.png`), and variables/tokens to `.agentic/plans/<TICKET>/figma/`. The planner reads ONLY that cache — it must never call the Figma MCP. The `design-parity` verifier PREFERS the cache but MAY pull a frame live when the cache is missing/stale/insufficient for a real comparison (the cache is a convenience, not a ceiling) — one targeted pull per missing frame, under the same rate-limit discipline below, never a broad re-crawl.

2. **Two-pass, scope-gated fetching.** Do a cheap metadata/thumbnail pass to choose the frame set; confirm scope at the Figma-scope gate; only THEN spend screenshot/variable calls, and only on confirmed frames. Never pull full data for frames the dev drops.

3. **Bake design tokens into code (the biggest lever).** When the design-system foundation is built, EXPORT the Figma variables/styles into committed code — mobile `src/constants/theme.ts`, frontend `@theme inline`. After that, feature tickets reference the committed tokens and need ~zero Figma token calls — at most one screenshot of the new screen for parity.

4. **Batch + minimize.** Request multiple node IDs per call where supported. Pull global variables once (they're stable), not per-frame.

5. **Backoff on 429 / rate-limit.** Exponential backoff (5s / 15s / 45s, ≤3 tries). If still capped: save the partial cache, set `figma_status: "partial-ratelimited"`, and surface it as a human-blocker (clear the limit or upgrade the seat). Never spin.

6. **Local export fallback.** If the MCP is unavailable or capped, a designer can export the frames (PNG + a tokens JSON) into `.agentic/plans/<TICKET>/figma/` by hand; the flow consumes the cache identically.

7. **Depicted vs inferred — record which, never silently invent.** A state/screen an AC asserts but no cached frame DEPICTS may be built from the **exact ticket wording** (e.g. an error message string from an edge-case) — but record it as **inferred** (verified-against-ticket, not against-Figma) in the design notes, so `design-parity` reports it honestly as such rather than as a clean Figma pass. WHEN neither a frame nor an exact ticket spec exists for a state an AC needs, that's a design-completeness gap to surface at `/start`, not something to invent.

## Why

A capped Figma MCP made `design-parity` INCONCLUSIVE and blocked a design-system build in an early run. Caching + token-baking turns `N × (frames × 3)` calls per ticket into a one-time cost, and removes Figma from the hot path of every later phase.
