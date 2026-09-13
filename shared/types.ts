// Tipos compartilhados entre frontend e backend.

export type Especie = "Canino" | "Felino" | "Ave" | "Roedor" | "Equino" | "Outro";

export interface ItemExtraido {
  principioAtivo: string | null;
  nomeComercial: string | null;
  concentracao: string | null;
  forma: string | null;
  via: string | null;
  frequencia: string | null;
  duracaoDias: number | null;
  quantidade: string | null;
  retencao: boolean;
}

export interface ReceitaExtraida {
  veterinario: { nome: string | null; crmv: string | null };
  clinica: string | null;
  dataPrescricao: string | null; // "DD/MM/AAAA" como veio na receita
  animal: {
    nome: string | null;
    especie: Especie | null;
    raca: string | null;
    sexo: string | null;
    pesoKg: string | null;
    idade: string | null;
  };
  tutor: string | null;
  itens: ItemExtraido[];
  camposIncertos: string[];
}

// Registro persistido (o que a API devolve em GET /api/receitas)
export interface ReceitaItem {
  id: string;
  principio_ativo: string | null;
  nome_comercial: string | null;
  concentracao: string | null;
  forma: string | null;
  via: string | null;
  frequencia: string | null;
  duracao_dias: number | null;
  quantidade: string | null;
  fornecedor: string | null;
  categoria: string | null;
  retencao: boolean;
}

export interface Receita {
  id: string;
  criado_em: string;
  data_prescricao: string | null;
  data_recebimento: string;
  clinica: string | null;
  vet_nome: string | null;
  vet_crmv: string | null;
  animal_nome: string | null;
  animal_especie: string | null;
  animal_raca: string | null;
  animal_sexo: string | null;
  animal_peso_kg: string | null;
  tutor_nome: string | null;
  conferido: boolean;
  foto_path: string | null;
  origem: "foto" | "arquivo";
  itens: ReceitaItem[];
}

export interface ReceitaComFoto extends Receita {
  foto_url: string | null; // signed URL de curta duração
}

// Payload de criação
export interface NovaReceita {
  data_prescricao: string | null;
  clinica: string | null;
  vet_nome: string | null;
  vet_crmv: string | null;
  animal_nome: string | null;
  animal_especie: string | null;
  animal_raca: string | null;
  animal_sexo: string | null;
  animal_peso_kg: string | null;
  tutor_nome: string | null;
  origem: "foto" | "arquivo";
  // fornecedor/categoria não vêm do cliente — o servidor casa com o catálogo ao salvar
  itens: Array<Omit<ReceitaItem, "id" | "fornecedor" | "categoria">>;
  // imagem/arquivo original em base64 (sem prefixo data:)
  arquivo?: { base64: string; mimeType: string } | null;
  // resposta crua da IA, para auditoria
  bruto?: unknown;
}
