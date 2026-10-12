import { useQuery } from "@apollo/client/react"
import { useEffect } from "react"
import { toast } from "sonner"

import Loader from "@/components/ui/loader"
import type { MeQuery, MeQueryVariables } from "@/graphql/generated/graphql"
import { FIND_MY_USER } from "@/graphql/queries/user"

const Dashboard = () => {
  const { data, error, loading } = useQuery<MeQuery, MeQueryVariables>(FIND_MY_USER)

  useEffect(() => {
    if (error) {
      toast.error("Error occurred.")
    }
  }, [error])

  return (
    <section className="container mx-auto p-2">
      <h1 className="mb-1">Dashboard page</h1>
      {loading ? (
        <Loader />
      ) : (
        data?.me && (
          <ul>
            <li>id: {data.me.id}</li>
          </ul>
        )
      )}
    </section>
  )
}

export default Dashboard
