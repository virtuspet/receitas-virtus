import type { Receita } from "../../shared/types.js";

export type Periodo = "30" | "90" | "all";
export type FiltroEspecie = "all" | "Canino" | "Felino" | "Outros";

export function filtrar(receitas: Receita[], periodo: Periodo, especie: FiltroEspecie): Receita[] {
  const agora = Date.now();
  const span = periodo === "all" ? Infinity : parseInt(periodo, 10) * 864e5;
  return receitas.filter((r) => {
    if (agora - new Date(r.data_recebimento).getTime() > span) return false;
    if (especie === "all") return true;
    if (especie === "Outros") return r.animal_especie !== "Canino" && r.animal_especie !== "Felino";
    return r.animal_especie === especie;
  });
}

export interface Kpis {
  total: number;
  principiosUnicos: number;
  itensPorReceita: number;
  pctRetencao: number;
  comRetencao: number;
  naoConferidas: number;
  totalItens: number;
}

export function kpis(rows: Receita[]): Kpis {
  const totalItens = rows.reduce((a, r) => a + r.itens.length, 0);
  const pas = new Set<string>();
  rows.forEach((r) => r.itens.forEach((i) => i.principio_ativo && pas.add(i.principio_ativo.toLowerCase())));
  const comRetencao = rows.filter((r) => r.itens.some((i) => i.retencao)).length;
  return {
    total: rows.length,
    principiosUnicos: pas.size,
    itensPorReceita: rows.length ? totalItens / rows.length : 0,
    pctRetencao: rows.length ? Math.round((comRetencao / rows.length) * 100) : 0,
    comRetencao,
    naoConferidas: rows.filter((r) => !r.conferido).length,
    totalItens,
  };
}

export interface Contagem {
  k: string;
  v: number;
}

export function contarPorReceita(rows: Receita[], chave: (r: Receita) => string[]): Contagem[] {
  const m = new Map<string, number>();
  rows.forEach((r) => chave(r).forEach((k) => {
    k = (k ?? "").trim();
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }));
  return [...m.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
}

export function contarItens(rows: Receita[], chave: (i: Receita["itens"][number]) => string | null): Contagem[] {
  const m = new Map<string, number>();
  rows.forEach((r) => r.itens.forEach((i) => {
    const k = (chave(i) ?? "").trim();
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }));
  return [...m.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
}

export interface Bucket {
  data: Date;
  v: number;
}

export function serieTemporal(rows: Receita[], dias: number): { buckets: Bucket[]; passoSemanal: boolean } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const passo = dias > 45 ? 7 : 1;
  const buckets: Bucket[] = [];
  for (let i = dias; i >= 0; i -= passo) {
    const d0 = new Date(hoje.getTime() - i * 864e5);
    const d1 = new Date(d0.getTime() + passo * 864e5);
    const v = rows.filter((r) => {
      const t = new Date(r.data_recebimento).getTime();
      return t >= d0.getTime() && t < d1.getTime();
    }).length;
    buckets.push({ data: d0, v });
  }
  return { buckets, passoSemanal: passo > 1 };
}
