import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/_authenticated/barbers")({
  head: () => ({
    meta: [
      { title: "Barbers — Barberly" },
      { name: "description", content: "Your Barberly home." },
      { property: "og:title", content: "Barbers — Barberly" },
      { property: "og:description", content: "Your Barberly home." },
    ],
  }),
  component: BarbersPage,
});

function BarbersPage() {
  const { user } = Route.useRouteContext();
  const isShop = user.user_metadata?.['role'] === "shop";

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="fade-up max-w-xl rounded-3xl border border-border bg-card p-10 text-center shadow-card">
          <p className="eyebrow">{isShop ? "Barber dashboard" : "Coming soon"}</p>
          <h1 className="mt-3 text-3xl font-medium sm:text-4xl">
            {isShop
              ? "理髮師後台即將上線 — 下一個里程碑會加上個人檔案、服務項目與排班管理。"
              : "附近的理髮師即將上線 — 下一個里程碑會加上瀏覽與預約功能。"}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {isShop
              ? "Your barber dashboard is coming soon — profile, services & schedule arrive in the next milestone."
              : "Barbers near you are coming soon — browse & booking arrive in the next milestone."}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
