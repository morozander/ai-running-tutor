/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AWS_REGION: string
  readonly VITE_APP_API_URL: string
  readonly VITE_APP_BASE_URL: string
  readonly VITE_COGNITO_DOMAIN: string
  readonly VITE_AWS_USER_POOL_ID: string
  readonly VITE_APP_AMPLIFY_ENV: string
  readonly VITE_APP_AMPLIFY_APP_ID: string
  readonly VITE_AWS_USER_POOL_WEB_CLIENT_ID: string
}
