import { useState } from "react";
import { Link } from "react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { useAuthedUser } from "@/components/RequireAuth";
import {
  bookingKeys,
  startCheckout,
  localTimezoneLabel,
  useMyBookings,
  type BookingStatus,
  type MyBooking,
} from "@/lib/bookingData";
import { errMessage } from "@/lib/errors";
import { formatMoney, usePlatformSettings } from "@/lib/platform";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<BookingStatus, string> = {
  pending_payment: "bg-sand text-accent-foreground",
  paid: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-secondary text-muted-foreground",
};

/** The signed-in customer's own bookings (RLS-scoped), with cancel. */
export function MyBookings() {
  useDocumentMeta("My bookings — Barberly", "Your appointments.");
  const user = useAuthedUser();
  const queryClient = useQueryClient();
  const { data: bookings, isPending, error } = useMyBookings(user.id);
  const { data: settings } = usePlatformSettings();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  async function pay(b: MyBooking) {
    setPaying(b.id);
    try {
      window.location.assign(await startCheckout(b.id));
    } catch (err) {
      toast.error(errMessage(err, "Couldn't start payment."));
      setPaying(null);
    }
  }

  async function cancel(b: MyBooking) {
    if (!window.confirm("Cancel this booking? The time slot will be released.")) return;
    setCancelling(b.id);
    try {
      // Only flip the status. The trg_free_slots_on_cancel trigger deletes this booking's
      // booking_slots rows, which frees the slots — never delete booking_slots from the client.
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", b.id);
      if (updateError) throw updateError;
      await queryClient.invalidateQueries({ queryKey: bookingKeys.myBookings(user.id) });
      if (b.barberId) {
        void queryClient.invalidateQueries({ queryKey: bookingKeys.availability(b.barberId) });
      }
      toast.success("Booking cancelled");
    } catch (err) {
      toast.error(errMessage(err, "Couldn't cancel the booking."));
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <p className="eyebrow">Your appointments</p>
        <h1 className="mt-2 text-3xl font-medium sm:text-4xl">My bookings</h1>
        <p className="mt-1 text-xs text-muted-foreground">Times shown in {localTimezoneLabel()}</p>

        {error ? (
          <p className="mt-8 text-sm text-destructive">
            {errMessage(error, "Couldn't load bookings.")}
          </p>
        ) : isPending ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : !bookings || bookings.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">You don't have any bookings yet.</p>
            <Link to="/barbers" className="btn-pill mt-4 inline-flex">
              Browse barbers
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {bookings.map((b) => {
              const start = b.starts_at ? new Date(b.starts_at) : null;
              const end = b.ends_at ? new Date(b.ends_at) : null;
              return (
                <li
                  key={b.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {b.serviceName}{" "}
                      <span className="font-normal text-muted-foreground">with</span>{" "}
                      {b.barberId ? (
                        <Link
                          to={`/barbers/${b.barberId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {b.barberName}
                        </Link>
                      ) : (
                        b.barberName
                      )}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {start
                        ? `${format(start, "EEE d MMM yyyy, HH:mm")}${end ? `–${format(end, "HH:mm")}` : ""}`
                        : "Time released (cancelled)"}
                      {" · "}
                      {formatMoney(b.price, settings)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        STATUS_CLASS[b.status],
                      )}
                    >
                      {STATUS_LABEL[b.status]}
                    </span>
                    {b.status === "pending_payment" && (
                      <button
                        type="button"
                        onClick={() => pay(b)}
                        disabled={paying === b.id}
                        className="btn-pill disabled:opacity-60"
                      >
                        {paying === b.id ? "Redirecting…" : "Pay now"}
                      </button>
                    )}
                    {b.status === "pending_payment" && (
                      <button
                        type="button"
                        onClick={() => cancel(b)}
                        disabled={cancelling === b.id}
                        className="rounded-full border border-destructive/40 px-3.5 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
                      >
                        {cancelling === b.id ? "Cancelling…" : "Cancel"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
