import {
  confirmSignUp as amplifyConfirmSignUp,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
  fetchAuthSession,
  getCurrentUser,
  signInWithRedirect,
} from "aws-amplify/auth"
import { Hub } from "aws-amplify/utils"
import { createContext, type ReactNode, useCallback, useEffect, useRef, useState } from "react"

type AuthUser = {
  userId: string
  username: string
}

type SignInInput = {
  username: string
  password: string
}

type SignUpInput = {
  email: string
  username: string
  password: string
}

type ConfirmSignUpInput = {
  username: string
  confirmationCode: string
}

type AuthContextValue = {
  user: AuthUser | undefined
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (input: SignInInput) => Promise<void>
  signUp: (input: SignUpInput) => Promise<{ isConfirmed: boolean }>
  confirmSignUp: (input: ConfirmSignUpInput) => Promise<void>
  signOut: () => Promise<void>
  getAccessToken: () => Promise<string | undefined>
  signInWithGoogle: () => Promise<void>
}

const stub = (): never => {
  throw new Error("You forgot to wrap your component in <AuthProvider>.")
}

export const AuthContext = createContext<AuthContextValue>({
  user: undefined,
  isLoading: true,
  isAuthenticated: false,
  signIn: stub,
  signUp: stub,
  confirmSignUp: stub,
  signOut: stub,
  getAccessToken: stub,
  signInWithGoogle: stub,
})

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>()
  const [isLoading, setIsLoading] = useState(true)
  const didInitialise = useRef(false)

  const checkUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser({ username: currentUser.username, userId: currentUser.userId })
    } catch {
      setUser(undefined)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (didInitialise.current) {
      return
    }
    didInitialise.current = true
    checkUser()
  }, [checkUser])

  useEffect(() => {
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
          checkUser()
          break
        case "signedOut":
          setUser(undefined)
          break
      }
    })

    return unsubscribe
  }, [checkUser])

  const signIn = async ({ username, password }: SignInInput) => {
    await amplifySignIn({ username, password })
  }

  const signInWithGoogle = async () => {
    await signInWithRedirect({ provider: "Google" })
  }

  const signUp = async ({ username, password, email }: SignUpInput) => {
    const { isSignUpComplete } = await amplifySignUp({
      username,
      password,
      options: { userAttributes: { email } },
    })
    return { isConfirmed: isSignUpComplete }
  }

  const confirmSignUp = async ({ username, confirmationCode }: ConfirmSignUpInput) => {
    await amplifyConfirmSignUp({ username, confirmationCode })
  }

  const signOut = async () => {
    await amplifySignOut()
    setUser(undefined)
  }

  const getAccessToken = async (): Promise<string | undefined> => {
    const session = await fetchAuthSession()
    return session.tokens?.accessToken?.toString()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        confirmSignUp,
        signOut,
        getAccessToken,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
