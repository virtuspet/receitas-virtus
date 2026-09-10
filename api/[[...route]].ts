// Entrada da API na Vercel (runtime Node) — encaminha tudo para o app Hono.
import { handle } from "@hono/node-server/vercel";
import app from "../server/app.js";

export const config = { maxDuration: 60 };

export default handle(app);
