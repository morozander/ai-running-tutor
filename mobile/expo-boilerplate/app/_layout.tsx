import { ApolloClient } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { createApolloClient } from '@/api/client';
import { AmplifyConfigure } from '@/config/amplify.config';
import '@/config/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';

AmplifyConfigure();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [client, setClient] = useState<ApolloClient>();
  const colorScheme = useColorScheme();

  useEffect(() => {
    const createAndSetApolloClient = async () => {
      const _client = await createApolloClient();
      setClient(_client);
    };
    createAndSetApolloClient();
  }, []);

  if (!client) {
    return <></>;
  }

  return (
    <ApolloProvider client={client}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ApolloProvider>
  );
}
