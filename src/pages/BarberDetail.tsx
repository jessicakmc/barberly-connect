import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { format } from "date-fns";
import { ArrowLeft, MapPin } from "lucide-react";
import { BookDialog } from "@/components/BookDialog";
import { Footer } from "@/components/Footer";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { SiteHeader } from "@/components/SiteHeader";
import { localTimezoneLabel, useBarberAvailability, usePublicBarber } from "@/lib/bookingData";
import { errMessage } from "@/lib/errors";
import { formatMoney, settingsOrDefault, usePlatformSettings } from "@/lib/platform";
import { CATEGORY_LABEL, type ServiceCategory } from "@/lib/shopData";
import { useAuth } from "@/lib/useAuth";
import { useDocumentMeta } from "@/lib/useDocumentMeta";

/** Public barber detail: portfolio carousel → info → services → open slots → Book (dialog). */
export function BarberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { data, isPending, error } = usePublicBarber(id);
  const { data: slots = [] } = useBarberAvailability(id);
  const { data: settings } = usePlatformSettings();
  const [open, setOpen] = useState(false);
  useDocumentMeta(
    data?.barber ? `${data.barber.name} — Barberly` : "Barber — Barberly",
    "Book an appointment.",
  );

  const freeByDay = useMemo(() => {
    const map = new Map<string, { label: string; times: string[] }>();
    for (const s of slots) {
      if (s.held) continue;
      const d = new Date(s.starts_at);
      const key = format(d, "yyyy-MM-dd");
      const entry = map.get(key) ?? { label: format(d, "EEE d MMM"), times: [] };
      entry.times.push(format(d, "HH:mm"));
      map.set(key, entry);
    }
    return [...map.values()];
  }, [slots]);

  function onBook() {
    if (!user) {
      navigate(`/sign-in?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setOpen(true);
  }

  const slotMinutes = settingsOrDefault(settings).slot_minutes;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link
          to="/barbers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> All barbers
        </Link>

        {error ? (
          <p className="mt-8 text-sm text-destructive">
            {errMessage(error, "Couldn't load this barber.")}
          </p>
        ) : isPending ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : !data ? (
          <p className="mt-8 text-sm text-muted-foreground">This barber doesn't exist.</p>
        ) : (
          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <PhotoCarousel photos={data.photos} barberName={data.barber.name} />

            <div>
              <h1 className="text-3xl font-medium sm:text-4xl">{data.barber.name}</h1>
              {data.barber.address && (
                <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-4" aria-hidden /> {data.barber.address}
                </p>
              )}
              {data.barber.intro && (
                <p className="mt-4 whitespace-pre-line text-muted-foreground">
                  {data.barber.intro}
                </p>
              )}

              <button
                type="button"
                onClick={onBook}
                disabled={authLoading || data.services.length === 0}
                className="btn-pill mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Book
              </button>

              <section className="mt-8">
                <h2 className="text-lg font-medium">Services</h2>
                {data.services.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No services listed yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
                    {data.services.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between px-4 py-3 text-sm"
                      >
                        <span>
                          <span className="font-medium">{s.name}</span>
                          <span className="ml-2 text-muted-foreground">
                            {CATEGORY_LABEL[s.category as ServiceCategory] ?? s.category} ·{" "}
                            {s.required_slots} slot{s.required_slots > 1 ? "s" : ""} (
                            {s.required_slots * slotMinutes} min)
                          </span>
                        </span>
                        <span className="font-semibold">{formatMoney(s.price, settings)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="mt-8">
                <h2 className="text-lg font-medium">Available slots</h2>
                <p className="text-xs text-muted-foreground">
                  Times shown in {localTimezoneLabel()}
                </p>
                {freeByDay.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No open slots right now.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {freeByDay.map((d) => (
                      <div key={d.label}>
                        <p className="text-sm font-medium">{d.label}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {d.times.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
      <Footer />

      {data && id && (
        <BookDialog
          open={open}
          onOpenChange={setOpen}
          barberId={id}
          barberName={data.barber.name}
          services={data.services}
          slots={slots}
        />
      )}
    </div>
  );
}
