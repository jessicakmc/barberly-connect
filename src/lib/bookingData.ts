import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Barber, BarberPhoto, BookableSlot, Service } from "@/lib/shopData";
import { photoPublicUrl } from "@/lib/shopData";

export type Booking = Tables<"bookings">;
export type BookingStatus = "pending_payment" | "paid" | "cancelled";

export const bookingKeys = {
  publicBarbers: ["public_barbers"] as const,
  barber: (id: string) => ["public_barber", id] as const,
  availability: (barberId: string) => ["availability", barberId] as const,
  myBookings: (userId: string) => ["my_bookings", userId] as const,
};

/** A slot plus whether some live booking currently holds it (derived via booking_slots). */
export type SlotWithHold = BookableSlot & { held: boolean };

export type BarberListing = Barber & {
  services: Service[];
  coverUrl: string | null;
};

function pickCover(photos: BarberPhoto[]): string | null {
  if (photos.length === 0) return null;
  const featured = photos.find((p) => p.is_featured);
  if (featured) return photoPublicUrl(featured.storage_path);
  // fall back to the newest photo
  const newest = [...photos].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return newest ? photoPublicUrl(newest.storage_path) : null;
}

/** Every barber, with their services (for the category filter) and a representative photo. */
export function usePublicBarbers() {
  return useQuery({
    queryKey: bookingKeys.publicBarbers,
    queryFn: async (): Promise<BarberListing[]> => {
      const [barbers, services, photos] = await Promise.all([
        supabase.from("barbers").select("*").order("created_at", { ascending: true }),
        supabase.from("services").select("*").order("price", { ascending: true }),
        supabase.from("barber_photos").select("*").order("sort_order", { ascending: true }),
      ]);
      if (barbers.error) throw barbers.error;
      if (services.error) throw services.error;
      if (photos.error) throw photos.error;
      return barbers.data.map((b) => ({
        ...b,
        services: services.data.filter((s) => s.barber_id === b.id),
        coverUrl: pickCover(photos.data.filter((p) => p.barber_id === b.id)),
      }));
    },
  });
}

export type BarberDetail = {
  barber: Barber;
  services: Service[];
  photos: BarberPhoto[];
};

/** One barber's public profile: info + services + portfolio (featured first, then sort_order). */
export function usePublicBarber(barberId: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.barber(barberId ?? ""),
    enabled: Boolean(barberId),
    queryFn: async (): Promise<BarberDetail | null> => {
      const id = barberId ?? "";
      const [barber, services, photos] = await Promise.all([
        supabase.from("barbers").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("services")
          .select("*")
          .eq("barber_id", id)
          .order("price", { ascending: true }),
        supabase
          .from("barber_photos")
          .select("*")
          .eq("barber_id", id)
          .order("is_featured", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);
      if (barber.error) throw barber.error;
      if (services.error) throw services.error;
      if (photos.error) throw photos.error;
      if (!barber.data) return null;
      return { barber: barber.data, services: services.data, photos: photos.data };
    },
  });
}

/**
 * A barber's upcoming slots, each flagged `held` if a booking_slots row references it.
 * Slots have NO status column — availability is derived (the anti-join
 * `not exists (select 1 from booking_slots where slot_id = s.id)`), done here client-side
 * over the public-readable booking_slots table.
 */
export function useBarberAvailability(barberId: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.availability(barberId ?? ""),
    enabled: Boolean(barberId),
    queryFn: async (): Promise<SlotWithHold[]> => {
      const { data: slots, error } = await supabase
        .from("bookable_slots")
        .select("*")
        .eq("barber_id", barberId ?? "")
        .gt("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (error) throw error;
      if (slots.length === 0) return [];
      const { data: held, error: heldError } = await supabase
        .from("booking_slots")
        .select("slot_id")
        .in(
          "slot_id",
          slots.map((s) => s.id),
        );
      if (heldError) throw heldError;
      const heldIds = new Set(held.map((h) => h.slot_id));
      return slots.map((s) => ({ ...s, held: heldIds.has(s.id) }));
    },
  });
}

/**
 * Valid START slots for a service needing `n` consecutive slots: the slot itself and the
 * next n−1 slots must all be free AND back-to-back (each starts exactly where the previous
 * ended). Returns each start with the full run it would occupy.
 */
export function validStarts(
  slots: SlotWithHold[],
  n: number,
): { start: SlotWithHold; run: SlotWithHold[] }[] {
  const out: { start: SlotWithHold; run: SlotWithHold[] }[] = [];
  for (let i = 0; i + n <= slots.length; i++) {
    const run = slots.slice(i, i + n);
    if (run.some((s) => s.held)) continue;
    let contiguous = true;
    for (let k = 1; k < run.length; k++) {
      const prev = run[k - 1]!;
      const cur = run[k]!;
      if (new Date(cur.starts_at).getTime() !== new Date(prev.ends_at).getTime()) {
        contiguous = false;
        break;
      }
    }
    if (contiguous) out.push({ start: run[0]!, run });
  }
  return out;
}

export type MyBooking = {
  id: string;
  status: BookingStatus;
  price: number;
  created_at: string;
  starts_at: string | null;
  ends_at: string | null;
  serviceName: string;
  barberId: string | null;
  barberName: string;
};

/** The signed-in customer's own bookings (RLS: customer_id = auth.uid()), newest start first. */
export function useMyBookings(userId: string) {
  return useQuery({
    queryKey: bookingKeys.myBookings(userId),
    queryFn: async (): Promise<MyBooking[]> => {
      const { data: rows, error } = await supabase
        .from("bookings_with_start")
        .select("id, status, price, created_at, starts_at, ends_at, service_id")
        .eq("customer_id", userId)
        .order("starts_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (rows.length === 0) return [];
      const serviceIds = [...new Set(rows.map((r) => r.service_id).filter(Boolean))] as string[];
      const { data: services, error: sErr } = await supabase
        .from("services")
        .select("id, name, barber_id, barbers(name)")
        .in("id", serviceIds);
      if (sErr) throw sErr;
      const byId = new Map(services.map((s) => [s.id, s]));
      return rows.map((r) => {
        const sv = r.service_id ? byId.get(r.service_id) : undefined;
        return {
          id: r.id ?? "",
          status: (r.status ?? "pending_payment") as BookingStatus,
          price: r.price ?? 0,
          created_at: r.created_at ?? "",
          starts_at: r.starts_at,
          ends_at: r.ends_at,
          serviceName: sv?.name ?? "Service",
          barberId: sv?.barber_id ?? null,
          barberName: sv?.barbers?.name ?? "Barber",
        };
      });
    },
  });
}

/** Short label for the browser's timezone, shown next to slot times. */
export function localTimezoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "local time";
  }
}

/**
 * Creates the booking: ONE atomic RPC = 1 `pending_payment` booking + N booking_slots rows
 * (N = service.required_slots). Kept as a standalone function so the payment step can be
 * added after it without touching the dialog UI. Returns the new booking id.
 */
export async function createBooking(serviceId: string, startSlotId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_booking", {
    p_service_id: serviceId,
    p_start_slot_id: startSlotId,
  });
  if (error) throw error;
  return data as string;
}
