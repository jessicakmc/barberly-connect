import Stripe from "stripe";
import type { VercelRequest, VercelResponse } from "@vercel/node";
// api/bookings/checkout.ts is one level below api/ → "../". The .js extension is required at
// runtime ("type": "module" + per-file transpile) or the function 500s with ERR_MODULE_NOT_FOUND.
import { supabaseAdmin } from "../_supabaseAdmin.js";

const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] ?? "");

// Stripe's zero-decimal currencies. TWD is NOT one of them — it is 2-decimal in Stripe, so
// unit_amount = price × 100 (NT$300 → 30000). platform_settings.currency_minor_units is a
// DISPLAY setting and must not drive this factor.
const ZERO_DECIMAL = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

type BookingRow = {
  id: string;
  customer_id: string;
  status: string;
  price: number;
  services: { name: string; barber_id: string; barbers: { name: string } | null } | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  // Who is asking? The browser sends its Supabase access token; only the booking's own
  // customer may pay for it.
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "please sign in" });
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) return res.status(401).json({ error: "please sign in" });

  const bookingId = (req.body as { booking_id?: unknown } | undefined)?.booking_id;
  if (typeof bookingId !== "string" || !bookingId) {
    return res.status(400).json({ error: "booking_id is required" });
  }

  // Load the booking + its price SNAPSHOT server-side — never trust a price from the client.
  // bookings has no barber_id / start_slot_id: the barber is reached via the service.
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id, customer_id, status, price, services(name, barber_id, barbers(name))")
    .eq("id", bookingId)
    .maybeSingle();
  const booking = data as BookingRow | null;
  if (error) return res.status(500).json({ error: error.message });
  if (!booking || booking.customer_id !== userData.user.id) {
    return res.status(404).json({ error: "booking not found" });
  }
  if (booking.status !== "pending_payment") {
    return res.status(400).json({ error: "this booking is not awaiting payment" });
  }

  const { data: cfg, error: cfgError } = await supabaseAdmin
    .from("platform_settings")
    .select("currency")
    .maybeSingle();
  if (cfgError) return res.status(500).json({ error: cfgError.message });
  const currency = ((cfg as { currency?: string } | null)?.currency ?? "twd").toLowerCase();
  const factor = ZERO_DECIMAL.has(currency) ? 1 : 100;

  const serviceName = booking.services?.name ?? "Booking";
  const barberName = booking.services?.barbers?.name ?? "Barberly";
  const barberId = booking.services?.barber_id ?? "";
  const origin =
    (req.headers.origin as string | undefined) ?? `https://${req.headers.host as string}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: `${serviceName} @ ${barberName}` },
            unit_amount: booking.price * factor, // TWD 300 → 30000 (NT$300.00)
          },
          quantity: 1,
        },
      ],
      // booking_id is the only join key the webhook needs (server-set, cannot be forged).
      metadata: { booking_id: booking.id, customer_id: booking.customer_id },
      client_reference_id: booking.id,
      ...(userData.user.email ? { customer_email: userData.user.email } : {}),
      success_url: `${origin}/bookings/success?booking_id=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/barbers/${barberId}?checkout=cancelled`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "could not start checkout";
    return res.status(502).json({ error: message });
  }
}
