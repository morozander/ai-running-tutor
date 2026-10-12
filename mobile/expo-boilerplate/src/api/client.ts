import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  Observable,
  from
} from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageWrapper, persistCache } from 'apollo3-cache-persist';
import * as Auth from 'aws-amplify/auth';

const getToken = async () => {
  try {
    return Auth.fetchAuthSession({ forceRefresh: true }).then(async data => {
      const token = data?.tokens?.idToken?.toString();
      return token || null;
    });
  } catch (error) {
    throw new Error(`REFRESH TOKEN ERROR: ${error}`);
  }
};

let staticApolloClient: ApolloClient;

const createApolloClient = async () => {
  const authLink = new SetContextLink(async (prevContext) => {
    const token = await getToken() || '';

    return {
      headers: {
        ...prevContext.headers,
        Authorization: token,
      },
    };
  });

  let isRefreshing = false;
  let pendingRequests: ((token: string) => void)[] = [];

  const addPendingRequest = (request: (token: string) => void) => {
    pendingRequests.push(request);
  };

  const resolvePendingRequests = (token: string) => {
    pendingRequests.forEach(callback => callback(token));
    pendingRequests = [];
  };

  const errorLink = new ErrorLink(({ error, operation, forward }) => {
    if (CombinedGraphQLErrors.is(error)) {
      console.error('GRAPHQL ERRORS:', error.errors);
    } else {
      console.error('NETWORK ERROR:', error);
    }
    // UPDATE THIS LOGIC ACCORDING TO YOUR API TO HANDLE THE UNAUTHORIZED ERRORS
    const unauthorizedError =
      (CombinedGraphQLErrors.is(error) &&
        error.errors.find(err => {
          const message = err.message?.toLowerCase();
          const extensionMsg = (err?.extensions?.code as string)?.toLowerCase();
          return (
            message?.includes('jwt expired') ||
            message?.includes('unauthenticated') ||
            extensionMsg?.includes('unauthenticated')
          );
        })) ||
      error.message?.toLowerCase() === 'jwt expired' ||
      error.message?.toLowerCase() === 'unauthenticated';

    if (unauthorizedError) {
      if (!isRefreshing) {
        isRefreshing = true;
        getToken()
          .then(token => {
            isRefreshing = false;
            resolvePendingRequests(token || '');
          })
          .catch(error => {
            isRefreshing = false;
            console.error('TOKEN REFRESH ERROR:', error);
          });
      }

      return new Observable(observer => {
        addPendingRequest((token: string) => {
          operation.setContext(({ headers = {} }) => ({
            headers: {
              ...headers,
              Authorization: token,
            },
          }));
          forward(operation).subscribe(observer);
        });
      });
    }
  });

  // Expo only exposes EXPO_PUBLIC_-prefixed vars to the app bundle at runtime.
  // Same value contract as frontend's VITE_APP_API_URL: the full GraphQL endpoint URL.
  const httpLink = new HttpLink({
    uri: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
  });

  const apolloLinks = from([errorLink, authLink, httpLink]);

  const cache = new InMemoryCache();

  await persistCache({
    cache,
    storage: new AsyncStorageWrapper(AsyncStorage),
  });

  const client = new ApolloClient({
    link: apolloLinks,
    cache,
    defaultOptions: {
      query: {
        fetchPolicy: 'cache-first',
      },
      watchQuery: {
        fetchPolicy: 'cache-and-network',
      },
    },
  });

  staticApolloClient = client;

  return client;
};

export { createApolloClient, staticApolloClient };

export const useApolloClient = () => createApolloClient();
