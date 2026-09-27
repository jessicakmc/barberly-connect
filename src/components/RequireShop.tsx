import { Navigate, Outlet } from "react-router";
import { useAuthedUser } from "@/components/RequireAuth";
import { roleOf, useProfile } from "@/lib/useProfile";

/** Gate for /shop/*: only `profiles.role = 'shop'` gets through; everyone else goes to the customer home. */
export function RequireShop() {
  const user = useAuthedUser();
  const { data: profile, isPending, isError } = useProfile(user.id);

  if (isPending) return null;
  if (isError || roleOf(profile) !== "shop") return <Navigate to="/app" replace />;
  return <Outlet context={{ user }} />;
}
