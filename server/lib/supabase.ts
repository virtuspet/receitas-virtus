import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Cliente base (chave anon/pública) — usado só para validar o token do usuário.
let _anon: SupabaseClient | null = null;
function anon(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _anon;
}

export interface AuthUser {
  id: string;
  email?: string;
}

// Valida o Bearer token contra o Supabase Auth e devolve o usuário + o token.
export async function verificarUsuario(
  authorization: string | undefined,
): Promise<{ user: AuthUser; token: string } | null> {
  if (!authorization) return null;
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await anon().auth.getUser(token);
  if (error || !data.user) return null;
  return { user: { id: data.user.id, email: data.user.email ?? undefined }, token };
}

// Cliente agindo COMO o usuário logado — o RLS o enxerga como 'authenticated'.
// (Ferramenta interna: as policies liberam tudo para autenticados, então não
// precisamos da service_role key no servidor.)
export function db(token: string): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
