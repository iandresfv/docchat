import { Navigate, type RouteObject } from "react-router"

import { AppLayout } from "@/components/shared/app-layout"
import { FullPageSpinner } from "@/components/shared/full-page-spinner"
import { NotFoundPage } from "@/components/shared/not-found-page"
import { RouteError } from "@/components/shared/route-error"
import { AuthLayout } from "@/features/auth/components/auth-layout"
import { UserMenu } from "@/features/auth/components/user-menu"
import {
  redirectIfAuthenticated,
  requireAuth,
} from "@/features/auth/middleware"
import { SessionWatcher } from "@/features/auth/session-watcher"

export const routes: RouteObject[] = [
  {
    path: "/",
    errorElement: <RouteError />,
    hydrateFallbackElement: <FullPageSpinner />,
    children: [
      {
        element: <AuthLayout />,
        middleware: [redirectIfAuthenticated],
        errorElement: <RouteError />,
        children: [
          {
            path: "signin",
            lazy: async () => ({
              Component: (
                await import("@/features/auth/components/signin-page")
              ).SigninPage,
            }),
          },
          {
            path: "signup",
            lazy: async () => ({
              Component: (
                await import("@/features/auth/components/signup-page")
              ).SignupPage,
            }),
          },
        ],
      },
      {
        element: (
          <>
            <SessionWatcher />
            <AppLayout sidebarFooter={<UserMenu />} />
          </>
        ),
        middleware: [requireAuth],
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Navigate to="/documents" replace /> },
          {
            path: "documents",
            errorElement: <RouteError />,
            lazy: async () => ({
              Component: (
                await import("@/features/library/components/library-page")
              ).LibraryPage,
            }),
          },
          {
            path: "documents/:pdfId",
            errorElement: <RouteError />,
            lazy: async () => ({
              Component: (
                await import("@/features/workspace/components/workspace-page")
              ).WorkspacePage,
            }),
          },
          {
            path: "experiments",
            errorElement: <RouteError />,
            lazy: async () => ({
              Component: (
                await import("@/features/experiments/components/experiments-page")
              ).ExperimentsPage,
            }),
          },
          {
            path: "settings",
            errorElement: <RouteError />,
            lazy: async () => ({
              Component: (
                await import("@/features/settings/components/settings-page")
              ).SettingsPage,
            }),
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]
