# Code Review Guidelines — Frontend

> **Goal:** Ensure high code quality in the frontend project through effective code review.

---

## 📋 1. Branch Naming

**Format:**
```
<type>/<description>
```

**Available Types:**

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New functionality (component, page) | `feat/user-profile` |
| `fix` | Bug fix | `fix/login-button` |
| `refactor` | Refactoring without functional changes | `refactor/auth-hooks` |
| `docs` | Documentation changes | `docs/component-docs` |
| `chore` | Technical changes (dependencies, configs) | `chore/vite-update` |
| `test` | Adding/updating tests | `test/auth-form` |
| `perf` | Performance improvements | `perf/lazy-loading` |
| `ui` | UI/UX changes | `ui/button-styles` |

**Rules:**
- Use `kebab-case` (lowercase only, hyphens for separation)
- Maximum 3-5 words in description
- Avoid generic words ("update", "fix-stuff")

---

## 📝 2. Commit Message

**Format (Conventional Commits):**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Example:**
```
feat(auth): add registration form

- Added RegisterForm component
- Added field validation (email, password)
- Added Auth API integration
- Added error handling

Closes ISSUE-123
```

**Rules:**
- **Subject:** ≤ 50 characters, present tense ("add" not "added")
- **Body:** ≤ 72 characters per line, describes **WHAT** and **WHY** (not HOW)
- **Footer:** Link to issue (`Closes ISSUE-123`, `Fixes ISSUE-456`)

**Commit Types:**
| Type | When |
|------|------|
| `feat` | New functionality (component, hook, page) |
| `fix` | Bug fix |
| `refactor` | Refactoring without functional changes |
| `docs` | Documentation only |
| `style` | Code style (formatting, no logic change) |
| `chore` | Technical changes (dependencies, configs) |
| `test` | Tests (unit, integration, e2e) |
| `perf` | Performance (code splitting, lazy loading) |
| `ui` | UI/UX changes (styles, animations) |
| `a11y` | Accessibility improvements |
| `build` | Build system or dependencies |
| `ci` | CI/CD configuration |
| `revert` | Revert a previous commit |

---

## 🔀 3. Pull Request

### 3.1 PR Description Template

```markdown
## 🎯 Description
_Briefly: what changed and why_

## 📊 Type of Changes
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 🔧 Refactor
- [ ] 📚 Documentation
- [ ] ⚡ Performance
- [ ] 🧪 Tests
- [ ] 🎨 UI/UX
- [ ] ♿ Accessibility

## ✅ Checklist
- [ ] Code tested locally
- [ ] Build passes (`pnpm run build`)
- [ ] Linter passes (`pnpm run lint`)
- [ ] Tests pass (`pnpm run test`)
- [ ] Screenshots added (if visual changes)
- [ ] Checked on different screen sizes
- [ ] Accessibility checked (if applicable)

## 🧪 How to Test
_Step-by-step instructions for reviewer:_
1. _Run dev server ..._
2. _Navigate to ..._
3. _Expected result ..._

## 📸 Screenshots / Recordings
_Before/After for visual changes_
| Before | After |
|--------|-------|
| _image_ | _image_ |

## 🔗 Links
- Issue: LINK_TO_ISSUE
- Design: LINK_TO_FIGMA
- Storybook: LINK_TO_STORIES
```

### 3.2 PR Requirements

**Mandatory:**
- [ ] Filled description template
- [ ] Linked issue (if applicable)
- [ ] CI checks passed
- [ ] Minimum 1 reviewer
- [ ] Screenshots for visual changes

**Recommended:**
- [ ] Linked issues
- [ ] Labels (bug, enhancement, etc.)
- [ ] Assignees
- [ ] Milestone

---

## 👀 4. Code Review Checklist

### 4.1 For Author (Before Submitting)

