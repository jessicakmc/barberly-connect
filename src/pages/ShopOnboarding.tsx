import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { useAuthedUser } from "@/components/RequireAuth";
import { BarbersManager } from "@/components/shop/BarbersManager";
import { PayoutSettingsForm } from "@/components/shop/PayoutSettingsForm";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { isOnboardingComplete, useProfile } from "@/lib/useProfile";
import { useMyBarbers } from "@/lib/shopData";

/** /shop — shop onboarding: payout settings (shop level) + barbers + sample photos. */
export function ShopOnboarding() {
  useDocumentMeta("My shop — Barberly", "Set up your Barberly shop.");
  const user = useAuthedUser();
  const { data: profile } = useProfile(user.id);
  const { data: barbers } = useMyBarbers(user.id);

  const complete = isOnboardingComplete(profile);
  const hasBarbers = (barbers?.length ?? 0) > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-10 sm:px-6">
        <div className="fade-up">
          <p className="eyebrow">理髮店上架 · Shop onboarding</p>
          <h1 className="mt-2 text-4xl font-medium sm:text-5xl">
            {profile?.display_name?.trim() || "Set up your shop"}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Add your payout details, list your barbers and show off their work. Then publish
            services and open slots so customers can book.
          </p>
        </div>

        {profile && <PayoutSettingsForm userId={user.id} profile={profile} />}

        <BarbersManager shopId={user.id} />

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div>
            <p className="eyebrow">Step 3 · 預約排程</p>
            <h2 className="mt-2 text-2xl font-medium">Services &amp; schedule</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {complete && hasBarbers
                ? "Set prices and publish bookable time slots for each barber."
                : "Finish your payout settings and add at least one barber first."}
            </p>
          </div>
          {complete && hasBarbers ? (
            <Link to="/shop/bookings" className="btn-pill">
              Manage schedule <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span className="btn-pill pointer-events-none opacity-50" aria-disabled="true">
              Manage schedule <ArrowRight className="size-4" aria-hidden />
            </span>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
