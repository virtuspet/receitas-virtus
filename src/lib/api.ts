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

async function req<T>(path: string, init?: RequestInit, timeoutMs = 20_000): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      signal: ctl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError(
        "O envio demorou demais e foi cancelado — provavelmente a conexão está lenta. Verifique o Wi-Fi/dados e tente de novo.",
        0,
        "client_timeout",
      );
    }
    throw new ApiError(
      "Não consegui falar com o servidor — verifique sua conexão com a internet e tente de novo.",
      0,
      "network_error",
    );
  } finally {
    clearTimeout(timer);
  }
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
    // até 55s: a leitura em si tem até ~48s de prazo no servidor + upload do arquivo
    return req("/extract", { method: "POST", body: JSON.stringify({ base64, mimeType }) }, 55_000);
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

  // Baixa a planilha (não passa por req() porque a resposta não é JSON).
  async baixarExport(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch("/api/export", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new ApiError(json.error ?? `Erro ${res.status}`, res.status, json.code);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conexao-360-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