```markdown
- [ ] Code passes `pnpm run lint`
- [ ] Code passes `pnpm run build`
- [ ] Tests pass `pnpm run test`
- [ ] No console.log in production code
- [ ] No TODOs without created issue
- [ ] Variables and functions named clearly
- [ ] Code is formatted
- [ ] No unnecessary changes (debug code, comments)
```

### 4.2 For Reviewer

#### Code Quality
- [ ] Code is readable and understandable
- [ ] No duplication (DRY)
- [ ] Components are small and do one thing (SRP)
- [ ] Error handling exists
- [ ] Logic is tested

#### Architecture (React/Vue)
- [ ] Components properly separated
- [ ] Hooks/Composables used correctly
- [ ] State management consistent
- [ ] No circular dependencies
- [ ] Imports sorted

#### UI/UX
- [ ] Matches design (Figma)
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Loading states shown
- [ ] Error states handled
- [ ] Animations smooth

#### Accessibility
- [ ] Semantic tags (header, main, footer, nav)
- [ ] ARIA attributes where needed
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Contrast sufficient

#### Tests
- [ ] Tests cover new code
- [ ] Tests pass
- [ ] Edge cases included
- [ ] Tests understandable

#### Security
- [ ] No hardcoded secrets/API keys
- [ ] Input data validated
- [ ] XSS prevention (dangerous HTML)
- [ ] Authentication/Authorization checked

#### Performance
- [ ] Code splitting where needed
- [ ] Lazy loading for large components
- [ ] Memoization (useMemo, useCallback) where needed
- [ ] No unnecessary re-renders

---

## 🔄 5. Process

```
┌─────────────────┐
│  1. Create      │
│     branch      │
│  git checkout   │
│  -b type/desc   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Make        │
│     changes     │
│  code + tests   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Commit      │
│  message        │
│  type(scope):   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Push +      │
│  Create PR      │
│  git push -u    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. Code        │
│  Review         │
│  (response      │
│   ≤ 24 hours)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. Fix         │
│  comments       │
│  (if any)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  7. Approve +   │
│  Merge          │
│  (Squash)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  8. Delete      │
│  branch         │
│  git branch -D  │
└─────────────────┘
```

### 5.1 Review Time

| Priority | Response Time |
|----------|---------------|
| 🔴 Critical (production down) | ≤ 4 hours |
| 🟡 Normal | ≤ 24 hours |
| 🟢 Low | ≤ 48 hours |

### 5.2 Merge Strategy

- `Squash and merge` — for feature branches
- `Rebase and merge` — for small changes
- `Create a merge commit` — for long-running branches

---

## 📐 6. Frontend Coding Standards

### 6.1 General Principles

- **KISS** — Keep It Simple, Stupid
- **DRY** — Don't Repeat Yourself
- **SOLID** — 5 OOP principles
- **YAGNI** — You Ain't Gonna Need It

### 6.2 Naming

```typescript
// Components — PascalCase
const UserProfile = () => {}

// Functions, variables — camelCase
const getUserById = () => {}
const userId = '123'

// Constants — UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3
const API_BASE_URL = 'https://api.example.com'

// Component files — PascalCase
UserProfile.tsx
LoginForm.vue

// Utility, hook files — camelCase / kebab-case
useAuth.ts
format-date.ts

// Tests — *.test.ts / *.spec.ts
UserProfile.test.tsx
```

### 6.3 Component Structure

```typescript
// ✅ GOOD: Functional component with TypeScript
interface UserProfileProps {
  userId: string;
  onEdit?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onEdit }) => {
  // Hooks first
  const { data, loading } = useUser(userId);
  const [isEditing, setIsEditing] = useState(false);

  // Early returns
  if (loading) return <LoadingSpinner />;
  if (!data) return <ErrorState />;

  // JSX
  return (
    <div className="user-profile">
      <h2>{data.name}</h2>
      {isEditing && <EditForm onSave={onEdit} />}
    </div>
  );
};

// ❌ BAD: Class components (unless justified)
class UserProfile extends React.Component { ... }
```

### 6.4 Hooks (React)

