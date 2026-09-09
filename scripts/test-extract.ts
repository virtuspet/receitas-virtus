// Teste pontual da extração por IA — passe o caminho de uma receita (imagem ou PDF).
// Uso: npm run test:extract -- /caminho/da/receita.pdf
import { readFileSync } from "node:fs";

try {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const l of raw.split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* usa env do ambiente */
}

const caminho = process.argv[2];
if (!caminho) {
  console.error("Uso: npm run test:extract -- /caminho/da/receita.pdf");
  process.exit(1);
}

const ext = caminho.split(".").pop()?.toLowerCase();
const mime =
  ext === "pdf"
    ? "application/pdf"
    : ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : "image/jpeg";

const { extrairReceita } = await import("../server/lib/anthropic.js");

console.log(`Lendo ${caminho} (${mime})…`);
const base64 = readFileSync(caminho).toString("base64");
const r = await extrairReceita(base64, mime);
console.log("\n--- DADOS EXTRAÍDOS ---");
console.log(JSON.stringify(r.dados, null, 2));
console.log(`\ntokens: ${r.usoTokens.entrada} entrada / ${r.usoTokens.saida} saída`);
