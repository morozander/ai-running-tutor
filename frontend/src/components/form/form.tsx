import { createContext } from "react"

import { type FieldPath, type FieldValues, FormProvider as Form } from "react-hook-form"

interface FormFieldContextValue<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> {
  name: TName
}

export const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue)

interface FormItemContextValue {
  id: string
}

export const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue)

export default Form
