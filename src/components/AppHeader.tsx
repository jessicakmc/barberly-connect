import { Link, NavLink, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { BecomeShopButton } from "@/components/BecomeShopButton";
import { roleOf, useProfile } from "@/lib/useProfile";
import { cn } from "@/lib/utils";

export function AppHeader({ user }: { user: User }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isPending } = useProfile(user.id);
  const role = roleOf(profile);
  const isShop = role === "shop";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/sign-in", { replace: true });
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm transition-colors",
      isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            to={isShop ? "/shop" : "/app"}
            className="font-display text-2xl font-semibold tracking-tight"
          >
            Barberly
          </Link>
          {isShop && (
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Shop">
              <NavLink to="/shop" end className={navClass}>
                My shop
              </NavLink>
              <NavLink to="/shop/bookings" className={navClass}>
                Schedule &amp; services
              </NavLink>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden truncate text-muted-foreground md:inline">
            Hi{" "}
            <span className="font-medium text-foreground">
              {profile?.display_name?.trim() || user.email}
            </span>
          </span>
          {isShop && (
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
              shop
            </span>
          )}
          {!isPending && role === "customer" && (
            <BecomeShopButton userId={user.id} className="hidden sm:inline-flex" />
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            Sign Out
          </button>
        </div>
      </div>
      {isShop && (
        <nav
          className="mx-auto flex max-w-6xl gap-1 px-4 pb-3 sm:hidden"
          aria-label="Shop (mobile)"
        >
          <NavLink to="/shop" end className={navClass}>
            My shop
          </NavLink>
          <NavLink to="/shop/bookings" className={navClass}>
            Schedule &amp; services
          </NavLink>
        </nav>
      )}
    </header>
  );
}
