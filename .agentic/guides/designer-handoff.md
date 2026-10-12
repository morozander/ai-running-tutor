# Designer handoff — Figma conventions the flow consumes

**Audience:** designers handing off Figma work for tickets that run through the spec-driven AI workflow.
**Why this exists:** the flow doesn't just *look at* your design — it verifies the built product against it. At ticket start it fetches and caches your frames and checks them for completeness; after implementation, a verifier compares **rendered screenshots of the running app** against your frames (in both light and dark) and loops fixes until they match. Whatever isn't in a frame can't be verified against one — these conventions decide how much of your intent survives.

## Frames are fetched once — make them findable

- The ticket links **one anchor frame**. The flow then scans **sibling frames on the same page** for related states/variants — keep a ticket's frames together on one page.
- **Put the ticket key in the frame name**: `[BEO-20] Sign in — error`. Key-in-name ranks a frame "high confidence" in that scan; unnamed siblings rely on keyword matching and may be dropped.
- Cross-page frames are only pulled when the ticket's ACs clearly reference them — don't scatter one ticket across pages.
- Figma API calls are rate-limited and treated as scarce: frames are fetched **once per ticket** and cached. If the integration is down, you can hand-export PNGs + a tokens JSON into the ticket's cache folder and the flow consumes them identically — a dev will tell you the exact path.

## Which states need frames

Not all seven (default / hover / focus / disabled / loading / empty / error) every time — the flow derives the needed states from **what the ticket's ACs assert**. If an AC mentions a validation error, the error state needs a frame; if a list can be empty, the empty state needs a frame. Rule of thumb: **error, loading, empty, disabled** are the four most-asserted and most-skipped — design them whenever the screen can be in them.

### What happens when a state is missing

The dev gets these options at the design-completeness gate, none of them great for you:

1. **Auto-propose** — the AI proposes the missing state from the existing design system. It will be consistent, but it won't be *yours*.
2. **Inline override** — the dev describes what the state should look like in their own words, and it's built from that (or from the ticket's exact wording when the text spells it out, e.g. an error-message string). Either way it's permanently marked *"verified against ticket, not against Figma"* — the visual check can never bless it.
3. **Clarify** — you get a Figma/Jira comment and the ticket pauses until you answer.
4. **Force-proceed** — the dev builds against the partial design anyway (flagged as not recommended for UI tickets).

**Depicted beats inferred**: only a real frame lets the final screenshot comparison actually verify your design. A state you draw is a state you control.

## Tokens and variables, not raw values

Use Figma **variables/styles** for colors, spacing, typography, radius — not detached hex/px values. The flow exports your variables into the codebase's committed design tokens, and the parity check verifies components reference tokens rather than hex literals. A raw value can't be traced to a token and reads as a divergence. Keep global variables in one place and stable — they're pulled once and baked in.

## Per-platform frames

Provide **mobile + desktop variants** wherever the product has both — the completeness check looks for them. Mobile screens are verified against a **real simulator/emulator render**, so a desktop-only frame can't vouch for the mobile build.

## Responsive web ≠ the mobile app

Two different things, both verified, both needing frames:

- **The mobile app** (native, Expo) gets its own frames and is rendered on a simulator.
- **Responsive web** is the SAME web page at different widths. WHEN a web screen's layout genuinely differs at a narrow breakpoint (stacked columns, collapsed nav, different controls) → provide a **mobile-width frame of the web page too** (name it with the breakpoint, e.g. `[CLA-12] Checkout — web 390`). The flow then screenshots the page at BOTH widths and compares each against its frame. WHEN the page just reflows with no designed difference → one desktop frame is enough; nothing extra to draw.

The rule of thumb: if you'd be unhappy seeing the desktop layout naively squeezed to 390px, that's a designed breakpoint — draw it, or the AI will improvise it.

## Annotations the flow reads

Put behavior notes, motion, and edge rules on the **Figma annotation layer** (Dev Mode annotations). Sticky notes and loose text boxes are not read as annotations and don't survive the handoff.

## Layout intent is read from the frame

The flow honors the layout your frame depicts. A frame drawn **standalone / full-screen** (no app header or nav) is built header-less — and a stray header on it is flagged as a divergence; conversely, a frame that includes the app chrome must keep it. Depict the chrome you expect: include the shell when the screen lives inside it, omit it when the screen is truly full-bleed (auth, onboarding, splash).

## Theme adaptation — design light AND dark

Verification renders **every screen in both light and dark** and flags surfaces that don't adapt (a light card baked into dark mode, invisible text). Define both modes via variables; any color that doesn't switch with the theme will come back as a bug.

## Brand surfaces — the foundation checklist

On a project's first UI tickets, the flow checks that the **branded design surface** exists in code — not just tokens and fonts:

- the brand **background/pattern** (e.g. a named gradient the screens sit on)
- a branded **splash/launch screen**
- the **logo/wordmark** glyph
- required **icon assets** (provider buttons, alert/status icons)

If a frame depends on one of these and the codebase doesn't have it yet, the ticket **blocks** until the foundation is built — from your frames. So: name these layers clearly, build them from variables, and keep the source assets (SVGs, gradient definitions) exportable. A strong first handoff pays off on every later ticket, because the tokens get baked into code once and reused.

## Pre-handoff checklist

- [ ] Anchor frame linked in the ticket; siblings on the same page, named with the ticket key
- [ ] Every state an AC mentions has a frame (error / loading / empty / disabled front of mind)
- [ ] All values via variables/styles; both light and dark defined
- [ ] Mobile + desktop variants where applicable
- [ ] Annotation layer (not stickies) for behavior notes
- [ ] Frame depicts the intended chrome (in-shell vs full-screen)
- [ ] Brand surfaces (background pattern, splash, logo, icons) present and exportable
- [ ] Redesign tickets: each frame says which existing screen it replaces (old→new mapping)

---

*BAs have a companion guide for the ticket side of the handoff: [ba-ticket-authoring.md](./ba-ticket-authoring.md).*
