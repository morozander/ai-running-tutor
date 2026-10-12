import { Navigate, Outlet } from "react-router"
import Loader from "@/components/ui/loader"
import useAuth from "@/context/auth-provider/useAuth"

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <Loader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
