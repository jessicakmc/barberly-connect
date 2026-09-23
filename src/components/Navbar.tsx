import { Link } from "react-router";
import { Search } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight">
          Barberly
        </Link>

        <label className="hidden flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-card sm:flex sm:max-w-sm">
          <Search className="size-4" aria-hidden />
          <input
            type="search"
            placeholder="Search"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <Link to="/sign-in" className="btn-pill">
          Login
        </Link>
      </div>
    </header>
  );
}
