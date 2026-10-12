import { gql } from "@apollo/client/core"
// Just an example query
export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
  }
`

export const FIND_MY_USER = gql`
  ${USER_FIELDS}
  query Me {
    me {
      ...UserFields
    }
  }
`
