import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, Navigate, useNavigate } from "react-router"
import { toast } from "sonner"

import InputField from "@/components/form/components/input-field"
import Form from "@/components/form/form"
import GoogleIcon from "@/components/icons/google-icon"
import Button from "@/components/ui/button"
import useAuth from "@/context/auth-provider/useAuth"
import { type ConfirmValues, confirmValidation, type SignUpValues, signUpValidation } from "@/pages/sign-up/validation"

function SignUp() {
  const { isAuthenticated, signUp, confirmSignUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingUsername, setPendingUsername] = useState<string | null>(null)

  const signUpForm = useForm<SignUpValues>({
    resolver: signUpValidation,
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const confirmForm = useForm<ConfirmValues>({
    resolver: confirmValidation,
    defaultValues: { code: "" },
  })

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSignUp(values: SignUpValues) {
    setIsSubmitting(true)
    try {
      const { isConfirmed } = await signUp(values)
      if (isConfirmed) {
        toast.success("Account created! You can sign in now.")
        navigate("/login")
      } else {
        setPendingUsername(values.username)
        toast.info("Check your email for a confirmation code.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign up failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onConfirm(values: ConfirmValues) {
    if (!pendingUsername) return
    setIsSubmitting(true)
    try {
      await confirmSignUp({ username: pendingUsername, confirmationCode: values.code })
      toast.success("Account confirmed! You can sign in now.")
      navigate("/login")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Confirmation failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (pendingUsername) {
    return (
      <section className="container mx-auto flex min-h-[80vh] items-center justify-center p-2">
        <div className="w-full max-w-sm space-y-6">
          <h1 className="text-center font-bold text-2xl">Confirm Account</h1>
          <p className="text-center text-muted-foreground text-sm">A confirmation code was sent to your email.</p>
          <Form {...confirmForm}>
            <form className="space-y-4" onSubmit={confirmForm.handleSubmit(onConfirm)}>
              <InputField control={confirmForm.control} name="code" label="Confirmation Code" placeholder="Enter code" />
              <Button className="w-full cursor-pointer" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Confirming..." : "Confirm"}
              </Button>
            </form>
          </Form>
        </div>
      </section>
    )
  }

  return (
    <section className="container mx-auto flex min-h-[80vh] items-center justify-center p-2">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center font-bold text-2xl">Sign Up</h1>

        <Button
          type="button"
          variant="outline"
          className="w-full cursor-pointer gap-3"
          onClick={async () => {
            try {
              await signInWithGoogle()
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Google sign-in failed.")
            }
          }}
        >
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

        <Form {...signUpForm}>
          <form className="space-y-4" onSubmit={signUpForm.handleSubmit(onSignUp)}>
            <InputField control={signUpForm.control} name="username" label="Username" placeholder="Choose a username" />
            <InputField control={signUpForm.control} name="email" label="Email" placeholder="Enter email" type="email" />
            <InputField control={signUpForm.control} name="password" label="Password" placeholder="Create password" type="password" />
            <InputField control={signUpForm.control} name="confirmPassword" label="Confirm Password" placeholder="Repeat password" type="password" />
            <Button className="w-full cursor-pointer" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
        </Form>
        <p className="text-center text-muted-foreground text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </section>
  )
}

export default SignUp
