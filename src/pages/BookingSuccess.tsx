import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { useAuthedUser } from "@/components/RequireAuth";
import { fetchBookingStatus, type BookingStatus } from "@/lib/bookingData";
import { useDocumentMeta } from "@/lib/useDocumentMeta";

const POLL_MS = 1500;
const GIVE_UP_MS = 60_000;

/**
 * Landing page after Stripe Checkout. UX ONLY: it polls the booking until the webhook has
 * marked it `paid`. It never writes anything — the webhook is the source of truth.
 */
export function BookingSuccess() {
  useDocumentMeta("Payment — Barberly", "Confirming your payment.");
  const user = useAuthedUser();
  const [params] = useSearchParams();
  const bookingId = params.get("booking_id");
  const [status, setStatus] = useState<BookingStatus | "unknown" | "slow">("unknown");

  useEffect(() => {
    if (!bookingId) return;
    let stopped = false;
    const started = Date.now();
    async function tick() {
      try {
        const row = await fetchBookingStatus(bookingId ?? "");
        if (stopped) return;
        if (row?.status === "paid" || row?.status === "cancelled") {
          setStatus(row.status);
          return;
        }
        if (row) setStatus(row.status);
      } catch {
        // keep polling; a transient read error is fine
      }
      if (Date.now() - started > GIVE_UP_MS) {
        setStatus("slow");
        return;
      }
      if (!stopped) window.setTimeout(tick, POLL_MS);
    }
    void tick();
    return () => {
      stopped = true;
    };
  }, [bookingId]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-md rounded-3xl border border-border bg-card p-10 text-center shadow-card">
          {!bookingId ? (
            <p className="text-muted-foreground">No booking to check.</p>
          ) : status === "paid" ? (
            <>
              <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden />
              <h1 className="mt-4 text-3xl font-medium">Booking confirmed!</h1>
              <p className="mt-2 text-muted-foreground">
                Payment received — your time slot is yours. 預約成功！
              </p>
            </>
          ) : status === "cancelled" ? (
            <>
              <h1 className="text-2xl font-medium">This booking was cancelled</h1>
              <p className="mt-2 text-muted-foreground">
                If you were charged, please contact us so we can sort it out.
              </p>
            </>
          ) : status === "slow" ? (
            <>
              <h1 className="text-2xl font-medium">Still confirming your payment…</h1>
              <p className="mt-2 text-muted-foreground">
                This is taking longer than usual. Check My bookings in a minute — it will show
                “Paid” as soon as Stripe confirms.
              </p>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto size-10 animate-spin text-muted-foreground" aria-hidden />
              <h1 className="mt-4 text-2xl font-medium">Processing your payment…</h1>
              <p className="mt-2 text-muted-foreground">付款處理中，請稍候。</p>
            </>
          )}
          <Link to="/bookings" className="btn-pill mt-8 inline-flex">
            My bookings
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
