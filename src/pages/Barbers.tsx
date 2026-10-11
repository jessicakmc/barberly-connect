import { useMemo, useState } from "react";
import { Link } from "react-router";
import { MapPin, Scissors, Search } from "lucide-react";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { usePublicBarbers, type BarberListing } from "@/lib/bookingData";
import { errMessage } from "@/lib/errors";
import { formatMoney, usePlatformSettings, type PlatformSettings } from "@/lib/platform";
import { CATEGORY_LABEL, SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/shopData";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { cn } from "@/lib/utils";

type Filter = "all" | ServiceCategory;

/** Public marketplace: browse every barber, search by name/address, filter by service category. */
export function Barbers() {
  useDocumentMeta("Barbers — Barberly", "Browse barbers and book a slot.");
  const { data: barbers, isPending, error } = usePublicBarbers();
  const { data: settings } = usePlatformSettings();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (barbers ?? []).filter((b) => {
      if (filter !== "all" && !b.services.some((s) => s.category === filter)) return false;
      if (!q) return true;
      return [b.name, b.address ?? "", b.intro ?? ""].some((v) => v.toLowerCase().includes(q));
    });
  }, [barbers, query, filter]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <p className="eyebrow">Find your stylist</p>
        <h1 className="mt-2 text-3xl font-medium sm:text-4xl">Barbers</h1>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex w-full items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm shadow-card sm:max-w-sm">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or address"
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by service">
            {(["all", ...SERVICE_CATEGORIES] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  filter === f
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:bg-secondary",
                )}
              >
                {f === "all" ? "All" : CATEGORY_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="mt-10 text-sm text-destructive">
            {errMessage(error, "Couldn't load barbers.")}
          </p>
        ) : isPending ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading barbers…</p>
        ) : visible.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">No barbers match your search yet.</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((b) => (
              <BarberListingCard key={b.id} barber={b} settings={settings} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function BarberListingCard({
  barber,
  settings,
}: {
  barber: BarberListing;
  settings: PlatformSettings | undefined;
}) {
  const categories = [...new Set(barber.services.map((s) => s.category))] as ServiceCategory[];
  const from = barber.services.length ? Math.min(...barber.services.map((s) => s.price)) : null;

  return (
    <Link
      to={`/barbers/${barber.id}`}
      className="card-lift group block overflow-hidden rounded-3xl border border-border bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {barber.coverUrl ? (
          <img
            src={barber.coverUrl}
            alt={`${barber.name}'s work`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Scissors className="size-10" aria-hidden />
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-sans text-lg font-semibold tracking-normal">{barber.name}</h2>
            {barber.address && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {barber.address}
              </p>
            )}
          </div>
          {from !== null && (
            <p className="shrink-0 text-right text-sm">
              <span className="text-muted-foreground">from</span>{" "}
              <span className="font-semibold">{formatMoney(from, settings)}</span>
            </p>
          )}
        </div>
        {barber.intro && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{barber.intro}</p>
        )}
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <span
                key={c}
                className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
              >
                {CATEGORY_LABEL[c] ?? c}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
