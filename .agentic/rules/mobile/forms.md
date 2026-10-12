---
name: mobile-forms
description: React Hook Form + Zod for React Native — TextInput, Controller, keyboard handling
globs: ["mobile/expo-boilerplate/src/**/*.tsx"]
alwaysApply: false
applies_to: [cursor, claude]
priority: high
---

# Mobile Forms

**React Hook Form + Zod** — same principles as [frontend/forms.md](../frontend/forms.md). Inputs differ.

## Schema and form setup

Identical to frontend. Schema in `features/<feature>/schemas/<form-name>-schema.ts`.

```ts
import * as z from 'zod';

export const profileFormSchema = z.object({
  firstName: z.string().min(1, 'Required').max(50),
  lastName: z.string().min(1, 'Required').max(50),
  email: z.string().email('Invalid email'),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;
```

```tsx
const form = useForm<ProfileFormValues>({
  resolver: zodResolver(profileFormSchema),
  defaultValues: { firstName: '', lastName: '', email: '' },
  mode: 'onSubmit',
  reValidateMode: 'onChange',
});
```

## Connecting RN `TextInput`

Always via `Controller`:

```tsx
import { Controller } from 'react-hook-form';
import { TextInput, Text } from 'react-native';

<Controller
  name="email"
  control={form.control}
  render={({ field, fieldState }) => (
    <View>
      <TextInput
        value={field.value}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        accessibilityLabel="Email"
        style={styles.input}
      />
      {fieldState.error && (
        <Text style={styles.error} accessibilityRole="alert">
          {fieldState.error.message}
        </Text>
      )}
    </View>
  )}
/>
```

## Keyboard accessory + dismissal

Wrap forms in `KeyboardAvoidingView`:

```tsx
import { KeyboardAvoidingView, Platform, Pressable, Keyboard } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  <Pressable onPress={Keyboard.dismiss} accessible={false} style={{ flex: 1 }}>
    {/* form fields */}
  </Pressable>
</KeyboardAvoidingView>
```

## Field navigation

For multi-field forms, wire `returnKeyType="next"` + `onSubmitEditing` to move focus:

```tsx
const emailRef = useRef<TextInput>(null);
const passwordRef = useRef<TextInput>(null);

<TextInput
  ref={emailRef}
  returnKeyType="next"
  onSubmitEditing={() => passwordRef.current?.focus()}
/>
<TextInput
  ref={passwordRef}
  returnKeyType="done"
  secureTextEntry
  onSubmitEditing={form.handleSubmit(onSubmit)}
/>
```

## Submission

```ts
const onSubmit = async (values: ProfileFormValues) => {
  await updateProfile({ variables: { input: values } });
  Keyboard.dismiss();
};

<Button onPress={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
  {form.formState.isSubmitting ? <ActivityIndicator /> : <Text>Save</Text>}
</Button>
```

## Server errors

`toast.error()` isn't standard in RN. Options:

- A small `<Snackbar>` via `react-native-paper` (if you adopt it)
- A custom `<Toast>` rooted at the app shell
- Inline `setError('root', { message })` rendered as a `<Text>` near the submit button

The boilerplate doesn't yet ship a toast system — make it a per-feature decision when needed.

## Accessibility

- `accessibilityLabel` on every input
- `accessibilityRole="alert"` on error text
- `accessibilityState={{ disabled: isSubmitting }}` on submit
- Group related fields with `accessibilityRole="form"` on the wrapper

## Hard rules

- ❌ `TextInput` not wrapped in `Controller`
- ❌ `useState` for `isSubmitting` — use `formState.isSubmitting`
- ❌ Missing `keyboardType` on email/numeric inputs
- ❌ Missing `autoComplete` / `textContentType` (degrades autofill)
- ❌ Missing `accessibilityLabel` on inputs
