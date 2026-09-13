import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env.js";
import { EXTRACT_PROMPT } from "./prompt.js";
import { normalizeExtraida } from "../../shared/domain.js";
import type { ReceitaExtraida } from "../../shared/types.js";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.anthropicApiKey });
  return _client;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export class ExtracaoError extends Error {
  constructor(
    message: string,
    readonly code:
      | "sem_json"
      | "recusado"
      | "rate_limited"
      | "arquivo_invalido"
      | "upstream",
  ) {
    super(message);
  }
}

// Extrai o texto da primeira resposta de texto do modelo.
function textoDaResposta(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Parser tolerante: JSON puro, ou dentro de ```json, ou do primeiro { ao último }.
function parseJsonTolerante(txt: string): unknown {
  const tryParse = (s: string): unknown | undefined => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  let out = tryParse(txt);
  if (out !== undefined) return out;

  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    out = tryParse(fence[1].trim());
    if (out !== undefined) return out;
  }

  const first = txt.indexOf("{");
  const last = txt.lastIndexOf("}");
  if (first >= 0 && last > first) {
    out = tryParse(txt.slice(first, last + 1));
    if (out !== undefined) return out;
  }
  return undefined;
}

export interface ResultadoExtracao {
  dados: ReceitaExtraida;
  bruto: unknown;
  usoTokens: { entrada: number; saida: number };
}

/**
 * Envia a imagem ou PDF para o Claude e devolve a receita já normalizada.
 * @param base64  conteúdo do arquivo em base64 (sem prefixo data:)
 * @param mimeType  ex.: "image/jpeg" ou "application/pdf"
 */
export async function extrairReceita(base64: string, mimeType: string): Promise<ResultadoExtracao> {
  const isPdf = mimeType === "application/pdf";
  const isImage = (IMAGE_TYPES as readonly string[]).includes(mimeType);
  if (!isPdf && !isImage) {
    throw new ExtracaoError(`Tipo de arquivo não suportado: ${mimeType}`, "arquivo_invalido");
  }

  const fileBlock: Anthropic.ContentBlockParam = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as (typeof IMAGE_TYPES)[number],
          data: base64,
        },
      };

  let msg: Anthropic.Message;
  try {
    msg = await client().messages.create(
      {
        model: env.anthropicModel,
        max_tokens: 4000,
        // "low": leitura estruturada de um documento não precisa do raciocínio
        // profundo do padrão — isso corta bastante o tempo de resposta (a função
        // na Vercel tem 60s de limite) sem perder precisão na extração.
        output_config: { effort: "low" },
        messages: [
          {
            role: "user",
            content: [fileBlock, { type: "text", text: EXTRACT_PROMPT }],
          },
        ],
      },
      { timeout: 50_000 },
    );
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      throw new ExtracaoError("Limite de uso da API atingido.", "rate_limited");
    }
    if (err instanceof Anthropic.BadRequestError) {
      throw new ExtracaoError(err.message, "arquivo_invalido");
    }
    if (err instanceof Anthropic.APIConnectionTimeoutError || /timeout|timed out/i.test(String((err as Error)?.message))) {
      throw new ExtracaoError(
        "A leitura demorou mais que o esperado. Tente uma foto mais nítida, com boa luz e reta, ou tente de novo.",
        "upstream",
      );
    }
    throw new ExtracaoError(
      err instanceof Error ? err.message : "Falha ao chamar a API.",
      "upstream",
    );
  }

  if (msg.stop_reason === "refusal") {
    throw new ExtracaoError("O modelo recusou processar este documento.", "recusado");
  }

  const txt = textoDaResposta(msg);
  const bruto = parseJsonTolerante(txt);
  if (bruto === undefined) {
    throw new ExtracaoError("A resposta da IA não continha JSON válido.", "sem_json");
  }

  return {
    dados: normalizeExtraida(bruto),
    bruto,
    usoTokens: {
      entrada: msg.usage.input_tokens,
      saida: msg.usage.output_tokens,
    },
  };
}
