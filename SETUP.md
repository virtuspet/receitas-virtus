# Setup — Conexão 360

Passo a passo do zero até rodar localmente e publicar. Tempo estimado: 30–45 min.

---

## 1. Node.js 20+

Este projeto precisa de Node. Se `node -v` não responder:

**macOS (recomendado — nvm):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# feche e reabra o terminal
nvm install 20
nvm use 20
```

Ou baixe o instalador em <https://nodejs.org> (versão LTS).

Confirme:
```bash
node -v   # v20.x ou maior
npm -v
```

---

## 2. Instalar as dependências

```bash
cd conexao-360
npm install
```

---

## 3. Conta Supabase (banco + storage + login)

1. Crie um projeto em <https://supabase.com> (plano grátis serve).
2. Em **Project Settings → API**, anote:
   - `Project URL` → vai em `SUPABASE_URL` e `VITE_SUPABASE_URL`
   - `anon public` key → vai em `SUPABASE_ANON_KEY` e `VITE_SUPABASE_ANON_KEY`

   > O servidor age como o usuário logado (via RLS) — **não é preciso a `service_role` key**.
3. Rode a migration do banco. Duas opções:

   **a) Pelo painel:** abra **SQL Editor**, cole o conteúdo de
   `supabase/migrations/20260907120000_init.sql` e execute.

   **b) Pela CLI:**
   ```bash
   npm i -g supabase
   supabase link --project-ref SEU_REF
   supabase db push
   ```

4. Crie o **primeiro usuário** (o login da loja): **Authentication → Users → Add user**,
   com e-mail e senha. Repita para cada pessoa que vai usar o app.
   > Em **Authentication → Providers → Email**, deixe "Confirm email" desligado se
   > quiser que o acesso funcione na hora.

O bucket de Storage `receitas` é criado pela própria migration.

---

## 4. Chave da Anthropic (extração por IA)

1. Crie uma chave em <https://console.anthropic.com> → **API Keys**.
2. Adicione crédito em **Billing** (a leitura custa ~US$ 0,01–0,03 por receita com
   `claude-opus-5`; `claude-sonnet-5` custa ~60% menos e vai bem para OCR).
3. A chave vai em `ANTHROPIC_API_KEY`. Ela **só existe no servidor** — nunca entra no bundle.

---

## 5. Arquivo `.env`

```bash
cp .env.example .env
```

Preencha todos os campos. Exemplo:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5

SUPABASE_URL=https://abcd.supabase.co
SUPABASE_ANON_KEY=eyJ...anon...

VITE_SUPABASE_URL=https://abcd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...anon...

API_PORT=8787
RECEITAS_BUCKET=receitas

# opcional, só para `npm run seed`
SEED_EMAIL=voce@loja.com
SEED_PASSWORD=...
```

---

## 6. Rodar localmente

```bash
npm run dev
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:8787/api/health> → deve responder `{"ok":true,"ia":true}`

O Vite faz proxy de `/api` para a API local, então é só abrir o frontend, fazer login
com o usuário criado no passo 3 e testar com uma foto/PDF de receita.

**Dados de exemplo (opcional)** — para ver o painel populado:
```bash
npm run seed
```

---

## 7. Verificar antes de publicar

```bash
npm run typecheck   # checagem de tipos
npm run build       # build de produção
```

---

## 8. Deploy na Vercel

1. Suba o repositório para o GitHub.
2. Em <https://vercel.com> → **New Project** → importe o repo.
3. A Vercel detecta o Vite sozinho. Em **Settings → Environment Variables**, adicione
   **todas** as variáveis do `.env` (as `VITE_*` também).
4. **Deploy.** A pasta `api/` vira uma função Node automaticamente; o front é servido
   estático. Não precisa de servidor separado.
5. No Supabase, em **Authentication → URL Configuration**, adicione a URL da Vercel
   em *Site URL* e *Redirect URLs*.

Pronto. O endereço da Vercel (ou um domínio próprio) é o que os lojistas abrem e
"adicionam à tela inicial" — aí o PWA instala de verdade, com ícone e uso offline
para consulta.

---

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `/api/health` retorna `"ia":false` | `ANTHROPIC_API_KEY` ausente no ambiente do servidor |
| Login falha sempre | usuário não criado no Supabase, ou "Confirm email" ligado |
| Erro 401 nas chamadas | sessão expirada — saia e entre de novo |
| Erro ao gravar / listar receitas | migration não rodou, ou RLS sem as policies (rode a migration de novo) |
| Extração retorna 429 | limite de uso da API Anthropic — adicione crédito / espere |
| Foto não aparece no detalhe | bucket `receitas` sem a policy (rode a migration de novo) |
| Build falha em `tsc` | rode `npm run typecheck` e corrija os tipos apontados |
