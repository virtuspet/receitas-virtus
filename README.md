# Conexão 360

App interno para **quantificar e analisar as receitas veterinárias** que chegam na loja.
O lojista fotografa ou envia a receita, a IA extrai os campos e o painel (estilo Power BI)
se atualiza a cada nova receita.

- **Frontend:** PWA (React + Vite) — instalável, funciona offline para consulta.
- **Backend:** API em TypeScript (Hono) — roda como função na Vercel ou localmente.
- **Dados:** Supabase (Postgres + Storage + Auth).
- **Extração:** API da Anthropic (Claude com visão) — a chave fica só no servidor.

## Telas

1. **Capturar** — botão de câmera + envio de arquivo (JPG/PNG/PDF). A leitura é automática;
   os campos vêm preenchidos e marcados quando a confiança é baixa. O lojista confere e salva.
2. **Painel** — KPIs, série temporal, princípios ativos mais prescritos, mix por espécie e
   forma farmacêutica, % de receitas com retenção obrigatória, e a tabela detalhada com a
   foto original.

## Como rodar

Veja **[SETUP.md](./SETUP.md)** — instalação do Node, contas (Supabase + Anthropic),
variáveis de ambiente, banco e deploy.

```bash
nvm use          # Node 20+
npm install
cp .env.example .env   # preencha as chaves
npm run dev            # http://localhost:5173
```

## Estrutura

```
src/            frontend PWA (React)
  components/   telas e gráficos
  lib/          api client, supabase, formatação, agregações
server/         API Hono (rotas, Supabase admin, Anthropic)
  lib/
shared/         tipos e regras de domínio usados pelos dois lados
api/            entrada da API na Vercel (encaminha para server/app.ts)
supabase/       migrations SQL
scripts/        seed opcional de dados de exemplo
```
