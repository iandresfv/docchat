import { Navigate, type RouteObject } from "react-router"

import { AppLayout } from "@/components/shared/app-layout"
import { FullPageSpinner } from "@/components/shared/full-page-spinner"
import { NotFoundPage } from "@/components/shared/not-found-page"
import { RouteError } from "@/components/shared/route-error"

export const routes: RouteObject[] = [
  {
    path: "/",
    errorElement: <RouteError />,
    hydrateFallbackElement: <FullPageSpinner />,
    children: [
      {
        element: <AppLayout />,
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
