import { ApolloProvider } from "@apollo/client/react"
import type { ReactNode } from "react"

import client from "@/graphql/client"

function GraphQLProvider({ children }: { children: ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>
}

export default GraphQLProvider
