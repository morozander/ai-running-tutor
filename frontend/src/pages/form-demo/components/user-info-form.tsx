import { useForm } from "react-hook-form"
import { toast } from "sonner"
import InputField from "@/components/form/components/input-field"
import Form from "@/components/form/form"
import Button from "@/components/ui/button"
import validation, { type FormValues } from "@/pages/form-demo/components/validation"

function UserInfoForm() {
  const form = useForm<FormValues>({
    resolver: validation,
    defaultValues: {
      username: "",
      age: 18,
    },
  })

  function onSubmit(_values: FormValues) {
    toast.success("Successfully submitted")
  }

  return (
    <Form {...form}>
      <form className="max-w-sm" data-testid="form" onSubmit={form.handleSubmit(onSubmit)}>
        <InputField
          className="mb-4"
          control={form.control}
          name="username"
          label="Username"
          placeholder="type name"
          description="This is your public display name"
        />
        <InputField className="mb-4" control={form.control} name="age" label="Age" placeholder="type age" />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}

export default UserInfoForm
