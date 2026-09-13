// Casa o nome do produto/princípio ativo lido da receita com o catálogo de
// produtos da loja (server/data/catalogo-produtos.json), pra saber o
// fornecedor e a categoria de cada item. Correspondência aproximada: o nome
// na receita raramente é idêntico ao "Descritivo" do catálogo (que inclui
// dosagem, embalagem etc.), e a IA/OCR às vezes erra uma letra (ex.:
// "Maxican" em vez de "Maxicam") — por isso o casamento por token tolera
// pequenas diferenças de digitação (distância de Levenshtein).
import catalogoRaw from "../data/catalogo-produtos.json" with { type: "json" };

interface LinhaCatalogo {
  descritivo: string;
  fornecedor: string;
  categoria: string;
}

interface LinhaIndexada extends LinhaCatalogo {
  tokens: string[];
}

// Palavras que não ajudam a identificar o produto (tipo, embalagem, unidade,
// conectores). Removidas antes de comparar.
const RUIDO = new Set([
  "com", "de", "da", "do", "das", "dos", "a", "ate", "acima", "abaixo", "x", "para", "e",
  "mg", "mcg", "ml", "g", "kg", "ui", "un", "cm",
  "comprimido", "comprimidos", "compimidos", "capsula", "capsulas", "cap", "caps",
  "frasco", "frascos", "pipeta", "pipetas", "gotas", "gota", "ampola", "ampolas",
  "sache", "saches", "tablete", "tabletes", "tabs", "dose", "doses", "unidade", "unidades",
  "spot", "on", "aerosol", "gel", "pasta", "creme", "solucao", "suspensao", "injetavel",
  "oral", "topico", "caixa", "bisnaga", "tubo", "refil", "kit",
]);

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas combinantes pós-NFD)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizar(s: string): string[] {
  const out: string[] = [];
  for (const t of normalizar(s).split(" ")) {
    const low = t.toLowerCase();
    if (t.length < 3) continue; // descarta muito curto (siglas soltas, números pequenos)
    if (RUIDO.has(low)) continue;
    if (/^\d+([.,]\d+)?$/.test(t)) continue; // número puro (dosagem)
    out.push(t);
  }
  return out;
}

// Distância de Levenshtein simples (uma linha de DP).
function distancia(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let diag = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]!;
      dp[j] = a[i - 1] === b[j - 1] ? diag : 1 + Math.min(diag, dp[j]!, dp[j - 1]!);
      diag = tmp;
    }
  }
  return dp[n]!;
}

// Tolera 1 letra de diferença em palavras curtas, 2 em palavras mais longas
// (cobre erro de OCR/transcrição tipo "Maxican" vs "Maxicam").
function tokensBatem(a: string, b: string): boolean {
  if (a === b) return true;
  const limite = Math.min(a.length, b.length) <= 5 ? 1 : 2;
  if (Math.abs(a.length - b.length) > limite) return false;
  return distancia(a, b) <= limite;
}

let _indice: LinhaIndexada[] | null = null;
function indice(): LinhaIndexada[] {
  if (!_indice) {
    _indice = (catalogoRaw as LinhaCatalogo[]).map((l) => ({ ...l, tokens: tokenizar(l.descritivo) }));
  }
  return _indice;
}

export interface MatchProduto {
  produtoCatalogo: string;
  fornecedor: string;
  categoria: string;
}

const LIMIAR = 0.55;

/**
 * Procura o melhor item do catálogo para um nome vindo da receita
 * (nomeComercial de preferência; principioAtivo como alternativa).
 * Retorna null se nenhum candidato bater o suficiente.
 */
export function casarProduto(nome: string | null | undefined): MatchProduto | null {
  if (!nome) return null;
  const alvo = tokenizar(nome);
  if (alvo.length === 0) return null;

  let melhor: LinhaIndexada | null = null;
  let melhorScore = 0;
  for (const linha of indice()) {
    if (linha.tokens.length === 0) continue;
    let acertos = 0;
    for (const t of alvo) {
      if (linha.tokens.some((c) => tokensBatem(t, c))) acertos++;
    }
    // fração dos tokens do NOME DA RECEITA que aparecem (ou quase) no
    // catálogo — o catálogo pode ter palavras extras (dosagem, categoria).
    const score = acertos / alvo.length;
    if (score > melhorScore || (score === melhorScore && melhor && linha.tokens.length < melhor.tokens.length)) {
      melhorScore = score;
      melhor = linha;
    }
  }

  if (!melhor || melhorScore < LIMIAR) return null;
  return { produtoCatalogo: melhor.descritivo, fornecedor: melhor.fornecedor, categoria: melhor.categoria };
}

/** Tenta nomeComercial primeiro, depois principioAtivo. */
export function casarItem(nomeComercial: string | null, principioAtivo: string | null): MatchProduto | null {
  return casarProduto(nomeComercial) ?? casarProduto(principioAtivo);
}
