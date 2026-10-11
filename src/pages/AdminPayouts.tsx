import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { useAuthedUser } from "@/components/RequireAuth";
import {
  SectionCard,
  inputClass,
  secondaryButtonClass,
  dangerButtonClass,
} from "@/components/shop/ui";
import { errMessage } from "@/lib/errors";
import { formatMoney, usePlatformSettings } from "@/lib/platform";
import {
  PAYOUT_STATUS_CLASS,
  PAYOUT_STATUS_LABEL,
  payoutKeys,
  payoutStatus,
  useOwedBookings,
  usePayoutLedger,
  type LedgerPayout,
  type OwedRow,
} from "@/lib/payoutData";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { cn } from "@/lib/utils";

const ALL = "";

function sum(rows: OwedRow[], key: "price" | "platformCut" | "shopCut") {
  return rows.reduce((acc, r) => acc + r[key], 0);
}

function fmtDate(iso: string | null, pattern = "d MMM yyyy") {
  return iso ? format(new Date(iso), pattern) : "—";
}

/**
 * /admin/payouts — admin-only settlement page (M2.2).
 * Part 1: the live owed pool (paid bookings with payout_id NULL) → filter, select one shop's
 *         bookings, build a pending_transfer payout (build_payout RPC).
 * Part 2: the payouts ledger → mark transferred / cancel (admin-guarded RPCs).
 * Nothing here moves money: the bank transfer happens in the admin's online banking.
 */
