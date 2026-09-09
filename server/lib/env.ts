// Lê e valida variáveis de ambiente do servidor.
// No dev local, server/dev.ts carrega o .env antes de importar isto.

function required(name: string, ...alternativas: string[]): string {
  for (const n of [name, ...alternativas]) {
    const v = process.env[n];
    if (v) return v;
  }
  throw new Error(`Variável de ambiente ausente: ${name}`);
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const env = {
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  anthropicModel: optional("ANTHROPIC_MODEL", "claude-opus-5"),
  get supabaseUrl() {
    return required("SUPABASE_URL", "VITE_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");
  },
  receitasBucket: optional("RECEITAS_BUCKET", "receitas"),
};

// true se a extração por IA está configurada
export function iaConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
