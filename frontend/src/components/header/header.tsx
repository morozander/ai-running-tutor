import { NavLink } from "react-router"

import reactLogo from "@/assets/react.svg"
import LoginButton from "@/components/header/components/login-button"
import ThemeToggle from "@/components/header/components/theme-toggle"
import useAuth from "@/context/auth-provider/useAuth"

const navigation = [
  { link: "/form", name: "form", protected: true },
  { link: "/pdf", name: "pdf", protected: true },
  { link: "/blog", name: "blog", protected: false },
]

function Header() {
  const { user, isAuthenticated } = useAuth()

  return (
    <header className="flex gap-4 p-2">
      <NavLink to="/">
        <img src={reactLogo} alt="logo" />
      </NavLink>
      <ul className="flex items-center gap-4">
        {navigation.map(navItem => {
          if (navItem.protected && !isAuthenticated) {
            return null
          }

          return (
            <li key={navItem.link}>
              <NavLink to={navItem.link}>{navItem.name}</NavLink>
            </li>
          )
        })}
      </ul>
      <div className="ml-auto flex items-center gap-4">
        {isAuthenticated && user && <span>{user.username}</span>}
        <ThemeToggle />
      </div>
      <LoginButton />
    </header>
  )
}

export default Header
