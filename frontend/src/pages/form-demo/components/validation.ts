import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  age: z.number(),
})

export type FormValues = z.infer<typeof formSchema>

const validation = zodResolver(formSchema)

export default validation
