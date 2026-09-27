import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PlatformSettings = Pick<
  Tables<"platform_settings">,
  "currency" | "currency_minor_units" | "slot_minutes"
>;

const FALLBACK: PlatformSettings = { currency: "twd", currency_minor_units: 0, slot_minutes: 30 };

/** Single-row platform config: currency + slot length. */
export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform_settings"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PlatformSettings> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("currency, currency_minor_units, slot_minutes")
        .maybeSingle();
      if (error) throw error;
      return data ?? FALLBACK;
    },
  });
}

export function settingsOrDefault(settings: PlatformSettings | undefined): PlatformSettings {
  return settings ?? FALLBACK;
}

/** Formats a whole-unit integer amount stored in `platform_settings.currency`. */
export function formatMoney(amount: number, settings: PlatformSettings | undefined): string {
  const { currency, currency_minor_units } = settingsOrDefault(settings);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: currency_minor_units,
      maximumFractionDigits: currency_minor_units,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount}`;
  }
}
