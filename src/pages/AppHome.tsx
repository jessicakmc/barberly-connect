import { Navigate } from "react-router";
import { useAuthedUser } from "@/components/RequireAuth";
import { homePathForRole, roleOf, useProfile } from "@/lib/useProfile";

/**
 * Post-login hub (/app). Shops go to their dashboard, admin to the payout builder,
 * customers to the barber marketplace.
 */
export function AppHome() {
  const user = useAuthedUser();
  const { data: profile, isPending } = useProfile(user.id);

  if (isPending) return null;
  return <Navigate to={homePathForRole(roleOf(profile))} replace />;
}
