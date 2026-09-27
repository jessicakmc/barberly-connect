import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateProfile } from "@/lib/useProfile";
import { cn } from "@/lib/utils";

/**
 * Upgrades the signed-in customer to a shop by flipping their own profiles.role to 'shop'.
 * RLS (profiles_update_own) + the guard_profile_role trigger only allow customer -> shop.
 */
export function BecomeShopButton({ userId, className }: { userId: string; className?: string }) {
  const navigate = useNavigate();
  const invalidateProfile = useInvalidateProfile();
  const [busy, setBusy] = useState(false);

  async function becomeShop() {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ role: "shop" }).eq("id", userId);
    setBusy(false);
    if (error) {
      toast.error(`Couldn't open your shop: ${error.message}`);
      return;
    }
    await invalidateProfile(userId);
    toast.success("Your shop is open — let's set it up.");
    navigate("/shop");
  }

  return (
    <button
      type="button"
      onClick={becomeShop}
      disabled={busy}
      className={cn("btn-pill", className)}
    >
      {busy ? "Opening…" : "開店 / Become a shop"}
    </button>
  );
}
