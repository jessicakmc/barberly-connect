import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/**
 * M2.2 — commission settlement.
 *
 * Settlement is DERIVED from `bookings.payout_id`, never a booking status:
 *   paid + payout_id NULL  → owed (listed by the `owed_bookings` view)
 *   paid + payout_id set   → in that payout (read `payouts.status`)
 * Amounts are whole units in `platform_settings.currency` — never ×/÷ 100.
 */

export type PayoutStatus = "pending_transfer" | "transferred" | "cancelled";
export type Payout = Tables<"payouts">;

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  pending_transfer: "待轉帳 · Pending",
  transferred: "已轉帳 · Transferred",
  cancelled: "已取消 · Cancelled",
};

export const PAYOUT_STATUS_CLASS: Record<PayoutStatus, string> = {
  pending_transfer: "bg-sand text-accent-foreground",
  transferred: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-secondary text-muted-foreground",
};

export function payoutStatus(s: string): PayoutStatus {
  return s === "transferred" || s === "cancelled" ? s : "pending_transfer";
}

export const payoutKeys = {
  owed: ["admin", "owed_bookings"] as const,
  ledger: ["admin", "payouts"] as const,
  shopEarnings: (shopId: string) => ["shop_earnings", shopId] as const,
};

export type OwedRow = {
  bookingId: string;
  shopId: string;
  shopName: string;
  barberName: string;
  customerId: string;
  customerLabel: string;
  paidAt: string | null;
  price: number;
  platformCut: number;
  shopCut: number;
};

/** Admin: the live owed pool (owed_bookings view) + customer labels from a separate profiles fetch. */
export function useOwedBookings() {
  return useQuery({
    queryKey: payoutKeys.owed,
    queryFn: async (): Promise<OwedRow[]> => {
      const { data, error } = await supabase
        .from("owed_bookings")
        .select("*")
        .order("paid_at", { ascending: false });
      if (error) throw error;

      // Never embed profiles on the view — resolve customer labels with a separate fetch.
      const customerIds = [...new Set(data.map((r) => r.customer_id).filter(Boolean))] as string[];
      const labels = new Map<string, string>();
      if (customerIds.length > 0) {
        const { data: people, error: peopleError } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", customerIds);
        if (peopleError) throw peopleError;
        for (const p of people) {
          labels.set(p.id, p.display_name?.trim() || p.email || p.id.slice(0, 8));
        }
      }

      return data
        .filter((r) => r.booking_id && r.shop_id)
        .map((r) => ({
          bookingId: r.booking_id as string,
          shopId: r.shop_id as string,
          shopName: r.shop_name?.trim() || "(unnamed shop)",
          barberName: r.barber_name ?? "",
          customerId: r.customer_id ?? "",
          customerLabel: labels.get(r.customer_id ?? "") ?? (r.customer_id ?? "").slice(0, 8),
          paidAt: r.paid_at,
          price: r.price ?? 0,
          platformCut: r.platform_cut ?? 0,
          shopCut: r.shop_cut ?? 0,
        }));
    },
  });
}

export type LedgerPayout = Payout & {
  bankAccountName: string | null;
  bankAccountNumber: string | null;
};

/** Admin: every payout batch (newest first) with the shop's bank fields for the transfer. */
export function usePayoutLedger() {
  return useQuery({
    queryKey: payoutKeys.ledger,
    queryFn: async (): Promise<LedgerPayout[]> => {
      const { data, error } = await supabase
        .from("payouts")
        .select("*, shop:profiles!payouts_shop_id_fkey(bank_account_name, bank_account_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(({ shop, ...p }) => ({
        ...p,
        bankAccountName: shop?.bank_account_name ?? null,
        bankAccountNumber: shop?.bank_account_number ?? null,
      }));
    },
  });
}

export type EarningsBooking = {
  id: string;
  price: number;
  paidAt: string | null;
  serviceName: string;
  barberName: string;
  platformCut: number;
  shopCut: number;
  payout: Pick<
    Payout,
    "id" | "status" | "created_at" | "marked_transferred_at" | "shop_cut" | "platform_pct"
  > | null;
};

/**
 * Shop: their own paid bookings (all barbers combined), each either owed (payout_id NULL)
 * or inside a payout. A cancelled payout's bookings already had payout_id nulled → owed.
 */
export function useShopEarnings(shopId: string) {
  return useQuery({
    queryKey: payoutKeys.shopEarnings(shopId),
    queryFn: async (): Promise<EarningsBooking[]> => {
      const [bookings, owed] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, price, paid_at, payout_id, service:services!inner(name, barber:barbers!inner(name, shop_id)), payout:payouts(id, status, created_at, marked_transferred_at, shop_cut, platform_pct)",
          )
          .eq("status", "paid")
          .eq("service.barber.shop_id", shopId)
          .order("paid_at", { ascending: false }),
        supabase
          .from("owed_bookings")
          .select("booking_id, platform_cut, shop_cut")
          .eq("shop_id", shopId),
      ]);
      if (bookings.error) throw bookings.error;
      if (owed.error) throw owed.error;

      const owedSplit = new Map(owed.data.map((o) => [o.booking_id, o]));
      return bookings.data
        .filter((b) => b.service?.barber?.shop_id === shopId)
        .map((b) => {
          const payout = b.payout_id ? (b.payout ?? null) : null;
          let platformCut: number;
          if (payout) {
            // inside a payout: apply the rate snapshotted on that batch
            platformCut = Math.round(b.price * Number(payout.platform_pct));
          } else {
            platformCut = owedSplit.get(b.id)?.platform_cut ?? 0;
          }
          return {
            id: b.id,
            price: b.price,
            paidAt: b.paid_at,
            serviceName: b.service?.name ?? "",
            barberName: b.service?.barber?.name ?? "",
            platformCut,
            shopCut: b.price - platformCut,
            payout,
          };
        });
    },
  });
}