export function AdminPayouts() {
  useDocumentMeta("Payouts — Barberly admin", "Settle commission and pay out shops.");
  const user = useAuthedUser();
  const queryClient = useQueryClient();
  const { data: settings } = usePlatformSettings();
  const money = (n: number) => formatMoney(n, settings);

  const owed = useOwedBookings();
  const ledger = usePayoutLedger();

  const [shopFilter, setShopFilter] = useState(ALL);
  const [customerFilter, setCustomerFilter] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [building, setBuilding] = useState(false);
  const [busyPayout, setBusyPayout] = useState<string | null>(null);

  const rows = useMemo(() => owed.data ?? [], [owed.data]);

  const shops = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.shopId, r.shopName));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const customers = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.customerId, r.customerLabel));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  // Filters are UI convenience only — plain WHERE clauses over the live owed pool.
  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (shopFilter && r.shopId !== shopFilter) return false;
        if (customerFilter && r.customerId !== customerFilter) return false;
        const day = r.paidAt ? format(new Date(r.paidAt), "yyyy-MM-dd") : "";
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      }),
    [rows, shopFilter, customerFilter, from, to],
  );

  // Selection is always computed from the rows that are still owed, so totals match the build.
  const checked = rows.filter((r) => selected.has(r.bookingId));
  const selectedShopId = checked[0]?.shopId ?? null;
  const selectedShopName = checked[0]?.shopName ?? "";

  function toggle(r: OwedRow) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(r.bookingId)) {
        next.delete(r.bookingId);
      } else {
        if (selectedShopId && r.shopId !== selectedShopId) {
          toast.error("A payout is for ONE shop — clear the selection to pick another shop.");
          return prev;
        }
        next.add(r.bookingId);
      }
      return next;
    });
  }

  function selectShopMonth() {
    if (!shopFilter) {
      toast.error("Choose a shop in the filter first.");
      return;
    }
    const ids = rows
      .filter(
        (r) =>
          r.shopId === shopFilter && r.paidAt && format(new Date(r.paidAt), "yyyy-MM") === month,
      )
      .map((r) => r.bookingId);
    if (ids.length === 0) {
      toast.info("No owed bookings for that shop in that month.");
      return;
    }
    setSelected(new Set(ids));
  }

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: payoutKeys.owed }),
      queryClient.invalidateQueries({ queryKey: payoutKeys.ledger }),
    ]);
  }

  async function buildPayout() {
    if (checked.length === 0) return;
    setBuilding(true);
    try {
      const { error } = await supabase.rpc("build_payout", {
        p_booking_ids: checked.map((r) => r.bookingId),
        ...(note.trim() ? { p_note: note.trim() } : {}),
      });
      if (error) throw error;
      toast.success(`Payout built for ${selectedShopName} — now pending transfer.`);
      setSelected(new Set());
      setNote("");
      await refresh();
    } catch (err) {
      toast.error(errMessage(err, "Couldn't build the payout."));
      await refresh();
    } finally {
      setBuilding(false);
    }
  }

  async function markTransferred(p: LedgerPayout) {
    const ref = window.prompt(
      `Record the bank transfer of ${money(p.shop_cut)} to ${p.shop_name ?? "this shop"}.\n` +
        "Bank reference / memo (optional):",
      "",
    );
    if (ref === null) return;
    setBusyPayout(p.id);
    try {
      const { error } = await supabase.rpc("mark_payout_transferred", {
        p_payout_id: p.id,
        ...(ref.trim() ? { p_bank_reference: ref.trim() } : {}),
      });
      if (error) throw error;
      toast.success("Marked as transferred.");
      await refresh();
    } catch (err) {
      toast.error(errMessage(err, "Couldn't mark the payout as transferred."));
    } finally {
      setBusyPayout(null);
    }
  }

  async function cancelPayout(p: LedgerPayout) {
    if (
      !window.confirm(
        `Cancel this payout for ${p.shop_name ?? "this shop"}? Its ${p.bookings_count} booking(s) go back to the owed pool.`,
      )
    )
      return;
    setBusyPayout(p.id);
    try {
      const { error } = await supabase.rpc("cancel_payout", { p_payout_id: p.id });
      if (error) throw error;
      toast.success("Payout cancelled — its bookings are owed again.");
      await refresh();
    } catch (err) {
      toast.error(errMessage(err, "Couldn't cancel the payout."));
    } finally {
      setBusyPayout(null);
    }
  }

  const pendingTotal = (ledger.data ?? [])
    .filter((p) => p.status === "pending_transfer")
    .reduce((a, p) => a + p.shop_cut, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-10 sm:px-6">
        <div className="fade-up">
          <p className="eyebrow">抽成撥款 · Admin</p>
          <h1 className="mt-2 text-4xl font-medium sm:text-5xl">Payouts</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Pick one shop's owed bookings and build a payout, make the bank transfer in your online
            banking, then mark it transferred here.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-border bg-card px-4 py-2">
              Owed to shops: <strong>{money(sum(rows, "shopCut"))}</strong> ({rows.length} bookings)
            </span>
            <span className="rounded-full border border-border bg-card px-4 py-2">
              Pending transfer: <strong>{money(pendingTotal)}</strong>
            </span>
          </div>
        </div>

        {/* Part 1 — owed pool builder */}
        <SectionCard
          eyebrow="Part 1 · 欠款池"
          title="Owed bookings"
          description="Paid bookings not yet in any payout. A payout covers one shop."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium">
              Shop
              <select
                className={inputClass}
                value={shopFilter}
                onChange={(e) => setShopFilter(e.target.value)}
              >
                <option value={ALL}>All shops</option>
                {shops.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Customer
              <select
                className={inputClass}
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
              >
                <option value={ALL}>All customers</option>
                {customers.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Paid from
              <input
                type="date"
                className={inputClass}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="text-sm font-medium">
              Paid to
              <input
                type="date"
                className={inputClass}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium">
              Month
              <input
                type="month"
                className={inputClass}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>
            <button type="button" className={secondaryButtonClass} onClick={selectShopMonth}>
              全選此店本月欠款 · Select all owed for this shop this month
            </button>
            {selected.size > 0 && (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setSelected(new Set())}
              >
                Clear selection
              </button>
            )}
          </div>

          {owed.error ? (
            <p className="mt-6 text-sm text-destructive">
              {errMessage(owed.error, "Couldn't load owed bookings.")}
            </p>
          ) : owed.isPending ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {rows.length === 0
                ? "Nothing owed — every paid booking is already in a payout."
                : "No owed bookings match these filters."}
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-2" />
                    <th className="px-3 py-2">Shop</th>
                    <th className="px-3 py-2">Barber</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Paid</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Platform cut</th>
                    <th className="px-3 py-2 text-right">Shop cut</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const isChecked = selected.has(r.bookingId);
                    const otherShop = Boolean(selectedShopId && r.shopId !== selectedShopId);
                    return (
                      <tr
                        key={r.bookingId}
                        className={cn(
                          "border-t border-border",
                          isChecked && "bg-sand/40",
                          otherShop && "opacity-50",
                        )}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Select booking ${r.bookingId.slice(0, 8)}`}
                            checked={isChecked}
                            disabled={otherShop}
                            onChange={() => toggle(r)}
                            className="size-4"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium">{r.shopName}</td>
                        <td className="px-3 py-2">{r.barberName}</td>
                        <td className="px-3 py-2">{r.customerLabel}</td>
                        <td className="px-3 py-2">{fmtDate(r.paidAt, "d MMM yyyy, HH:mm")}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(r.price)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {money(r.platformCut)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">
                          {money(r.shopCut)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="text-sm">
              <p className="font-medium">
                {checked.length === 0
                  ? "No bookings selected"
                  : `${checked.length} booking(s) · ${selectedShopName}`}
              </p>
              <p className="mt-1 text-muted-foreground">
                Gross {money(sum(checked, "price"))} · Platform {money(sum(checked, "platformCut"))}{" "}
                ·{" "}
                <span className="font-medium text-foreground">
                  Shop {money(sum(checked, "shopCut"))}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                The payout snapshots the current rate on the batch total, so its cut can differ by a
                unit from the per-row sum.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="text-sm font-medium">
                Note (optional)
                <input
                  className={cn(inputClass, "sm:w-64")}
                  placeholder="e.g. October payout"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-pill disabled:opacity-60"
                disabled={checked.length === 0 || building}
                onClick={buildPayout}
              >
                {building ? "Building…" : "建立撥款 · Build payout"}
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Part 2 — payouts ledger */}
        <SectionCard
          eyebrow="Part 2 · 撥款紀錄"
          title="Payouts"
          description="Transfer the shop cut to the shop's bank account, then mark it transferred. Only a pending payout can be cancelled."
        >
          {ledger.error ? (
            <p className="text-sm text-destructive">
              {errMessage(ledger.error, "Couldn't load payouts.")}
            </p>
          ) : ledger.isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (ledger.data ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No payouts yet. Build one from the owed bookings above.
            </p>
          ) : (
            <ul className="space-y-3">
              {(ledger.data ?? []).map((p) => {
                const status = payoutStatus(p.status);
                const pending = status === "pending_transfer";
                return (
                  <li
                    key={p.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{p.shop_name?.trim() || "(unnamed shop)"}</p>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            PAYOUT_STATUS_CLASS[status],
                          )}
                        >
                          {PAYOUT_STATUS_LABEL[status]}
                          {status === "transferred" && p.marked_transferred_at
                            ? ` · ${fmtDate(p.marked_transferred_at)}`
                            : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Built {fmtDate(p.created_at)} · {p.bookings_count} booking(s) · Gross{" "}
                        {money(p.gross)} · Platform {money(p.platform_cut)} (
                        {Math.round(Number(p.platform_pct) * 100)}%) ·{" "}
                        <span className="font-medium text-foreground">
                          Shop {money(p.shop_cut)}
                        </span>
                      </p>
                      {pending && (
                        <p className="mt-1 text-sm">
                          Bank: {p.bankAccountName ?? "—"} · {p.bankAccountNumber ?? "—"}
                        </p>
                      )}
                      {(p.note || p.bank_reference) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p.note && <>Note: {p.note}</>}
                          {p.note && p.bank_reference && " · "}
                          {p.bank_reference && <>Ref: {p.bank_reference}</>}
                        </p>
                      )}
                    </div>
                    {pending && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          className="btn-pill disabled:opacity-60"
                          disabled={busyPayout === p.id}
                          onClick={() => markTransferred(p)}
                        >
                          標記為已轉帳 · Mark as transferred
                        </button>
                        <button
                          type="button"
                          className={dangerButtonClass}
                          disabled={busyPayout === p.id}
                          onClick={() => cancelPayout(p)}
                        >
                          取消 · Cancel
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </main>
      <Footer />
    </div>
  );
}
