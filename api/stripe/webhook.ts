import Stripe from "stripe";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../_supabaseAdmin.js"; // .js extension required at runtime

// Signature verification needs the RAW bytes — turn off Vercel's body parsing.
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] ?? "");

async function rawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

/**
 * The ONLY place a booking becomes `paid`. On checkout.session.completed with
 * payment_status === 'paid' it flips the booking pending_payment → paid, stamps paid_at and
 * records the PaymentIntent id. No split is computed and no ledger row is written — the
 * platform/shop split is computed when the admin builds a payout (M2.2).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const sig = req.headers["stripe-signature"];
  if (typeof sig !== "string") return res.status(400).json({ error: "missing stripe-signature" });

  let event: Stripe.Event;
  try {
    const buf = await rawBody(req);
    event = stripe.webhooks.constructEvent(buf, sig, process.env["STRIPE_WEBHOOK_SECRET"] ?? "");
  } catch {
    return res.status(400).json({ error: "signature verification failed" });
  }

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return res.status(200).json({ received: true });

  const bookingId = session.metadata?.["booking_id"];
  if (!bookingId) return res.status(400).json({ error: "missing booking_id metadata" });

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // First to pay wins. The status guard makes this idempotent: a re-delivered event matches
  // zero rows (already 'paid') and changes nothing; the UNIQUE index on
  // stripe_payment_intent_id is a hard backstop against a concurrent double-fire.
  const { error } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", bookingId)
    .eq("status", "pending_payment");

  if (error && error.code !== "23505") {
    // Non-2xx → Stripe retries later. (23505 = the PI was already recorded: treat as done.)
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ received: true });
}
