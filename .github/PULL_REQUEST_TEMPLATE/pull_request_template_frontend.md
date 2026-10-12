# Frontend Pull Request

## Description

<!-- Provide a brief description of the changes -->

**Jira Ticket:** [PROJ-123](https://your-company.atlassian.net/browse/PROJ-123)

## Type of Change

- [ ] **Bug fix** (non-breaking change which fixes an issue)
- [ ] **New feature** (non-breaking change which adds functionality)
- [ ] **Breaking change** (fix or feature that would cause existing functionality to not work as expected)
- [ ] **Refactor** (non-breaking change that neither fixes a bug nor adds a feature)
- [ ] **Documentation** (changes to documentation only)
- [ ] **Chore** (e.g., updating dependencies, configuring CI/CD)
- [ ] **UI/UX** (visual or user experience changes)

---

## Technical Details

### Component Changes

- [ ] New components created
- [ ] Existing components updated
- [ ] Component props properly typed
- [ ] Responsive design implemented

### State Management

- [ ] State management approach followed (Redux/Context/Zustand/etc.)
- [ ] No unnecessary re-renders
- [ ] Proper cleanup in useEffect hooks

### Styling

- [ ] Follows design system guidelines
- [ ] Mobile-first responsive approach
- [ ] Cross-browser compatibility tested
- [ ] Dark mode support (if applicable)

### Testing

- [ ] **Unit Tests:** `pnpm run test`
- [ ] **E2E Tests:** `pnpm run test:e2e`
- [ ] **Manual Testing:**
  - Steps to reproduce:
    1. ...
    2. ...
    3. ...

**Test Configuration:**
* **Node.js Version:** `20.x`
* **Browser:** `Chrome / Firefox / Safari`
* **Operating System:** `macOS / Windows / Linux`
* **Screen Sizes Tested:** `Mobile / Tablet / Desktop`

---

## Frontend Checklist

### Code Quality

- [ ] My code follows the project's [coding style guidelines](./frontend/docs/contribution.md#coding-style)
- [ ] I have performed a self-review of my own code
- [ ] ESLint/Prettier check passes: `pnpm run lint`
- [ ] Build passes: `pnpm run build`
- [ ] TypeScript types are correct (no `any` unless necessary)

### Architecture

- [ ] Follows project folder structure
- [ ] Components are properly separated
- [ ] Custom hooks used for reusable logic
- [ ] No code duplication

### Accessibility (a11y)

- [ ] Semantic HTML used
- [ ] ARIA labels added where needed
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG standards
- [ ] Screen reader tested

### Performance

- [ ] Images optimized (WebP, proper sizing)
- [ ] Lazy loading implemented for heavy components
- [ ] No unnecessary re-renders (React.memo, useMemo, useCallback)
- [ ] Bundle size analyzed (no large dependencies added)

### Security

- [ ] XSS prevention (dangerouslySetInnerHTML avoided)
- [ ] Sensitive data not stored in localStorage
- [ ] API tokens handled securely
- [ ] CSRF protection considered

### User Experience

- [ ] Loading states implemented
- [ ] Error states handled gracefully
- [ ] Form validation with clear error messages
- [ ] Success feedback provided
- [ ] Consistent with design system

---

## Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome | [ ] Tested |
| Firefox | [ ] Tested |
| Safari | [ ] Tested |
| Edge | [ ] Tested |

---

## Screenshots / Screen Recordings

<!-- Include before/after screenshots for UI changes -->

| Before | After |
| :----: | :---: |
|        |       |

<!-- For complex interactions, consider adding a screen recording -->

---

## Related PRs

<!-- List any related PRs in backend or other repositories -->

- [ ] Backend PR: #[PR_NUMBER]
- [ ] Other: #[PR_NUMBER]

---

## Deployment Notes

<!-- Any special deployment considerations? -->

- [ ] Environment variables need to be added
- [ ] Feature flag required
- [ ] Database migration needed (coordinate with backend)
- [ ] CDN cache invalidation required
