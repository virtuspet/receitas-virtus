#!/usr/bin/env bash
# Deploy do Conexão 360 na Vercel.
# Pré-requisito: `npx vercel login` (uma vez).
# Uso: bash scripts/deploy-vercel.sh
set -euo pipefail
cd "$(dirname "$0")/.."

VERCEL="npx --yes vercel@latest"

if ! $VERCEL whoami >/dev/null 2>&1; then
  echo "❌ Não está logado. Rode primeiro:  npx vercel login"
  exit 1
fi
echo "✓ Logado como $($VERCEL whoami 2>/dev/null)"

# 1. Linka (cria) o projeto
$VERCEL link --yes

# 2. Variáveis de ambiente (lê do .env local)
set -a; source .env; set +a

put_env() {
  local name="$1" value="$2"
  [ -z "$value" ] && { echo "  (pulando $name — vazio)"; return; }
  for target in production preview development; do
    # remove se já existir, depois adiciona
    printf '%s' "$value" | $VERCEL env rm "$name" "$target" --yes >/dev/null 2>&1 || true
    printf '%s' "$value" | $VERCEL env add "$name" "$target" >/dev/null
  done
  echo "  ✓ $name"
}

echo "Enviando variáveis de ambiente…"
put_env ANTHROPIC_API_KEY      "${ANTHROPIC_API_KEY:-}"
put_env ANTHROPIC_MODEL        "${ANTHROPIC_MODEL:-claude-opus-5}"
put_env SUPABASE_URL          "${SUPABASE_URL:-}"
put_env SUPABASE_ANON_KEY     "${SUPABASE_ANON_KEY:-}"
put_env VITE_SUPABASE_URL     "${VITE_SUPABASE_URL:-}"
put_env VITE_SUPABASE_ANON_KEY "${VITE_SUPABASE_ANON_KEY:-}"
put_env RECEITAS_BUCKET       "${RECEITAS_BUCKET:-receitas}"

# 3. Deploy de produção
echo "Publicando…"
$VERCEL deploy --prod --yes
