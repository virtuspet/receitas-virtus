import { supabase } from "./supabase.js";
import type {
  ReceitaExtraida,
  Receita,
  ReceitaComFoto,
  NovaReceita,
} from "../../shared/types.js";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.error ?? `Erro ${res.status}`, res.status, json.code);
  }
  return json as T;
}

export const api = {
  async health(): Promise<{ ok: boolean; ia: boolean }> {
    const res = await fetch("/api/health");
    return res.json();
  },

  extract(base64: string, mimeType: string): Promise<{ dados: ReceitaExtraida; bruto: unknown }> {
    return req("/extract", { method: "POST", body: JSON.stringify({ base64, mimeType }) });
  },

  listReceitas(desde?: string): Promise<{ receitas: Receita[] }> {
    return req(`/receitas${desde ? `?desde=${encodeURIComponent(desde)}` : ""}`);
  },

  getReceita(id: string): Promise<{ receita: ReceitaComFoto }> {
    return req(`/receitas/${id}`);
  },

  criarReceita(payload: NovaReceita): Promise<{ id: string }> {
    return req("/receitas", { method: "POST", body: JSON.stringify(payload) });
  },

  conferir(id: string, conferido: boolean): Promise<{ ok: boolean }> {
    return req(`/receitas/${id}`, { method: "PATCH", body: JSON.stringify({ conferido }) });
  },
};
