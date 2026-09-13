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
  itensPorReceita: number;
  produtosDiferentes: number;
  veterinariosUnicos: number;
  comRetencao: number;
  naoConferidas: number;
  totalItens: number;
}

// Identidade de um produto para fins de contagem: nome comercial (o que
// aparece na receita e no catálogo da loja); cai pro princípio ativo só
// quando a IA não leu nome comercial nenhum.
function chaveProduto(i: Receita["itens"][number]): string | null {
  const v = i.nome_comercial || i.principio_ativo;
  return v ? v.trim().toLowerCase() : null;
}

export function kpis(rows: Receita[]): Kpis {
  // nº de itens = nº de linhas de receita_item (um produto prescrito = um
  // item, não importa a quantidade/dose dispensada dentro dele).
  const totalItens = rows.reduce((a, r) => a + r.itens.length, 0);
  const produtos = new Set<string>();
  const vets = new Set<string>();
  rows.forEach((r) => {
    if (r.vet_nome) vets.add(r.vet_nome.trim().toLowerCase());
    r.itens.forEach((i) => {
      const k = chaveProduto(i);
      if (k) produtos.add(k);
    });
  });
  const comRetencao = rows.filter((r) => r.itens.some((i) => i.retencao)).length;
  return {
    total: rows.length,
    itensPorReceita: rows.length ? totalItens / rows.length : 0,
    produtosDiferentes: produtos.size,
    veterinariosUnicos: vets.size,
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
