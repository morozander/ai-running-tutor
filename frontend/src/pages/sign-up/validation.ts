import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const signUpSchema = z
  .object({
    username: z.string().min(2, { message: "Username must be at least 2 characters." }),
    email: z.string().email({ message: "Invalid email address." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export type SignUpValues = z.infer<typeof signUpSchema>

export const signUpValidation = zodResolver(signUpSchema)

const confirmSchema = z.object({
  code: z.string().min(1, { message: "Confirmation code is required." }),
})

export type ConfirmValues = z.infer<typeof confirmSchema>

export const confirmValidation = zodResolver(confirmSchema)
