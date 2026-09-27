import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isOnboardingComplete, useInvalidateProfile, type Profile } from "@/lib/useProfile";
import { Field, SectionCard, inputClass } from "@/components/shop/ui";

/**
 * Shop-level payout settings, written to the signed-in user's own `profiles` row.
 * Shop name (display_name) + bank account name + number are all REQUIRED to finish onboarding.
 * Bank fields are readable only by the shop itself and an admin (RLS on profiles).
 */
export function PayoutSettingsForm({ userId, profile }: { userId: string; profile: Profile }) {
  const invalidateProfile = useInvalidateProfile();
  const [shopName, setShopName] = useState(profile.display_name ?? "");
  const [accountName, setAccountName] = useState(profile.bank_account_name ?? "");
  const [accountNumber, setAccountNumber] = useState(profile.bank_account_number ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setShopName(profile.display_name ?? "");
    setAccountName(profile.bank_account_name ?? "");
    setAccountNumber(profile.bank_account_number ?? "");
  }, [profile.display_name, profile.bank_account_name, profile.bank_account_number]);

  const complete = isOnboardingComplete(profile);
  const canSubmit = Boolean(shopName.trim() && accountName.trim() && accountNumber.trim());
  const dirty =
    shopName.trim() !== (profile.display_name ?? "") ||
    accountName.trim() !== (profile.bank_account_name ?? "") ||
    accountNumber.trim() !== (profile.bank_account_number ?? "");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Shop name, account name and account number are all required.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: shopName.trim(),
        bank_account_name: accountName.trim(),
        bank_account_number: accountNumber.trim(),
      })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      toast.error(`Couldn't save payout settings: ${error.message}`);
      return;
    }
    await invalidateProfile(userId);
    toast.success("Payout settings saved.");
  }

  return (
    <SectionCard
      eyebrow="Step 1 · 撥款設定"
      title="Payout settings"
      description="Shared by every barber in your shop. 先用測試資料即可 / use test data first."
      aside={
        complete ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
            <CheckCircle2 className="size-3.5" aria-hidden /> Onboarding complete
          </span>
        ) : (
          <span className="rounded-full bg-sand px-3 py-1 text-xs font-medium text-accent-foreground">
            Required to finish shop sign-up
          </span>
        )
      }
    >
      <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            id="shop-name"
            label="店名 / Shop name"
            hint="你的理髮店名稱，會顯示在撥款紀錄上 / your shop's name, shown on payout records. (Not a barber's name — you add barbers below.)"
            required
          >
            <input
              id="shop-name"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Downtown Cuts"
              className={inputClass}
            />
          </Field>
        </div>
        <Field
          id="bank-account-name"
          label="匯款戶名 / Account name"
          hint="你的理髮店收款的銀行帳戶 / the bank account where your shop gets paid"
          required
        >
          <input
            id="bank-account-name"
            required
            autoComplete="off"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="bank-account-number" label="匯款帳號 / Account number" required>
          <input
            id="bank-account-number"
            required
            autoComplete="off"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" className="btn-pill" disabled={busy || !canSubmit || !dirty}>
            {busy ? "Saving…" : complete ? "Save changes" : "Save & finish shop sign-up"}
          </button>
          <p className="text-xs text-muted-foreground">
            Only you and a platform admin can see your bank details.
          </p>
        </div>
      </form>
    </SectionCard>
  );
}
