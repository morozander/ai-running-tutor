import { Outlet } from "react-router"
import Header from "@/components/header/header"
import Sonner from "@/components/ui/sonner"

function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <Sonner />
    </>
  )
}

export default Layout
