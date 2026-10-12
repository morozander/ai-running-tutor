/** @type {import('aws-amplify').ResourcesConfig} */
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_WEB_CLIENT_ID,
      // Local dev/test only: point Amplify at cognito-local (e.g. http://localhost:9229)
      // when VITE_COGNITO_ENDPOINT is set. Omitted in real envs so AWS Cognito is used.
      ...(import.meta.env.VITE_COGNITO_ENDPOINT ? { userPoolEndpoint: import.meta.env.VITE_COGNITO_ENDPOINT } : {}),
      loginWith: {
        oauth: {
          domain: `${import.meta.env.VITE_COGNITO_DOMAIN}.auth.${import.meta.env.VITE_AWS_REGION}.amazoncognito.com`,
          scopes: ["email", "openid", "profile"],
          redirectSignIn: [`${import.meta.env.VITE_APP_BASE_URL}/callback`],
          redirectSignOut: [`${import.meta.env.VITE_APP_BASE_URL}/`],
          responseType: "code",
          providers: ["Google"],
        },
      },
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

export default amplifyConfig
