import { Navigate, Outlet } from "react-router";
import { useAuthedUser } from "@/components/RequireAuth";
import { roleOf, useProfile } from "@/lib/useProfile";

/**
 * Gate for /admin/*: only `profiles.role = 'admin'` gets through; everyone else goes to /app.
 * This is UX only — the real enforcement is RLS on payouts/bookings/profiles plus the
 * admin-guarded build_payout / mark_payout_transferred / cancel_payout RPCs.
 */
export function RequireAdmin() {
  const user = useAuthedUser();
  const { data: profile, isPending, isError } = useProfile(user.id);

  if (isPending) return null;
  if (isError || roleOf(profile) !== "admin") return <Navigate to="/app" replace />;
  return <Outlet context={{ user }} />;
}
