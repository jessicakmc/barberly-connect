import { createBrowserRouter, Navigate } from "react-router";

import { RootLayout, NotFoundComponent, ErrorComponent } from "@/components/RootLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireShop } from "@/components/RequireShop";
import { Landing } from "@/pages/Landing";
import { AuthPage } from "@/pages/Auth";
import { AppHome } from "@/pages/AppHome";
import { ShopOnboarding } from "@/pages/ShopOnboarding";
import { ShopBookings } from "@/pages/ShopBookings";

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
        children: [
          { path: "/app", element: <AppHome /> },
          {
            element: <RequireShop />,
            children: [
              { path: "/shop", element: <ShopOnboarding /> },
              { path: "/shop/bookings", element: <ShopBookings /> },
            ],
          },
        ],
      },
      // Legacy paths from the TanStack Start version
      { path: "/login", element: <Navigate to="/sign-in" replace /> },
      { path: "/barbers", element: <Navigate to="/app" replace /> },
      { path: "*", element: <NotFoundComponent /> },
    ],
  },
]);
