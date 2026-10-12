import type * as LabelPrimitive from "@radix-ui/react-label"
import type { ComponentProps } from "react"

import useFormField from "@/components/form/hooks/useFormField"
import Label from "@/components/ui/label"
import cn from "@/lib/cn/cn"

type FormLabelProps = ComponentProps<typeof LabelPrimitive.Root>

function FormLabel({ className, ...props }: FormLabelProps) {
  const { error, formItemId } = useFormField()

  return <Label data-slot="form-label" data-error={!!error} className={cn("data-[error=true]:text-destructive", className)} htmlFor={formItemId} {...props} />
}

export default FormLabel
