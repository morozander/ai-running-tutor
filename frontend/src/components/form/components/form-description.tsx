import type { ComponentProps } from "react"

import useFormField from "@/components/form/hooks/useFormField"
import cn from "@/lib/cn/cn"

type FormDescriptionProps = ComponentProps<"p">

function FormDescription({ className, ...props }: FormDescriptionProps) {
  const { formDescriptionId } = useFormField()

  return <p data-slot="form-description" id={formDescriptionId} className={cn("text-muted-foreground text-sm", className)} {...props} />
}

export default FormDescription
