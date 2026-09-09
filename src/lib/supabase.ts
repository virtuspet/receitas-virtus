import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas — o login não vai funcionar até preencher o .env.",
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anon || "placeholder-anon-key",
  { auth: { persistSession: true, autoRefreshToken: true } },
);
