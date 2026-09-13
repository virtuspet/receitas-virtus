// Entrada da API na Vercel (runtime Node).
//
// Não usamos `@hono/node-server/vercel` aqui: seu adapter constrói o corpo da
// Request como um ReadableStream (`Readable.toWeb(incoming)`) sem `duplex:
// "half"`, e isso trava silenciosamente ao ler o corpo em alguns ambientes —
// a função nunca erra, só fica presa até a Vercel matá-la aos 60s (é
// exatamente o que os logs mostravam: `[extract] entrou` aparecia, mas nunca
// o log seguinte, de corpo lido). Em vez disso, lemos o corpo manualmente
// como Buffer antes de montar a Request — sem stream, sem trava.
import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../server/app.js";

export const config = { maxDuration: 60 };

function lerCorpo(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const partes: Buffer[] = [];
    req.on("data", (c: Buffer) => partes.push(c));
    req.on("end", () => resolve(Buffer.concat(partes)));
    req.on("error", reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = (req.method ?? "GET").toUpperCase();
  const temCorpo = method !== "GET" && method !== "HEAD";
  const corpo = temCorpo ? await lerCorpo(req) : undefined;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    headers.set(k, Array.isArray(v) ? v.join(", ") : v);
  }

  const host = req.headers.host ?? "localhost";
  const url = `https://${host}${req.url ?? "/"}`;

  const request = new Request(url, {
    method,
    headers,
    body: corpo && corpo.length > 0 ? new Uint8Array(corpo) : undefined,
  });

  const resposta = await app.fetch(request);

  res.statusCode = resposta.status;
  resposta.headers.forEach((value, key) => res.setHeader(key, value));
  const buf = Buffer.from(await resposta.arrayBuffer());
  res.end(buf);
}
