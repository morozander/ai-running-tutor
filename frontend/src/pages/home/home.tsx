import { useQuery } from "@apollo/client/react"
import { useEffect } from "react"
import { useNavigate } from "react-router"

import Loader from "@/components/ui/loader"
import useAuth from "@/context/auth-provider/useAuth"
import type { MeQuery, MeQueryVariables } from "@/graphql/generated/graphql"
import { FIND_MY_USER } from "@/graphql/queries/user"

function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  const { data } = useQuery<MeQuery, MeQueryVariables>(FIND_MY_USER)

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (isAuthenticated) {
      navigate("/")
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return <Loader />
  }

  return (
    <section className="container mx-auto p-2">
      <h1>Home page</h1>
      {data?.me && <p>{data.me.id}</p>}
    </section>
  )
}

export default Home
