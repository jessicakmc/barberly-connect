import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Barber = Tables<"barbers">;
export type Service = Tables<"services">;
export type BookableSlot = Tables<"bookable_slots">;
export type BarberPhoto = Tables<"barber_photos">;

export const SERVICE_CATEGORIES = ["cut", "color", "perm", "beard"] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  cut: "Cut",
  color: "Color",
  perm: "Perm",
  beard: "Beard",
};

export const PHOTO_BUCKET = "barber-photos";

export const shopKeys = {
  barbers: (shopId: string) => ["barbers", shopId] as const,
  services: (barberId: string) => ["services", barberId] as const,
  slots: (barberId: string) => ["slots", barberId] as const,
  photos: (barberId: string) => ["barber_photos", barberId] as const,
};

/** All barbers owned by this shop (one shop can run many barbers). */
export function useMyBarbers(shopId: string) {
  return useQuery({
    queryKey: shopKeys.barbers(shopId),
    queryFn: async (): Promise<Barber[]> => {
      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useBarberServices(barberId: string | undefined) {
  return useQuery({
    queryKey: shopKeys.services(barberId ?? ""),
    enabled: Boolean(barberId),
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("barber_id", barberId ?? "")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/** Upcoming (not yet ended) slots for a barber. */
export function useBarberSlots(barberId: string | undefined) {
  return useQuery({
    queryKey: shopKeys.slots(barberId ?? ""),
    enabled: Boolean(barberId),
    queryFn: async (): Promise<BookableSlot[]> => {
      const { data, error } = await supabase
        .from("bookable_slots")
        .select("*")
        .eq("barber_id", barberId ?? "")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useBarberPhotos(barberId: string) {
  return useQuery({
    queryKey: shopKeys.photos(barberId),
    queryFn: async (): Promise<BarberPhoto[]> => {
      const { data, error } = await supabase
        .from("barber_photos")
        .select("*")
        .eq("barber_id", barberId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function photoPublicUrl(storagePath: string): string {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}
