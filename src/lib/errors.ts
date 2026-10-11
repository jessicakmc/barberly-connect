/**
 * Extracts a human-readable message from anything thrown.
 *
 * Supabase returns a `PostgrestError` — a plain object `{ message, details, hint, code }`,
 * NOT an `Error` instance — so `err instanceof Error` is false for every RPC failure.
 * Read `.message` off the object shape first so the real DB message (e.g. "those time
 * slots were just taken") reaches the user instead of a generic fallback.
 */
export function errMessage(err: unknown, fallback = "Something went wrong."): string {
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
