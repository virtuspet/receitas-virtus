// Popula o banco com receitas de exemplo (opcional, para ver o painel com dados).
// Uso: npm run seed   (precisa de SEED_EMAIL e SEED_PASSWORD no .env)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

try {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const l of raw.split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* usa env do ambiente */
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;

if (!email || !password) {
  console.error("Defina SEED_EMAIL e SEED_PASSWORD no .env (o usuário criado no Supabase Auth).");
  process.exit(1);
}

const db = createClient(url, anon, { auth: { persistSession: false } });

const VETS: [string, string][] = [
  ["Dra. Amanda Rocha", "CRMV-PR 04211"],
  ["Dr. Bruno Lima", "CRMV-PR 05188"],
  ["Dra. Carla Menezes", "CRMV-SC 03920"],
  ["Dr. Diego Alves", "CRMV-PR 06077"],
];
const CLINICAS = ["Clínica VetVida", "Hospital PetSaúde", "Consultório Bicho Amigo", "Clínica AnimalCare"];
const PA: [string, string, string, boolean][] = [
  ["Amoxicilina + clavulanato", "250 mg", "Comprimido", false],
  ["Dipirona", "500 mg/mL", "Solução", false],
  ["Meloxicam", "1 mg/mL", "Suspensão", false],
  ["Prednisolona", "20 mg", "Comprimido", false],
  ["Cefalexina", "300 mg", "Comprimido", false],
  ["Maropitant", "16 mg", "Comprimido", false],
  ["Omeprazol", "20 mg", "Cápsula", false],
  ["Enrofloxacino", "50 mg", "Comprimido", false],
  ["Tramadol", "50 mg", "Comprimido", true],
  ["Gabapentina", "300 mg", "Cápsula", true],
  ["Fenobarbital", "50 mg", "Comprimido", true],
];
const ANIMAIS: [string, string, string, string][] = [
  ["Canino", "Labrador", "Thor", "Marina S."],
  ["Canino", "SRD", "Nina", "Rafael M."],
  ["Canino", "Poodle", "Meg", "Juliana P."],
  ["Felino", "SRD", "Frajola", "Beatriz L."],
  ["Felino", "Siamês", "Lua", "Diego F."],
  ["Ave", "Calopsita", "Kiwi", "Rodrigo A."],
  ["Roedor", "Hamster", "Pipoca", "Ana C."],
];
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;

async function run() {
  const { error: authErr } = await db.auth.signInWithPassword({ email: email!, password: password! });
  if (authErr) {
    console.error("Login falhou:", authErr.message);
    process.exit(1);
  }

  let n = 0;
  for (let dia = 0; dia <= 80; dia++) {
    const base = dia < 30 ? 0.7 : dia < 60 ? 0.4 : 0.25;
    let qtd = 0;
    const r = Math.random();
    if (r < base - 0.45) qtd = 3;
    else if (r < base - 0.2) qtd = 2;
    else if (r < base) qtd = 1;

    for (let j = 0; j < qtd; j++) {
      const [vet, crmv] = pick(VETS);
      const [especie, raca, nome, tutor] = pick(ANIMAIS);
      const receb = new Date();
      receb.setDate(receb.getDate() - dia);
      receb.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

      const { data: rec } = await db
        .from("receita")
        .insert({
          data_prescricao: new Date(receb.getTime() - 864e5).toISOString().slice(0, 10),
          data_recebimento: receb.toISOString(),
          clinica: pick(CLINICAS),
          vet_nome: vet,
          vet_crmv: crmv,
          animal_nome: nome,
          animal_especie: especie,
          animal_raca: raca,
          animal_sexo: Math.random() < 0.5 ? "Macho" : "Fêmea",
          animal_peso_kg: (1 + Math.random() * 35).toFixed(1),
          tutor_nome: tutor,
          conferido: Math.random() < 0.55,
          origem: "foto",
        })
        .select("id")
        .single();

      if (!rec) continue;
      const nItens = Math.random() < 0.4 ? 2 : 1;
      const usados = new Set<string>();
      const itens = [];
      for (let k = 0; k < nItens; k++) {
        let p = pick(PA);
        let guard = 0;
        while (usados.has(p[0]) && guard++ < 10) p = pick(PA);
        usados.add(p[0]);
        const dur = pick([5, 7, 7, 10, 14, 30]);
        itens.push({
          receita_id: rec.id,
          principio_ativo: p[0],
          concentracao: p[1],
          forma: p[2],
          via: "Oral",
          frequencia: pick(["12/12h", "24/24h", "8/8h"]),
          duracao_dias: dur,
          quantidade: `${dur * 2} un`,
          retencao: p[3],
        });
      }
      await db.from("receita_item").insert(itens);
      n++;
    }
  }
  console.log(`Inseridas ${n} receitas de exemplo.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
