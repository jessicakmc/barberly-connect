import { useMemo } from "react";
import { format } from "date-fns";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { useAuthedUser } from "@/components/RequireAuth";
import { SectionCard } from "@/components/shop/ui";
import { errMessage } from "@/lib/errors";
import { formatMoney, usePlatformSettings } from "@/lib/platform";
import {
  PAYOUT_STATUS_CLASS,
  PAYOUT_STATUS_LABEL,
  payoutStatus,
  useShopEarnings,
  type EarningsBooking,
} from "@/lib/payoutData";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { cn } from "@/lib/utils";

type Group = {
  payout: NonNullable<EarningsBooking["payout"]>;
  bookings: EarningsBooking[];
};

function fmtDate(iso: string | null, pattern = "d MMM yyyy") {
  return iso ? format(new Date(iso), pattern) : "—";
}

/**
 * /shop/earnings — read-only mirror of the shop's settlement (all their barbers combined).
 * Owed = paid bookings with payout_id NULL; "in a payout" = grouped by payout with its status.
 * A cancelled payout's bookings had payout_id nulled, so they show up as owed again.
 */
export function ShopEarnings() {
  useDocumentMeta("Earnings — Barberly", "Your earnings and payouts.");
  const user = useAuthedUser();
  const { data: settings } = usePlatformSettings();
  const money = (n: number) => formatMoney(n, settings);
  const { data, isPending, error } = useShopEarnings(user.id);

  const bookings = useMemo(() => data ?? [], [data]);
  const owed = bookings.filter((b) => !b.payout);
  const groups = useMemo(() => {
    const m = new Map<string, Group>();
    for (const b of bookings) {
      if (!b.payout) continue;
      const g = m.get(b.payout.id) ?? { payout: b.payout, bookings: [] };
      g.bookings.push(b);
      m.set(b.payout.id, g);
    }
    return [...m.values()].sort((a, b) => b.payout.created_at.localeCompare(a.payout.created_at));
  }, [bookings]);

  const thisMonth = format(new Date(), "yyyy-MM");
  const monthRows = bookings.filter(
    (b) => b.paidAt && format(new Date(b.paidAt), "yyyy-MM") === thisMonth,
  );
  const summary = (rows: EarningsBooking[]) => ({
    count: rows.length,
    gross: rows.reduce((a, b) => a + b.price, 0),
    platform: rows.reduce((a, b) => a + b.platformCut, 0),
    shop: rows.reduce((a, b) => a + b.shopCut, 0),
  });
  const month = summary(monthRows);
  const total = summary(bookings);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-10 sm:px-6">
        <div className="fade-up">
          <p className="eyebrow">收入與撥款 · Earnings</p>
          <h1 className="mt-2 text-4xl font-medium sm:text-5xl">Earnings</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            平台會分批結算並撥款給你 · We settle and pay out your earnings in batches.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{errMessage(error, "Couldn't load earnings.")}</p>
        ) : isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "本月 · This month", s: month },
                { label: "累計 · All time", s: total },
              ].map(({ label, s }) => (
                <div
                  key={label}
                  className="rounded-3xl border border-border bg-card p-6 shadow-card"
                >
                  <p className="eyebrow">{label}</p>
                  <p className="mt-2 text-3xl font-medium">{money(s.shop)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your earnings · {s.count} booking(s) · Gross {money(s.gross)} · Platform{" "}
                    {money(s.platform)}
                  </p>
                </div>
              ))}
            </div>

            <SectionCard
              eyebrow="尚未撥款 · Owed"
              title={money(owed.reduce((a, b) => a + b.shopCut, 0))}
              description="Paid bookings that aren't in a payout yet."
            >
              {owed.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing owed right now.</p>
              ) : (
                <BookingList rows={owed} money={money} />
              )}
            </SectionCard>

            <SectionCard
              eyebrow="已納入撥款 · In a payout"
              title={`${groups.length} payout(s)`}
              description="Pending means the payout is built but the bank transfer hasn't been recorded yet."
            >
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payouts yet.</p>
              ) : (
                <ul className="space-y-4">
                  {groups.map((g) => {
                    const status = payoutStatus(g.payout.status);
                    return (
                      <li
                        key={g.payout.id}
                        className="rounded-2xl border border-border bg-background p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                                PAYOUT_STATUS_CLASS[status],
                              )}
                            >
                              {PAYOUT_STATUS_LABEL[status]}
                              {status === "transferred"
                                ? ` · ${fmtDate(g.payout.marked_transferred_at)}`
                                : ""}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Built {fmtDate(g.payout.created_at)}
                            </span>
                          </div>
                          <p className="font-medium">{money(g.payout.shop_cut)}</p>
                        </div>
                        <div className="mt-3">
                          <BookingList rows={g.bookings} money={money} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function BookingList({ rows, money }: { rows: EarningsBooking[]; money: (n: number) => string }) {
  return (
    <ul className="divide-y divide-border text-sm">
      {rows.map((b) => (
        <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span>
            {b.serviceName} · <span className="text-muted-foreground">{b.barberName}</span> ·{" "}
            <span className="text-muted-foreground">{fmtDate(b.paidAt, "d MMM yyyy, HH:mm")}</span>
          </span>
          <span className="tabular-nums">
            {money(b.price)} <span className="text-muted-foreground">→ you</span>{" "}
            <span className="font-medium">{money(b.shopCut)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
