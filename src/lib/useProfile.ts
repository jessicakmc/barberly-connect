import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type ProfileRole = "customer" | "shop" | "admin";

export const profileQueryKey = (userId: string) => ["profile", userId] as const;

/** Reads the signed-in user's own `profiles` row. `profiles.role` is the single source of truth for roles. */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useProfile(userId: string) {
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => fetchProfile(userId),
  });
}

export function useInvalidateProfile() {
  const queryClient = useQueryClient();
  return (userId: string) => queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
}

export function roleOf(profile: Profile | null | undefined): ProfileRole {
  const role = profile?.role;
  return role === "shop" || role === "admin" ? role : "customer";
}

/**
 * Where a signed-in user lands after auth. M1.1 branches shop vs customer only.
 * (Anything that isn't `shop` goes to the customer home.)
 */
export function homePathForRole(role: string | null | undefined): string {
  return role === "shop" ? "/shop" : "/app";
}

/** Shop onboarding is complete once the shop name + both bank fields are filled. */
export function isOnboardingComplete(profile: Profile | null | undefined): boolean {
  return Boolean(
    profile?.display_name?.trim() &&
    profile.bank_account_name?.trim() &&
    profile.bank_account_number?.trim(),
  );
}
