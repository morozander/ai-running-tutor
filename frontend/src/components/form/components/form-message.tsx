import type { ComponentProps } from "react"

import useFormField from "@/components/form/hooks/useFormField"
import cn from "@/lib/cn/cn"

type FormMessageProps = ComponentProps<"p">

function FormMessage({ className, ...props }: FormMessageProps) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : props.children

  if (!body) {
    return null
  }

  return (
    <p data-slot="form-message" id={formMessageId} className={cn("text-destructive text-sm", className)} {...props}>
      {body}
    </p>
  )
}

export default FormMessage
