import { useEffect, useState } from "react";
import { Navigate, Outlet, useOutletContext } from "react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { status: "loading" } | { status: "anon" } | { status: "authed"; user: User };

/** Client-side auth guard (replaces the TanStack `_authenticated` layout route). */
export function RequireAuth() {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setState(error || !data.user ? { status: "anon" } : { status: "authed", user: data.user });
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState(session?.user ? { status: "authed", user: session.user } : { status: "anon" });
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (state.status === "loading") return null;
  if (state.status === "anon") return <Navigate to="/sign-in" replace />;
  return <Outlet context={{ user: state.user }} />;
}

export function useAuthedUser(): User {
  return useOutletContext<{ user: User }>().user;
}
