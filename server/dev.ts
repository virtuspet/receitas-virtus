// Servidor de desenvolvimento local: serve só a API.
// O Vite (npm run dev:web) serve o frontend e faz proxy de /api para cá.
import { readFileSync } from "node:fs";
import { serve } from "@hono/node-server";

// --- carregador de .env minimalista (sem dependência) ---
try {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const linha of raw.split("\n")) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  console.warn("[dev] .env não encontrado — usando apenas variáveis do ambiente.");
}

const { default: app } = await import("./app.js");

const port = Number(process.env.API_PORT || 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[api] http://localhost:${info.port}/api/health`);
});