```typescript
// ✅ GOOD: Custom hook for logic
export function useUser(userId: string) {
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const user = await api.getUser(userId);
      setData(user);
      setLoading(false);
    }
    fetchUser();
  }, [userId]);

  return { data, loading };
}

// ❌ BAD: Logic inside component
function Component() {
  useEffect(() => {
    // 50 lines of logic...
  });
}
```

### 6.5 Styles (CSS-in-JS / Tailwind)

```typescript
// ✅ GOOD: Tailwind className
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  Click me
</button>

// ✅ GOOD: CSS Modules
import styles from './Button.module.css';
<button className={styles.primary}>Click me</button>

// ❌ BAD: Inline styles
<button style={{ padding: '8px 16px', backgroundColor: 'blue' }}>
```

### 6.6 Error Handling

```typescript
// ✅ GOOD: Error Boundary + handling
try {
  const data = await api.fetch();
  setData(data);
} catch (error) {
  setError(error instanceof Error ? error.message : 'Failed to fetch');
}

// ❌ BAD: Ignoring errors
useEffect(() => {
  api.fetch(); // No error handling
}, []);
```

### 6.7 Accessibility

```typescript
// ✅ GOOD: Semantic tags + ARIA
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/" aria-current="page">Home</a></li>
  </ul>
</nav>

<button 
  aria-expanded={isOpen} 
  aria-controls="dropdown-menu"
  onClick={toggle}
>
  Menu
</button>

// ❌ BAD: Div instead of buttons
<div onClick={handleClick}>Click me</div>
```

---

## 🚫 7. Anti-Patterns

### 7.1 In Code

```typescript
// ❌ Large components (> 200 lines)
// ❌ Deep nesting (> 3 levels)
// ❌ Magic numbers
const timeout = 86400000; // ❌
const DAY_IN_MS = 86400000; // ✅

// ❌ Prop drilling through 5+ components
// ❌ Using any instead of types
const data: any = {}; // ❌
interface Data { ... } // ✅

// ❌ Unnecessary re-renders (missing memo)
// ❌ Memory leaks (uncleaned useEffect)
```

### 7.2 In State

```typescript
// ❌ Poor state management
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);
const [success, setSuccess] = useState(false);

// ✅ Better: combined state
const [state, setState] = useState<{
  status: 'idle' | 'loading' | 'success' | 'error';
  data: Data | null;
  error: string | null;
}>({ status: 'idle', data: null, error: null });
```

### 7.3 In PR

```
// ❌ Large PRs (> 400 lines changed)
// ❌ PR without description
// ❌ PR without tests
// ❌ PR without screenshots (for visual changes)
// ❌ "Works on my machine"
// ❌ Ignoring comments > 48 hours
```

---

## 📊 8. Metrics

### 8.1 Targets

| Metric | Target |
|--------|--------|
| PR Size | < 400 lines |
| Review Time | < 24 hours |
| Test Coverage | > 80% |
| Build Time | < 5 minutes |
| Lighthouse Performance | > 90 |
| Lighthouse Accessibility | > 90 |
| Bundle Size | < 500KB (gzipped) |

---

## 🎨 9. Design Review

### 9.1 UI Changes Checklist

- [ ] Matches Figma design
- [ ] Responsive (mobile: 320px, tablet: 768px, desktop: 1024px+)
- [ ] Dark/light theme (if applicable)
- [ ] States: hover, focus, active, disabled
- [ ] Loading states (skeleton, spinner)
- [ ] Error states
- [ ] Empty states
- [ ] Animations smooth (60fps)

---

## 🔗 10. Useful Links

- [React Best Practices](https://react.dev/learn)
- [Vue Best Practices](https://vuejs.org/guide/best-practices.html)
- [Accessibility Guide](https://www.w3.org/WAI/WCAG21/quickref/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Google Code Review Guide](https://google.github.io/eng-practices/)

---

**Version:** 1.0  
**Last Updated:** 2026-02-19
