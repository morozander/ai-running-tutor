import { Amplify } from 'aws-amplify';

export function AmplifyConfigure() {
  Amplify.configure({
    Auth: {
      Cognito: {
        // Expo inlines only EXPO_PUBLIC_-prefixed vars into the app bundle —
        // unprefixed vars are undefined in real builds.
        userPoolClientId: process.env.EXPO_PUBLIC_AWS_USER_POOL_WEB_CLIENT || '',
        userPoolId: process.env.EXPO_PUBLIC_AWS_USER_POOL_ID || '',
      },
    },
  });
}
