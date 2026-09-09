// Regras de domínio puras — usadas no frontend e no backend.
import type { Especie, ReceitaExtraida, ItemExtraido } from "./types.js";

export const ESPECIES: Especie[] = ["Canino", "Felino", "Ave", "Roedor", "Equino", "Outro"];

export function mapEspecie(raw: unknown): Especie | null {
  const e = String(raw ?? "").toLowerCase().trim();
  if (!e) return null;
  if (/(can|c[ãa]o|cachorr)/.test(e)) return "Canino";
  if (/(fel|gat)/.test(e)) return "Felino";
  if (/(ave|p[áa]ssa|calops|papaga|periqu|arara)/.test(e)) return "Ave";
  if (/(roed|hamst|coelh|porqu|c[áa]ug|gerb|chinch|rato)/.test(e)) return "Roedor";
  if (/(equ|caval|[ée]gua|p[ôo]ni|muar)/.test(e)) return "Equino";
  return "Outro";
}

// Lista de referência de controlados (Portaria 344/98 e afins).
// Não é exaustiva — serve de rede de segurança sobre a resposta da IA.
export const CONTROLADOS = [
  "tramadol",
  "codeina",
  "codeína",
  "morfina",
  "metadona",
  "fentanil",
  "petidina",
  "nalbufina",
  "butorfanol",
  "fenobarbital",
  "gardenal",
  "primidona",
  "pentobarbital",
  "tiopental",
  "diazepam",
  "midazolam",
  "clonazepam",
  "alprazolam",
  "lorazepam",
  "gabapentina",
  "pregabalina",
  "cetamina",
  "ketamina",
  "amitriptilina",
  "fluoxetina",
  "clomipramina",
  "trazodona",
  "zolpidem",
  "metilfenidato",
  "diazepam",
];

export function isControlado(...campos: Array<string | null | undefined>): boolean {
  return campos.some((c) => {
    const s = String(c ?? "").toLowerCase();
    return s.length > 0 && CONTROLADOS.some((k) => s.includes(k));
  });
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "n/a") return null;
  return s;
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

// Normaliza a resposta crua da IA (ou um objeto vazio) para o formato canônico.
export function normalizeExtraida(raw: unknown): ReceitaExtraida {
  const d = (raw ?? {}) as Record<string, any>;
  const vet = (d.veterinario ?? {}) as Record<string, any>;
  const an = (d.animal ?? {}) as Record<string, any>;

  const itensRaw: any[] =
    Array.isArray(d.itens) && d.itens.length > 0 ? d.itens : [{}];

  const itens: ItemExtraido[] = itensRaw.map((x) => {
    const it = (x ?? {}) as Record<string, any>;
    return {
      principioAtivo: str(it.principioAtivo),
      nomeComercial: str(it.nomeComercial),
      concentracao: str(it.concentracao),
      forma: str(it.forma),
      via: str(it.via),
      frequencia: str(it.frequencia),
      duracaoDias: toInt(it.duracaoDias),
      quantidade: str(it.quantidade),
      retencao:
        it.retencao === true ||
        isControlado(it.principioAtivo, it.nomeComercial),
    };
  });

  const camposIncertos = Array.isArray(d.camposIncertos)
    ? d.camposIncertos.map((k: unknown) => String(k).toLowerCase())
    : [];

  return {
    veterinario: { nome: str(vet.nome), crmv: str(vet.crmv) },
    clinica: str(d.clinica),
    dataPrescricao: str(d.dataPrescricao),
    animal: {
      nome: str(an.nome),
      especie: mapEspecie(an.especie),
      raca: str(an.raca),
      sexo: str(an.sexo),
      pesoKg: str(an.pesoKg),
      idade: str(an.idade),
    },
    tutor: str(d.tutor),
    itens,
    camposIncertos,
  };
}

// Converte "DD/MM/AAAA" -> "AAAA-MM-DD" (Postgres date). Retorna null se não bater.
export function brDateToISO(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  if (!d || !mo || !y) return null;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
