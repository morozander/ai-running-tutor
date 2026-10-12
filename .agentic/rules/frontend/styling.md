---
name: frontend-styling
description: Tailwind v4 + design tokens via @theme inline + cn() + CVA
globs: ["frontend/src/**/*.tsx", "frontend/src/**/*.ts", "frontend/src/**/*.css"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Frontend Styling

**Tailwind CSS v4 only.** No CSS modules, no styled-components, no Emotion, no inline `style={{}}` (except for dynamic CSS variables).

## Design tokens

The rule: tokens live in one themed source as CSS custom properties, bridged into Tailwind via `@theme inline`; components reference tokens, never raw values. The token names and hex values below are e.g. (THIS repo) illustrations from `src/index.css` — derive real values from the ticket's confirmed design tokens, don't carry them into another project:

```css
/* src/index.css */
@import 'tailwindcss';

@theme inline {
  --color-primary: var(--primary);
  --color-destructive: var(--destructive);
  --color-text-title: var(--text-title);
  --color-text-description: var(--text-description);
  --color-bg-default: var(--bg-default);
  --color-bg-surface: var(--bg-surface);

  --radius-x-small: 6px;
  --radius-small: 8px;
  --radius-medium: 12px;
  --radius-large: 16px;
}

:root {
  --primary: #1575a6;
  --destructive: #dc2626;
  --bg-default: #ffffff;
  --bg-surface: #f5f7fa;
  --text-title: #0a0a0a;
  --text-description: #6b7280;
}

.dark {
  --primary: #1b8cc5;
  --bg-default: #030712;
  --bg-surface: #0f172a;
}
```

Tokens become Tailwind utilities automatically: `bg-primary`, `text-text-description`, `rounded-medium`.

## className composition

**Always use `cn()`.** Never use template literals for conditional classes.

```ts
// src/shared/lib/cn.ts
import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// ✅
<div className={cn('flex items-center gap-2', isActive && 'text-primary', className)} />

// ❌
<div className={`flex items-center gap-2 ${isActive ? 'text-primary' : ''} ${className}`} />
```

When the project has custom radius/spacing tokens, extend `tailwind-merge` so `cn()` recognizes them:

```ts
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: ['rounded-x-small', 'rounded-small', 'rounded-medium', 'rounded-large'],
    },
  },
});
```

## CVA for component variants

Every primitive with variants uses `class-variance-authority`:

```ts
// src/shared/ui/button/button-variants.ts
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 cursor-pointer rounded-medium font-medium outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-text-on-primary hover:bg-primary-hover',
        destructive: 'bg-destructive text-text-on-destructive hover:bg-destructive-hover',
        outline: 'border border-border-default bg-transparent hover:bg-bg-surface',
        ghost: 'bg-transparent hover:bg-bg-surface',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-6 text-base',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

CVA variants reference **tokens only** — never raw hex.

## Dark mode

Class-based, toggled by `ThemeProvider` storing the choice in `localStorage`. The `dark:` Tailwind variant follows `.dark` class on `<html>`:

```css
@custom-variant dark (&:is(.dark *));
```

Components use `dark:` utilities where contrast or color genuinely differs:

```tsx
<div className="bg-bg-default text-text-title dark:bg-bg-default" />
```

Usually no `dark:` is needed because tokens already swap via `--var` overrides in `.dark { ... }`.

## Responsive design

Mobile-first. Breakpoints:

```css
@theme inline {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

```tsx
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" />
```

## Sorting classes

Biome enforces Tailwind class sorting via `useSortedClasses`. Configure `attributes` to include `className` and `functions` to include `clsx`, `cva`, `cn`:

```json
{
  "linter": {
    "rules": {
      "nursery": {
        "useSortedClasses": {
          "level": "error",
          "fix": "safe",
          "options": {
            "attributes": ["className"],
            "functions": ["clsx", "cva", "cn"]
          }
        }
      }
    }
  }
}
```

## Hard rules

- ❌ Never hex / RGB literals in component `className` strings — use tokens
- ❌ Never re-state a token as a Tailwind **arbitrary value** (`bg-[var(--color-brand-accent)]`, `text-[var(--...)]`) when that token is declared in `@theme` and already produces a real utility (`bg-brand-accent`, `text-...`) — prefer the generated utility. (A `var()` inside an actual CSS rule / `<style>` block — e.g. a third-party widget override — is legitimate and out of scope; this rule is about `className` arbitrary values only.)
- ❌ Never CSS modules, styled-components, Emotion, or `.scss`
- ❌ Never **static** inline `style={{}}` (a constant `backgroundColor`/color/spacing) — only *dynamic* CSS variables for animation state, canvas positioning, etc. are exempt; a static inline style belongs in a token-driven utility/class
- ❌ Never template-literal `className` — use `cn()`
- ❌ Never `cursor-default` on clickable elements — always `cursor-pointer`
- ❌ Never bypass `extendTailwindMerge` when adding custom utilities
