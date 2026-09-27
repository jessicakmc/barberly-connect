import { Navigate } from "react-router";
import { AppHeader } from "@/components/AppHeader";
import { BecomeShopButton } from "@/components/BecomeShopButton";
import { Footer } from "@/components/Footer";
import { useAuthedUser } from "@/components/RequireAuth";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { roleOf, useProfile } from "@/lib/useProfile";

/** Customer home. Shops are routed to their dashboard (role read from profiles.role). */
export function AppHome() {
  useDocumentMeta("Barbers — Barberly", "Your Barberly home.");
  const user = useAuthedUser();
  const { data: profile, isPending } = useProfile(user.id);

  if (isPending) return null;
  if (roleOf(profile) === "shop") return <Navigate to="/shop" replace />;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="fade-up max-w-xl rounded-3xl border border-border bg-card p-10 text-center shadow-card">
          <p className="eyebrow">Coming soon</p>
          <h1 className="mt-3 text-3xl font-medium sm:text-4xl">
            附近的理髮師即將上線 — 很快就能瀏覽與預約。
          </h1>
          <p className="mt-4 text-muted-foreground">
            Barbers near you are coming soon — browsing &amp; booking are on the way.
          </p>
          <div className="mt-8 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Run a barbershop? List your barbers, services and open slots on Barberly.
            </p>
            <BecomeShopButton userId={user.id} className="mt-4" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
