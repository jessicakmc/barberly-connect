import { useState } from "react";
import { Link, Navigate } from "react-router";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { useAuthedUser } from "@/components/RequireAuth";
import { ServicesEditor } from "@/components/shop/ServicesEditor";
import { SlotPublisher } from "@/components/shop/SlotPublisher";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { useMyBarbers } from "@/lib/shopData";
import { cn } from "@/lib/utils";

/** /shop/bookings — per-barber service & price editor + slot publisher. */
export function ShopBookings() {
  useDocumentMeta("Schedule & services — Barberly", "Manage services and bookable slots.");
  const user = useAuthedUser();
  const { data: barbers, isPending } = useMyBarbers(user.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isPending) return null;
  if (!barbers || barbers.length === 0) return <Navigate to="/shop" replace />;

  const selected = barbers.find((b) => b.id === selectedId) ?? barbers[0];
  if (!selected) return <Navigate to="/shop" replace />;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-10 sm:px-6">
        <div className="fade-up">
          <p className="eyebrow">預約排程 · Schedule &amp; services</p>
          <h1 className="mt-2 text-4xl font-medium sm:text-5xl">{selected.name}</h1>
          <p className="mt-3 text-muted-foreground">
            Pick a barber, set their services and prices, then publish open time slots.{" "}
            <Link
              to="/shop"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Manage barbers
            </Link>
          </p>
        </div>

        {barbers.length > 1 && (
          <div role="tablist" aria-label="Barber" className="flex flex-wrap gap-2">
            {barbers.map((b) => (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={b.id === selected.id}
                onClick={() => setSelectedId(b.id)}
                className={cn("chip", b.id === selected.id && "chip-active")}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}

        <ServicesEditor key={`svc-${selected.id}`} barberId={selected.id} />
        <SlotPublisher key={`slots-${selected.id}`} barberId={selected.id} />
      </main>
      <Footer />
    </div>
  );
}
