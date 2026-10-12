import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const signInSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
})

export type SignInValues = z.infer<typeof signInSchema>

const validation = zodResolver(signInSchema)

export default validation
