import { createBrowserRouter, Navigate } from "react-router";

import { RootLayout, NotFoundComponent, ErrorComponent } from "@/components/RootLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireShop } from "@/components/RequireShop";
import { Landing } from "@/pages/Landing";
import { AuthPage } from "@/pages/Auth";
import { AppHome } from "@/pages/AppHome";
import { ShopOnboarding } from "@/pages/ShopOnboarding";
import { ShopBookings } from "@/pages/ShopBookings";
import { Barbers } from "@/pages/Barbers";
import { BarberDetail } from "@/pages/BarberDetail";
import { MyBookings } from "@/pages/MyBookings";
import { BookingSuccess } from "@/pages/BookingSuccess";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <ErrorComponent />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/sign-in", element: <AuthPage mode="signin" /> },
      { path: "/sign-up", element: <AuthPage mode="signup" /> },
      // Public marketplace (browsing needs no login; Book does)
      { path: "/barbers", element: <Barbers /> },
      { path: "/barbers/:id", element: <BarberDetail /> },
      {
        element: <RequireAuth />,
        children: [
          { path: "/app", element: <AppHome /> },
          { path: "/bookings", element: <MyBookings /> },
          { path: "/bookings/success", element: <BookingSuccess /> },
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
      { path: "*", element: <NotFoundComponent /> },
    ],
  },
]);
