import { screen } from "@testing-library/dom"

import FormDemo from "@/pages/form-demo/form-demo"
import render from "@/tests/render"

test("should render form properly", () => {
  render(<FormDemo />)

  expect(screen.getByTestId("form")).toBeInTheDocument()
})
