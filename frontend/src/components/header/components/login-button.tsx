import { useNavigate } from "react-router"

import Button from "@/components/ui/button"
import useAuth from "@/context/auth-provider/useAuth"

function LoginButton() {
  const { isAuthenticated, signOut } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) {
    return (
      <Button className="cursor-pointer" onClick={() => signOut()}>
        Log Out
      </Button>
    )
  }

  return (
    <Button className="cursor-pointer" onClick={() => navigate("/login")}>
      Login
    </Button>
  )
}

export default LoginButton
