---
name: mobile-testing
description: Jest + jest-expo + React Native Testing Library patterns
globs: ["mobile/expo-boilerplate/**/*.test.ts", "mobile/expo-boilerplate/**/*.test.tsx", "mobile/expo-boilerplate/**/*.spec.ts", "mobile/expo-boilerplate/**/*.spec.tsx"]
alwaysApply: false
applies_to: [cursor, claude]
priority: normal
---

# Mobile Testing

**Test runner:** Jest with `jest-expo` preset (configured in `package.json`)
**Component testing:** `@testing-library/react-native` (v13+ — matchers like `toBeOnTheScreen` are built in; do NOT add `@testing-library/jest-native`, it's deprecated and not installed here)
**Why not Vitest:** Metro and Expo's transformer pipeline is Jest-specific.

## Jest config

Already in [package.json](../../../mobile/expo-boilerplate/package.json):

```json
{
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*)"
    ]
  }
}
```

## File placement

Co-locate next to the source:

```
src/features/profile/
├── components/
│   ├── profile-form.tsx
│   ├── profile-form.test.tsx
│   ├── use-profile-form.ts
│   └── use-profile-form.test.ts
```

## What to test

| Layer | Test |
|---|---|
| Hooks (data, logic) | Behavior under various input/state |
| Components | Rendering + user interactions (press, type) |
| Form schemas | Zod validation |
| Utilities | Pure I/O |
| Screens | Smoke test — renders without throwing |

**Skip:**

- Expo modules (mocked by jest-expo)
- Apollo / RHF internals
- Pure styling

## Test shape

```ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ProfileForm } from './profile-form';

describe('ProfileForm', () => {
  it('renders the email field', () => {
    render(<ProfileForm onSubmit={jest.fn()} />);
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
  });

  it('calls onSubmit with form values when submitted', async () => {
    const onSubmit = jest.fn();
    render(<ProfileForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'test@example.com');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
    });
  });
});
```

## Mocking Apollo

For hook tests, mock the wrapping hook. For component tests that need Apollo:

```tsx
import { MockedProvider } from '@apollo/client/testing/react'; // Apollo 4 path — '@apollo/client/testing' no longer exports it

const mocks = [{
  request: { query: GET_PROFILE, variables: { userId: '1' } },
  result: { data: { getProfile: { id: '1', firstName: 'Alice' } } },
}];

render(
  <MockedProvider mocks={mocks}>
    <ProfileScreen userId="1" />
  </MockedProvider>
);
```

## Mocking Expo modules

`jest-expo` auto-mocks most expo modules. For ones that aren't:

```ts
// jest.setup.ts
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn(),
}));
```

## Mocking the router

```ts
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: '123' }),
  Link: ({ children }: any) => children,
}));
```

## Query priorities

Per RNTL:

1. `getByRole` — accessible queries
2. `getByLabelText` — for inputs (`accessibilityLabel`)
3. `getByText` — content
4. `getByPlaceholderText` — last resort for inputs
5. `getByTestId` — escape hatch only

Never query by style or by element type alone.

## E2E affordances

No E2E runner is wired yet (THIS repo). WHEN one lands (Maestro/Appium/Detox), build the app-side affordances the company apps proved out:

- **Central `testId()` helper** — one platform-aware helper emitting `testID` on iOS and `accessibilityLabel` on Android (what Appium/Maestro actually read there), never ad-hoc per-component ID wiring. One helper means one place to change strategy.
- **WHEN E2E needs authenticated state** → an env-gated test-auth deep link beats scripting the login UI. The production gate is **non-negotiable**: runtime environment guard at minimum (return early when env is production), build-time stripping preferred — an ungated credential deep link in a store build is an account-takeover vector. The gate is the rule; the link is just the affordance. Document test links in `DEEPLINKS.md` (see [routing.md](./routing.md)).

## Commands

```bash
cd mobile/expo-boilerplate
npm test              # all tests
npm test -- --watch   # watch mode
npm run test:ci       # CI mode, passes if no tests
```

## Hard rules

- ❌ Snapshot tests (brittle, low signal)
- ❌ `getByTestId` when `getByRole` works
- ❌ Mocking implementation details (`useState`, refs)
- ❌ `act()` — RNTL wraps it
- ❌ Real native API calls in tests (always mock)
