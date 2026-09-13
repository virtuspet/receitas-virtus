import { Hono } from "hono";
import { cors } from "hono/cors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { db, verificarUsuario, type AuthUser } from "./lib/supabase.js";
import { env, iaConfigurada } from "./lib/env.js";
import { extrairReceita, ExtracaoError } from "./lib/anthropic.js";
import { brDateToISO } from "../shared/domain.js";
import type { NovaReceita, Receita } from "../shared/types.js";

type Vars = { user: AuthUser; sb: SupabaseClient };

const app = new Hono<{ Variables: Vars }>().basePath("/api");

app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true, ia: iaConfigurada() }));

// ---------- auth middleware ----------
app.use("*", async (c, next) => {
  if (c.req.path === "/api/health") return next();
  const auth = await verificarUsuario(c.req.header("Authorization"));
  if (!auth) return c.json({ error: "Não autenticado" }, 401);
  c.set("user", auth.user);
  c.set("sb", db(auth.token));
  return next();
});

// ---------- POST /api/extract ----------
app.post("/extract", async (c) => {
  if (!iaConfigurada()) {
    return c.json({ error: "Leitura automática não configurada no servidor." }, 503);
  }
  const body = await c.req
    .json<{ base64?: string; mimeType?: string }>()
    .catch(() => ({}) as { base64?: string; mimeType?: string });
  if (!body.base64 || !body.mimeType) {
    return c.json({ error: "Envie base64 e mimeType." }, 400);
  }
  const kb = Math.round((body.base64.length * 0.75) / 1024);
  console.log(`[extract] recebido: ${body.mimeType}, ~${kb}KB`);
  if (kb > 4000) {
    return c.json(
      { error: "Arquivo grande demais para a leitura automática (limite ~4MB). Tente uma foto em vez do PDF, ou comprima o arquivo." },
      413,
    );
  }
  try {
    const t0 = Date.now();
    const r = await extrairReceita(body.base64, body.mimeType);
    console.log(`[extract] ok em ${Date.now() - t0}ms — tokens ${r.usoTokens.entrada}/${r.usoTokens.saida}`);
    return c.json({ dados: r.dados, bruto: r.bruto, uso: r.usoTokens });
  } catch (err) {
    if (err instanceof ExtracaoError) {
      console.error(`[extract] ExtracaoError(${err.code}): ${err.message}`);
      const status = err.code === "rate_limited" ? 429 : err.code === "upstream" ? 502 : 422;
      return c.json({ error: err.message, code: err.code }, status);
    }
    console.error("[extract] erro inesperado:", err);
    return c.json({ error: "Falha inesperada na leitura.", detail: String((err as Error)?.message ?? err) }, 500);
  }
});

// ---------- GET /api/receitas ----------
app.get("/receitas", async (c) => {
  const desde = c.req.query("desde");
  let q = c
    .get("sb")
    .from("receita")
    .select("*, itens:receita_item(*)")
    .order("data_recebimento", { ascending: false })
    .limit(2000);
  if (desde) q = q.gte("data_recebimento", desde);
  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ receitas: data as Receita[] });
});

// ---------- GET /api/receitas/:id ----------
app.get("/receitas/:id", async (c) => {
  const sb = c.get("sb");
  const id = c.req.param("id");
  const { data, error } = await sb
    .from("receita")
    .select("*, itens:receita_item(*)")
    .eq("id", id)
    .single();
  if (error || !data) return c.json({ error: "Receita não encontrada" }, 404);

  let foto_url: string | null = null;
  if (data.foto_path) {
    const signed = await sb.storage.from(env.receitasBucket).createSignedUrl(data.foto_path, 3600);
    foto_url = signed.data?.signedUrl ?? null;
  }
  return c.json({ receita: { ...data, foto_url } });
});

// ---------- PATCH /api/receitas/:id ----------
app.patch("/receitas/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req
    .json<{ conferido?: boolean }>()
    .catch(() => ({}) as { conferido?: boolean });
  if (typeof body.conferido !== "boolean") return c.json({ error: "Nada a atualizar" }, 400);

  const { error } = await c.get("sb").from("receita").update({ conferido: body.conferido }).eq("id", id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// ---------- POST /api/receitas ----------
app.post("/receitas", async (c) => {
  const sb = c.get("sb");
  const user = c.get("user");
  const body = await c.req.json<NovaReceita>().catch(() => null);
  if (!body || !Array.isArray(body.itens)) {
    return c.json({ error: "Payload inválido" }, 400);
  }

  const { data: receita, error: e1 } = await sb
    .from("receita")
    .insert({
      data_prescricao: brDateToISO(body.data_prescricao) ?? null,
      clinica: body.clinica,
      vet_nome: body.vet_nome,
      vet_crmv: body.vet_crmv,
      animal_nome: body.animal_nome,
      animal_especie: body.animal_especie,
      animal_raca: body.animal_raca,
      animal_sexo: body.animal_sexo,
      animal_peso_kg: body.animal_peso_kg,
      tutor_nome: body.tutor_nome,
      origem: body.origem === "arquivo" ? "arquivo" : "foto",
      bruto: body.bruto ?? null,
      criado_por: user.id,
    })
    .select("id")
    .single();

  if (e1 || !receita) return c.json({ error: e1?.message ?? "Falha ao gravar" }, 500);

  // Upload do arquivo original
  let foto_path: string | null = null;
  if (body.arquivo?.base64 && body.arquivo.mimeType) {
    const ext = body.arquivo.mimeType === "application/pdf" ? "pdf" : "jpg";
    const path = `${receita.id}/original.${ext}`;
    const buf = Buffer.from(body.arquivo.base64, "base64");
    const up = await sb.storage
      .from(env.receitasBucket)
      .upload(path, buf, { contentType: body.arquivo.mimeType, upsert: true });
    if (!up.error) {
      foto_path = path;
      await sb.from("receita").update({ foto_path }).eq("id", receita.id);
    }
  }

  if (body.itens.length > 0) {
    const { error: e2 } = await sb.from("receita_item").insert(
      body.itens.map((it) => ({
        receita_id: receita.id,
        principio_ativo: it.principio_ativo,
        nome_comercial: it.nome_comercial,
        concentracao: it.concentracao,
        forma: it.forma,
        via: it.via,
        frequencia: it.frequencia,
        duracao_dias: it.duracao_dias,
        quantidade: it.quantidade,
        retencao: it.retencao,
      })),
    );
    if (e2) return c.json({ error: e2.message }, 500);
  }

  return c.json({ id: receita.id, foto_path });
});

export default app;
