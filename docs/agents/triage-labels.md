# Triage Labels

The skills speak in terms of five canonical triage roles. In this repo's local-markdown tracker, those roles are recorded as a `Status:` line near the top of each issue file under `.scratch/<feature>/issues/`.

| Label in mattpocock/skills | Status value in our tracker | Meaning                                  |
| -------------------------- | --------------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`              | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`                | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`           | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`           | Requires human implementation            |
| `wontfix`                  | `wontfix`                   | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), set `Status: <value>` using the corresponding string from this table.

Wayfinder child tickets also use `Status: claimed` / `Status: resolved` for map progress (see `docs/agents/issue-tracker.md`); those are separate from the five triage roles above.
