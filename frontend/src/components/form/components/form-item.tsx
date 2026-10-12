import { type ComponentProps, useId } from "react"

import { FormItemContext } from "@/components/form/form"
import cn from "@/lib/cn/cn"

type FormItemProps = ComponentProps<"div">

function FormItem({ className, ...props }: FormItemProps) {
  const id = useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn("grid gap-2", className)} {...props} />
    </FormItemContext.Provider>
  )
}

export default FormItem
