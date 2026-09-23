import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({ user }: { user: User }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isShop = user.user_metadata?.['role'] === "shop";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/sign-in", { replace: true });
  }

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight">
          Barberly
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden truncate text-muted-foreground sm:inline">
            Hi <span className="font-medium text-foreground">{user.email}</span>
          </span>
          {isShop && (
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
              barber
            </span>
          )}
          <button type="button" onClick={handleSignOut} className="btn-pill">
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
