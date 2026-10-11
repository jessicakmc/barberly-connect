import { Navigate } from "react-router";
import { useAuthedUser } from "@/components/RequireAuth";
import { roleOf, useProfile } from "@/lib/useProfile";

/**
 * Post-login hub (/app). Shops go to their dashboard; customers (and admin, until the
 * admin payout page exists) go to the barber marketplace.
 */
export function AppHome() {
  const user = useAuthedUser();
  const { data: profile, isPending } = useProfile(user.id);

  if (isPending) return null;
  return <Navigate to={roleOf(profile) === "shop" ? "/shop" : "/barbers"} replace />;
}
