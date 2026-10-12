import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form"

import FormControl from "@/components/form/components/form-control"
import FormDescription from "@/components/form/components/form-description"
import FormField from "@/components/form/components/form-field"
import FormItem from "@/components/form/components/form-item"
import FormLabel from "@/components/form/components/form-label"
import FormMessage from "@/components/form/components/form-message"
import Input from "@/components/ui/input"

interface InputFieldProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>
  extends Pick<ControllerProps<TFieldValues, TName>, "name" | "control"> {
  label: string
  placeholder: string
  type?: string
  className?: string
  description?: string
}

function InputField<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>({
  control,
  name,
  label,
  placeholder,
  type,
  className,
  description,
}: InputFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export default InputField
