import { Link } from "react-router"

import Button from "@/components/ui/button"

function Blog() {
  return (
    <section className="container mx-auto p-2">
      <h1 className="mb-1">Blog page</h1>
      <Link to={"/blog/first-post"}>
        <Button>post #1</Button>
      </Link>
    </section>
  )
}

export default Blog
