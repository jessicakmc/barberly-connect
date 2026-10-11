import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Clock } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  bookingKeys,
  createBooking,
  localTimezoneLabel,
  validStarts,
  type SlotWithHold,
} from "@/lib/bookingData";
import { errMessage } from "@/lib/errors";
import { formatMoney, settingsOrDefault, usePlatformSettings } from "@/lib/platform";
import { CATEGORY_LABEL, type Service, type ServiceCategory } from "@/lib/shopData";
import { cn } from "@/lib/utils";

const chip =
  "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const chipOn = "border-foreground bg-foreground text-background";
const chipOff = "border-border bg-card hover:bg-secondary";

export function BookDialog({
  open,
  onOpenChange,
  barberId,
  barberName,
  services,
  slots,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberId: string;
  barberName: string;
  services: Service[];
  slots: SlotWithHold[];
}) {
  const queryClient = useQueryClient();
  const { data: settings } = usePlatformSettings();
  const slotMinutes = settingsOrDefault(settings).slot_minutes;
  const tz = localTimezoneLabel();

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [startId, setStartId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setServiceId(services.length === 1 ? (services[0]?.id ?? null) : null);
      setDay(null);
      setStartId(null);
      setError(null);
    }
  }, [open, services]);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const n = service?.required_slots ?? 1;

  // Only starts that have N free, back-to-back slots are offered.
  const starts = useMemo(() => (service ? validStarts(slots, n) : []), [service, slots, n]);

  const days = useMemo(() => {
    const seen = new Map<string, Date>();
    for (const { start } of starts) {
      const d = new Date(start.starts_at);
      const key = format(d, "yyyy-MM-dd");
      if (!seen.has(key)) seen.set(key, d);
    }
    return [...seen.entries()];
  }, [starts]);

  const startsForDay = useMemo(
    () => starts.filter(({ start }) => format(new Date(start.starts_at), "yyyy-MM-dd") === day),
    [starts, day],
  );

  const selected = starts.find(({ start }) => start.id === startId) ?? null;
  const selectedRunIds = new Set(selected?.run.map((s) => s.id) ?? []);

  // Keep the day/slot choice valid as the service changes.
  useEffect(() => {
    if (day && !days.some(([k]) => k === day)) setDay(null);
    if (startId && !starts.some(({ start }) => start.id === startId)) setStartId(null);
  }, [days, day, starts, startId]);

  async function onConfirm() {
    if (!service || !selected) return;
    setBusy(true);
    setError(null);
    try {
      await createBooking(service.id, selected.start.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingKeys.availability(barberId) }),
        queryClient.invalidateQueries({ queryKey: ["my_bookings"] }),
      ]);
      onOpenChange(false);
      toast.success("Booking created", {
        description: `${service.name} with ${barberName} · ${format(
          new Date(selected.start.starts_at),
          "EEE d MMM, HH:mm",
        )}. You can see it under My bookings.`,
      });
    } catch (err) {
      const msg = errMessage(err, "Could not complete the booking.");
      setError(msg);
      // the slots may have just been taken — refresh what's available
      void queryClient.invalidateQueries({ queryKey: bookingKeys.availability(barberId) });
    } finally {
      setBusy(false);
    }
  }

  const runStart = selected ? new Date(selected.start.starts_at) : null;
  const lastSlot = selected?.run[selected.run.length - 1];
  const runEnd = lastSlot ? new Date(lastSlot.ends_at) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book with {barberName}</DialogTitle>
          <DialogDescription>Pick a service, then a day and a start time.</DialogDescription>
        </DialogHeader>

        {/* 1. Service — decides price and how many slots are needed */}
        <section>
          <h3 className="text-sm font-medium">1. Service</h3>
          {services.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              This barber hasn't listed services yet.
            </p>
          ) : (
            <div className="mt-2 grid gap-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServiceId(s.id)}
                  aria-pressed={serviceId === s.id}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                    serviceId === s.id
                      ? "border-foreground bg-secondary"
                      : "border-border hover:bg-secondary",
                  )}
                >
                  <span>
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 text-muted-foreground">
                      {CATEGORY_LABEL[s.category as ServiceCategory] ?? s.category} ·{" "}
                      {s.required_slots * slotMinutes} min
                    </span>
                  </span>
                  <span className="font-semibold">{formatMoney(s.price, settings)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 2. Day */}
        {service && (
          <section>
            <h3 className="flex items-center gap-1.5 text-sm font-medium">
              <CalendarDays className="size-4" aria-hidden /> 2. Day
            </h3>
            {days.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No upcoming time with {n} back-to-back slot{n > 1 ? "s" : ""} free for this service.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {days.map(([key, d]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDay(key);
                      setStartId(null);
                    }}
                    className={cn(chip, day === key ? chipOn : chipOff)}
                  >
                    {format(d, "EEE d MMM")}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 3. Start time — only starts with N consecutive free slots are shown */}
        {service && day && (
          <section>
            <h3 className="flex items-center gap-1.5 text-sm font-medium">
              <Clock className="size-4" aria-hidden /> 3. Start time
              <span className="font-normal text-muted-foreground">({tz})</span>
            </h3>
            {n > 1 && (
              <p className="mt-1 text-xs text-muted-foreground">
                This service uses {n} consecutive slots ({n * slotMinutes} min). Only start times
                with enough free time after them are shown.
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {startsForDay.map(({ start }) => (
                <button
                  key={start.id}
                  type="button"
                  onClick={() => setStartId(start.id)}
                  className={cn(
                    chip,
                    startId === start.id
                      ? chipOn
                      : selectedRunIds.has(start.id)
                        ? "border-foreground/60 bg-secondary ring-2 ring-foreground/20"
                        : chipOff,
                  )}
                >
                  {format(new Date(start.starts_at), "HH:mm")}
                </button>
              ))}
            </div>
          </section>
        )}

        {service && selected && runStart && runEnd && (
          <div className="rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm">
            <p>
              <span className="font-medium">Your booking:</span> {format(runStart, "EEE d MMM")},{" "}
              {format(runStart, "HH:mm")}–{format(runEnd, "HH:mm")}
              {n > 1 && <span className="text-muted-foreground"> (uses {n} slots)</span>}
            </p>
            <p className="mt-1">
              <span className="font-medium">Price:</span> {formatMoney(service.price, settings)}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!service || !selected || busy}
            className="btn-pill disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Booking…" : "Confirm"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
