import { createBrowserRouter, Navigate } from "react-router";

import { RootLayout, NotFoundComponent, ErrorComponent } from "@/components/RootLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Landing } from "@/pages/Landing";
import { AuthPage } from "@/pages/Auth";
import { AppHome } from "@/pages/AppHome";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorComponent />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/sign-in", element: <AuthPage mode="signin" /> },
      { path: "/sign-up", element: <AuthPage mode="signup" /> },
      {
        element: <RequireAuth />,
        children: [{ path: "/app", element: <AppHome /> }],
      },
      // Legacy paths from the TanStack Start version
      { path: "/login", element: <Navigate to="/sign-in" replace /> },
      { path: "/barbers", element: <Navigate to="/app" replace /> },
      { path: "*", element: <NotFoundComponent /> },
    ],
  },
]);
