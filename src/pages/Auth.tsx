import { Link, useNavigate } from "react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/useAuth";
import { fetchProfile, homePathForRole } from "@/lib/useProfile";
import { useDocumentMeta } from "@/lib/useDocumentMeta";

export type Mode = "signin" | "signup";

export function AuthPage({ mode }: { mode: Mode }) {
  useDocumentMeta(
    mode === "signup" ? "Sign up — Barberly" : "Sign in — Barberly",
    "Sign in or create a Barberly account as a customer or barber.",
  );
  const navigate = useNavigate();
  const [role, setRole] = useState<AppRole>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Route by profiles.role (shop -> shop dashboard, customer -> customer home).
  async function goHome(userId: string) {
    let role: string | null = null;
    try {
      role = (await fetchProfile(userId))?.role ?? null;
    } catch {
      role = null;
    }
    navigate(homePathForRole(role), { replace: true });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void goHome(data.session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // The confirmation link lands on /sign-in, which routes by profiles.role.
          options: { data: { role }, emailRedirectTo: `${window.location.origin}/sign-in` },
        });
        if (error) throw error;
        if (!data.session || !data.user) {
          setNotice("Check your email to confirm your account, then sign in.");
          return;
        }
        await goHome(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await goHome(data.user.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight">
          Barberly
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="fade-up w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
          <p className="eyebrow">{mode === "signup" ? "Create account" : "Welcome back"}</p>
          <h1 className="mt-2 text-4xl font-medium">
            {mode === "signup" ? "Join Barberly" : "Sign in"}
          </h1>

          {mode === "signup" && (
            <div
              role="tablist"
              aria-label="Account type"
              className="mt-6 grid grid-cols-2 rounded-full bg-muted p-1"
            >
              {(
                [
                  { value: "customer", label: "Customer" },
                  { value: "shop", label: "Barber" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={role === opt.value}
                  onClick={() => setRole(opt.value)}
                  className={`rounded-full py-2 text-sm font-medium transition-colors ${
                    role === opt.value
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {notice && (
              <p role="status" className="text-sm text-muted-foreground">
                {notice}
              </p>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-pill w-full py-3">
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to Barberly?"}{" "}
            <button
              type="button"
              onClick={() => {
                navigate(mode === "signup" ? "/sign-in" : "/sign-up");
                setError(null);
              }}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
