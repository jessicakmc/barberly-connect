import { Link, useLocation } from "react-router";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/lib/useAuth";

/** Header for public buyer pages: the signed-in header when logged in, otherwise a Sign-in button. */
export function SiteHeader() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (user) return <AppHeader user={user} />;

  const next = encodeURIComponent(location.pathname + location.search);
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-display text-2xl font-semibold tracking-tight">
            Barberly
          </Link>
          <Link
            to="/barbers"
            className="hidden rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Barbers
          </Link>
        </div>
        {!loading && (
          <Link to={`/sign-in?next=${next}`} className="btn-pill">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
