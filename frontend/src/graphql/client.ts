import { InMemoryCache } from "@apollo/client/cache"
import { ApolloClient } from "@apollo/client/core"
import { CombinedGraphQLErrors } from "@apollo/client/errors"
import { ApolloLink } from "@apollo/client/link"
import { SetContextLink } from "@apollo/client/link/context"
import { ErrorLink } from "@apollo/client/link/error"
import { HttpLink } from "@apollo/client/link/http"
import { fetchAuthSession } from "aws-amplify/auth"
import { from } from "rxjs"
import { switchMap } from "rxjs/operators"

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_APP_API_URL,
})

const authLink = new SetContextLink(async prevContext => {
  const session = await fetchAuthSession()
  const token = session.tokens?.accessToken?.toString()

  return {
    ...prevContext,
    headers: {
      ...prevContext.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }
})

const errorLink = new ErrorLink(({ error, forward, operation }) => {
  const isUnauthenticated = CombinedGraphQLErrors.is(error) ? error.errors.some(err => err.extensions?.code === "UNAUTHENTICATED") : true

  if (isUnauthenticated) {
    return from(fetchAuthSession({ forceRefresh: true })).pipe(switchMap(() => forward(operation)))
  }
})

const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
})

export default client
