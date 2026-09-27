import { useMemo, useState, type FormEvent } from "react";
import { CalendarPlus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { settingsOrDefault, usePlatformSettings } from "@/lib/platform";
import { shopKeys, useBarberSlots, type BookableSlot } from "@/lib/shopData";
import { Field, SectionCard, inputClass, secondaryButtonClass } from "@/components/shop/ui";

type Window = { start: Date; end: Date };

function overlaps(a: Window, b: Window): boolean {
  return a.start < b.end && b.start < a.end;
}

function toWindow(slot: BookableSlot): Window {
  return { start: new Date(slot.starts_at), end: new Date(slot.ends_at) };
}

/** Local date + HH:mm → Date (browser local time). */
function atLocal(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

/** Splits [from, to) into consecutive slot-length windows. */
function buildWindows(date: string, from: string, to: string, minutes: number): Window[] {
  const start = atLocal(date, from);
  const end = atLocal(date, to);
  const out: Window[] = [];
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || minutes <= 0) return out;
  for (let t = start.getTime(); t + minutes * 60_000 <= end.getTime(); t += minutes * 60_000) {
    out.push({ start: new Date(t), end: new Date(t + minutes * 60_000) });
  }
  return out;
}

function SlotChip({
  slot,
  others,
  slotMinutes,
  onChanged,
}: {
  slot: BookableSlot;
  others: BookableSlot[];
  slotMinutes: number;
  onChanged: () => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState(format(new Date(slot.starts_at), "HH:mm"));
  const [busy, setBusy] = useState(false);
  const start = new Date(slot.starts_at);
  const end = new Date(slot.ends_at);

  async function save() {
    const day = format(start, "yyyy-MM-dd");
    const nextStart = atLocal(day, time);
    const next = { start: nextStart, end: new Date(nextStart.getTime() + slotMinutes * 60_000) };
    if (Number.isNaN(nextStart.getTime())) return;
    if (next.start < new Date()) {
      toast.error("That time is in the past.");
      return;
    }
    if (others.some((o) => o.id !== slot.id && overlaps(next, toWindow(o)))) {
      toast.error("That overlaps another slot.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("bookable_slots")
      .update({ starts_at: next.start.toISOString(), ends_at: next.end.toISOString() })
      .eq("id", slot.id);
    setBusy(false);
    if (error) {
      toast.error(`Couldn't move slot: ${error.message}`);
      return;
    }
    setEditing(false);
    await onChanged();
  }

  async function remove() {
    setBusy(true);
    const { error } = await supabase.from("bookable_slots").delete().eq("id", slot.id);
    setBusy(false);
    if (error) {
      toast.error(`Couldn't delete slot: ${error.message}`);
      return;
    }
    await onChanged();
  }

  if (editing) {
    return (
      <li className="inline-flex items-center gap-1 rounded-full border border-primary bg-card px-2 py-1">
        <input
          type="time"
          aria-label="New start time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-md bg-transparent px-1 text-sm outline-none"
        />
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-full px-2 text-xs font-medium text-primary hover:bg-secondary"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-full px-2 text-xs text-muted-foreground hover:bg-secondary"
        >
          Cancel
        </button>
      </li>
    );
  }

  return (
    <li className="inline-flex items-center gap-1 rounded-full border border-border bg-card py-1 pl-3 pr-1 text-sm">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="hover:underline"
        title="Change start time"
      >
        {format(start, "HH:mm")}–{format(end, "HH:mm")}
      </button>
      <button
        type="button"
        aria-label={`Delete ${format(start, "HH:mm")} slot`}
        disabled={busy}
        onClick={remove}
        className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </li>
  );
}

/** B. Publish bookable slots — each slot is one platform_settings.slot_minutes window (no status). */
export function SlotPublisher({ barberId }: { barberId: string }) {
  const queryClient = useQueryClient();
  const { data: settingsData } = usePlatformSettings();
  const slotMinutes = settingsOrDefault(settingsData).slot_minutes;
  const { data: slots, isPending, error } = useBarberSlots(barberId);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [from, setFrom] = useState("10:00");
  const [to, setTo] = useState("18:00");
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: shopKeys.slots(barberId) });

  const preview = useMemo(() => {
    const now = new Date();
    const existing = (slots ?? []).map(toWindow);
    const windows = buildWindows(date, from, to, slotMinutes);
    const fresh = windows.filter((w) => w.start >= now && !existing.some((e) => overlaps(w, e)));
    return { total: windows.length, fresh };
  }, [date, from, to, slotMinutes, slots]);

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (preview.fresh.length === 0) {
      toast.error("No new slots to publish in that range.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("bookable_slots").insert(
      preview.fresh.map((w) => ({
        barber_id: barberId,
        starts_at: w.start.toISOString(),
        ends_at: w.end.toISOString(),
      })),
    );
    setBusy(false);
    if (error) {
      toast.error(`Couldn't publish slots: ${error.message}`);
      return;
    }
    await refresh();
    toast.success(
      `Published ${preview.fresh.length} slot${preview.fresh.length === 1 ? "" : "s"}.`,
    );
  }

  async function clearDay(daySlots: BookableSlot[]) {
    setBusy(true);
    const { error } = await supabase
      .from("bookable_slots")
      .delete()
      .in(
        "id",
        daySlots.map((s) => s.id),
      );
    setBusy(false);
    if (error) toast.error(`Couldn't clear day: ${error.message}`);
    await refresh();
  }

  const byDay = useMemo(() => {
    const groups = new Map<string, BookableSlot[]>();
    for (const s of slots ?? []) {
      const key = format(new Date(s.starts_at), "yyyy-MM-dd");
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return Array.from(groups.entries());
  }, [slots]);

  const skipped = preview.total - preview.fresh.length;

  return (
    <SectionCard
      eyebrow="B · 可預約時段"
      title="Publish bookable slots"
      description={`Each slot is ${slotMinutes} minutes. Pick a day and a time range — we'll create consecutive slots for you.`}
    >
      <form onSubmit={publish} className="grid items-end gap-4 sm:grid-cols-4">
        <Field id="slot-date" label="日期 / Date" required>
          <input
            id="slot-date"
            type="date"
            required
            min={format(new Date(), "yyyy-MM-dd")}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="slot-from" label="從 / From" required>
          <input
            id="slot-from"
            type="time"
            required
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="slot-to" label="到 / To" required>
          <input
            id="slot-to"
            type="time"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputClass}
          />
        </Field>
        <button
          type="submit"
          className="btn-pill h-[42px]"
          disabled={busy || preview.fresh.length === 0}
        >
          <CalendarPlus className="size-4" aria-hidden />
          Publish {preview.fresh.length || ""} slot{preview.fresh.length === 1 ? "" : "s"}
        </button>
        {skipped > 0 && (
          <p className="text-xs text-muted-foreground sm:col-span-4">
            {skipped} slot{skipped === 1 ? "" : "s"} in that range already exist or are in the past
            and will be skipped.
          </p>
        )}
      </form>

      <div className="mt-8">
        <h3 className="text-sm font-medium">Upcoming published slots</h3>
        {isPending ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading slots…</p>
        ) : error ? (
          <p className="mt-2 text-sm text-destructive">Couldn't load slots: {error.message}</p>
        ) : byDay.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No upcoming slots yet.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {byDay.map(([day, daySlots]) => (
              <div key={day} className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {format(new Date(`${day}T00:00`), "EEE, d MMM yyyy")}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      · {daySlots.length} slot{daySlots.length === 1 ? "" : "s"}
                    </span>
                  </p>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    disabled={busy}
                    onClick={() => clearDay(daySlots)}
                  >
                    Clear day
                  </button>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {daySlots.map((s) => (
                    <SlotChip
                      key={s.id}
                      slot={s}
                      others={slots ?? []}
                      slotMinutes={slotMinutes}
                      onChanged={refresh}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
