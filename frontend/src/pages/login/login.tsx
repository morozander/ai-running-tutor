import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, Navigate } from "react-router"
import { toast } from "sonner"

import InputField from "@/components/form/components/input-field"
import Form from "@/components/form/form"
import GoogleIcon from "@/components/icons/google-icon"
import Button from "@/components/ui/button"
import useAuth from "@/context/auth-provider/useAuth"
import validation, { type SignInValues } from "@/pages/login/validation"

function Login() {
  const { isAuthenticated, signIn, signInWithGoogle } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SignInValues>({
    resolver: validation,
    defaultValues: {
      username: "",
      password: "",
    },
  })

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(values: SignInValues) {
    setIsSubmitting(true)
    try {
      await signIn(values)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    try {
      await signInWithGoogle()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed.")
    }
  }

  return (
    <section className="container mx-auto flex min-h-[80vh] items-center justify-center p-2">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center font-bold text-2xl">Sign In</h1>

        <Button type="button" variant="outline" className="w-full cursor-pointer gap-3" onClick={handleGoogleSignIn}>
          <GoogleIcon />
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <InputField control={form.control} name="username" label="Username" placeholder="Enter username" />
            <InputField control={form.control} name="password" label="Password" placeholder="Enter password" type="password" />
            <Button className="w-full cursor-pointer" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Form>
        <p className="text-center text-muted-foreground text-sm">
          Don't have an account?{" "}
          <Link to="/sign-up" className="text-primary underline-offset-4 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </section>
  )
}

export default Login
