/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core"
export type Maybe<T> = T | null
export type InputMaybe<T> = T | null | undefined
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> }
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never }
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: any; output: any }
}

export type AuthTokens = {
  __typename?: "AuthTokens"
  accessToken: Scalars["String"]["output"]
  expiresIn: Scalars["Float"]["output"]
  idToken: Scalars["String"]["output"]
  refreshToken: Scalars["String"]["output"]
  tokenType: Scalars["String"]["output"]
}

export type ConfirmRegistrationInput = {
  code: Scalars["String"]["input"]
  email: Scalars["String"]["input"]
}

export type ConfirmationResponse = {
  __typename?: "ConfirmationResponse"
  message: Scalars["String"]["output"]
  success: Scalars["Boolean"]["output"]
}

export type LoginInput = {
  email: Scalars["String"]["input"]
  password: Scalars["String"]["input"]
}

export type LoginResponse = {
  __typename?: "LoginResponse"
  email: Scalars["String"]["output"]
  message: Scalars["String"]["output"]
  tokens: AuthTokens
  userId: Scalars["String"]["output"]
}

export type Mutation = {
  __typename?: "Mutation"
  /** Confirm registration with email verification code */
  confirmRegistration: ConfirmationResponse
  /** Authenticate user and get access tokens */
  login: LoginResponse
  /** Refresh access token using refresh token */
  refreshToken: AuthTokens
  /** Register a new user account */
  registerUser: RegistrationResponse
  /** Resend email verification code */
  resendVerificationCode: ConfirmationResponse
}

export type MutationconfirmRegistrationArgs = {
  input: ConfirmRegistrationInput
}

export type MutationloginArgs = {
  input: LoginInput
}

export type MutationrefreshTokenArgs = {
  input: RefreshTokenInput
}

export type MutationregisterUserArgs = {
  input: RegisterUserInput
}

export type MutationresendVerificationCodeArgs = {
  input: ResendVerificationInput
}

export type Query = {
  __typename?: "Query"
  /** Get the currently authenticated user */
  me: User
  /** Get a user by ID (admin only) */
  user: User
}

export type QueryuserArgs = {
  id: Scalars["ID"]["input"]
}

export type RefreshTokenInput = {
  refreshToken: Scalars["String"]["input"]
}

export type RegisterUserInput = {
  email: Scalars["String"]["input"]
  firstName: Scalars["String"]["input"]
  lastName?: InputMaybe<Scalars["String"]["input"]>
  password: Scalars["String"]["input"]
}

export type RegistrationResponse = {
  __typename?: "RegistrationResponse"
  confirmationRequired: Scalars["Boolean"]["output"]
  email: Scalars["String"]["output"]
  message: Scalars["String"]["output"]
  userId: Scalars["String"]["output"]
}

export type ResendVerificationInput = {
  email: Scalars["String"]["input"]
}

export type User = {
  __typename?: "User"
  createdAt: Scalars["DateTime"]["output"]
  email: Scalars["String"]["output"]
  firstName: Scalars["String"]["output"]
  fullName: Scalars["String"]["output"]
  id: Scalars["ID"]["output"]
  lastLoginAt?: Maybe<Scalars["DateTime"]["output"]>
  lastName: Scalars["String"]["output"]
  role: UserRole
  updatedAt: Scalars["DateTime"]["output"]
}

/** User role for access control */
export type UserRole = "ADMIN" | "USER"

export type UserFieldsFragment = { __typename?: "User"; id: string }

export type MeQueryVariables = Exact<{ [key: string]: never }>

export type MeQuery = { __typename?: "Query"; me: { __typename?: "User" } & UserFieldsFragment }

export const UserFieldsFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "UserFields" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "User" } },
      selectionSet: { kind: "SelectionSet", selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }] },
    },
  ],
} as unknown as DocumentNode<UserFieldsFragment, unknown>
export const MeDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "Me" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "me" },
            selectionSet: { kind: "SelectionSet", selections: [{ kind: "FragmentSpread", name: { kind: "Name", value: "UserFields" } }] },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "UserFields" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "User" } },
      selectionSet: { kind: "SelectionSet", selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }] },
    },
  ],
} as unknown as DocumentNode<MeQuery, MeQueryVariables>
