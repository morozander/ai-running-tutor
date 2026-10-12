# `aws-exports.js`

## Why a separate file?

Amplify v6 (Gen 2) expects a `ResourcesConfig` object with nested keys (`Auth.Cognito`, `API.GraphQL`, etc.). Keeping it in its own module:

1. **Drop-in replacement** — other Amplify docs and examples import a config module, so anyone familiar with the ecosystem will recognise the pattern instantly.
2. **Single source of truth** — every part of the app that needs an Amplify-related value (GraphQL endpoint, Cognito pool ID, region) imports it from one place instead of scattering `import.meta.env` calls across multiple files.
3. **Easy to swap** — if the project ever moves to `amplify pull`, you only replace this one file. `main.tsx` and the rest of the app stay untouched.

## Approach 1 — Manual config (current)

All values are read from Vite environment variables at build time (`import.meta.env.VITE_*`). Set them in your `.env` (see `.env.example`):

```
VITE_AWS_REGION=eu-west-1
VITE_AWS_USER_POOL_ID=eu-west-1_XXXXXXXXX
VITE_AWS_USER_POOL_WEB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_APP_API_URL=https://xxxxxxxxxx.appsync-api.eu-west-1.amazonaws.com/xxx
```

The exported config uses the Gen 2 `ResourcesConfig` shape:

```js
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_WEB_CLIENT_ID,
    },
  },
  API: {
    GraphQL: {
      endpoint: import.meta.env.VITE_APP_API_URL,
      region: import.meta.env.VITE_AWS_REGION,
      defaultAuthMode: "userPool",
    },
  },
}
```

The file is **committed to git** — it contains no secrets, only references to env vars that are resolved at build time.

In CI, env vars are injected via GitHub Actions secrets and written to `.env` before the build:

```yaml
script:
  - env | grep '^VITE_' | sort > .env
  - npm ci
  - npm run build
```

No Amplify CLI is needed.

## Approach 2 — `amplify pull` (auto-generated)

Amplify Gen 2 generates `amplify_outputs.json` instead of `aws-exports.js`. If you use the Amplify CLI:

```bash
npx ampx generate outputs --app-id $APP_ID --branch $BRANCH_NAME
```

This creates `amplify_outputs.json` with the Gen 2 config shape. You can import it directly:

```ts
import outputs from "../amplify_outputs.json"
Amplify.configure(outputs)
```

In this case, `amplify_outputs.json` **must be gitignored** because it contains environment-specific values and is regenerated on every pull.

Add to `.gitignore`:

```
amplify_outputs.json
```

In CI, generate the outputs before the build:

```yaml
before_script:
  - npm install -g @aws-amplify/cli
script:
  - npx ampx generate outputs --app-id $APP_ID --branch $BRANCH_NAME
  - npm ci
  - npm run build
```
