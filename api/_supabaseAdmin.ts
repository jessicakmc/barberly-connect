import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client (service-role / secret key). It BYPASSES RLS, so it is used
// only inside Vercel serverless functions — never imported by browser code, never VITE_-prefixed.
// Files in /api starting with "_" are not exposed as routes by Vercel.
const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
const secretKey = process.env["SUPABASE_SECRET_KEY"];

if (!url || !secretKey) {
  throw new Error(
    "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in the server env",
  );
}

// New-format `sb_secret_…` keys are opaque (not JWTs). The API gateway authenticates them via
// the `apikey` header; sending one as `Authorization: Bearer` is rejected. Strip that header so
// the request is authorized by `apikey` alone (legacy JWT service_role keys pass through as-is).
const opaqueKeyFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set("apikey", secretKey);
  if (secretKey.startsWith("sb_") && headers.get("Authorization") === `Bearer ${secretKey}`) {
    headers.delete("Authorization");
  }
  return fetch(input, { ...init, headers });
};

export const supabaseAdmin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: opaqueKeyFetch },
});
