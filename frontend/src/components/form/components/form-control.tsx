import { Slot } from "@radix-ui/react-slot"
import type { ComponentProps } from "react"

import useFormField from "@/components/form/hooks/useFormField"

type FormControlProps = ComponentProps<typeof Slot>

function FormControl({ ...props }: FormControlProps) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  )
}

export default FormControl
