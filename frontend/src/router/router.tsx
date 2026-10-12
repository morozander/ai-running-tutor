import { createBrowserRouter, type RouteObject } from "react-router"
import ProtectedRoute from "@/components/protected-route"
import NoAccess from "@/pages/403"
import NotFound from "@/pages/404"
import Blog from "@/pages/blog/blog"
import Callback from "@/pages/callback/callback"
import Dashboard from "@/pages/dashboard/dashboard"
import ErrorPage from "@/pages/error-page"

import FormDemo from "@/pages/form-demo/form-demo"
import Home from "@/pages/home/home"
import Layout from "@/pages/layout"
import Login from "@/pages/login/login"
import MyDocument from "@/pages/pdf-document/pdf-document"
import Post from "@/pages/post/post"
import SignUp from "@/pages/sign-up/sign-up"

const router = [
  {
    path: "/",
    Component: Layout,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        Component: Home,
      },
      {
        path: "/",
        Component: ProtectedRoute,
        children: [
          {
            path: "/dashboard",
            Component: Dashboard,
          },
          {
            path: "/form",
            Component: FormDemo,
          },
          {
            path: "/pdf",
            Component: MyDocument,
          },
        ],
      },
      {
        path: "/blog",
        Component: Blog,
      },

      {
        path: "/blog/:slug",
        Component: Post,
      },
      {
        path: "/login",
        Component: Login,
      },
      {
        path: "/sign-up",
        Component: SignUp,
      },
      {
        path: "/callback",
        Component: Callback,
      },
    ],
  },
  {
    path: "/403",
    Component: NoAccess,
  },
  {
    path: "/404",
    Component: NotFound,
  },
]

export default createBrowserRouter(router as RouteObject[], {
  basename: import.meta.env.VITE_BASE_PATH || "/",
})
