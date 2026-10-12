import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: '/tmp/schema.graphql',
      sortSchema: true,
      path: 'api/v1',
      playground: false, // Disable old playground, use Apollo Sandbox instead
      introspection: process.env.NODE_ENV !== 'production',
      plugins: [ApolloServerPluginLandingPageLocalDefault()],

      // Context setup for auth
      context: ({ req, res }: { req: Request; res: Response }) => ({
        req,
        res,
      }),

      // Lambda optimization: disable subscriptions
      // subscriptions: false,

      // Error formatting (ONLY FOR DEV ENVS)
      formatError: (error) => {
        const originalError = error.extensions?.originalError as
          | { message: string; statusCode?: number }
          | undefined;

        return {
          message: originalError?.message || error.message,
          code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
          statusCode: originalError?.statusCode || 500,
          path: error.path,
        };
      },
    }),
  ],
})
export class GraphqlModule {}
