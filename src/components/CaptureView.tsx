import { useRef, useState } from "react";
import type { Receita, ReceitaExtraida } from "../../shared/types.js";
import { normalizeExtraida } from "../../shared/domain.js";
import { api, ApiError } from "../lib/api.js";
import { reduzirImagem, fileToBase64, diaMes } from "../lib/format.js";
import { ExtractForm } from "./ExtractForm.js";

type Arquivo = { base64: string; mimeType: string };

type Estado =
  | { fase: "idle" }
  | { fase: "preparando" }
  | { fase: "lendo"; preview: string | null; tamanhoKB: number }
  | { fase: "erro"; msg: string; podeRepetir: boolean }
  | {
      fase: "form";
      dados: ReceitaExtraida;
      bruto: unknown;
      preview: string | null;
      nota: string | null;
    };

export function CaptureView({
  iaDisponivel,
  recentes,
  onSalvo,
  onAbrir,
  onToast,
}: {
  iaDisponivel: boolean | null;
  recentes: Receita[];
  onSalvo: () => void;
  onAbrir: (id: string) => void;
  onToast: (m: string) => void;
}) {
  const [estado, setEstado] = useState<Estado>({ fase: "idle" });
  const arquivoRef = useRef<Arquivo | null>(null);
  const origemRef = useRef<"foto" | "arquivo">("foto");
  const camInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function aoEscolher(file: File | undefined, origem: "foto" | "arquivo") {
    if (!file) return;
    origemRef.current = origem;
    setEstado({ fase: "preparando" });
    try {
      let arquivo: Arquivo;
      let preview: string | null = null;
      if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        if (file.size > 4_000_000) {
          setEstado({
            fase: "erro",
            msg: `Esse PDF tem ${(file.size / 1_000_000).toFixed(1)}MB — grande demais para a leitura automática (limite ~4MB). Tente enviar uma foto da receita em vez do PDF, ou um PDF menor.`,
            podeRepetir: false,
          });
          return;
        }
        arquivo = { base64: await fileToBase64(file), mimeType: "application/pdf" };
      } else if (file.type.startsWith("image/")) {
        const r = await reduzirImagem(file);
        arquivo = { base64: r.base64, mimeType: r.mimeType };
        preview = r.previewUrl;
      } else {
        setEstado({ fase: "erro", msg: "Formato não suportado. Envie JPG, PNG ou PDF.", podeRepetir: false });
        return;
      }
      arquivoRef.current = arquivo;
      await ler(preview);
    } catch (e) {
      setEstado({ fase: "erro", msg: e instanceof Error ? e.message : "Falha ao abrir o arquivo.", podeRepetir: false });
    }
  }

  async function ler(preview: string | null) {
    const arquivo = arquivoRef.current;
    if (!arquivo) return;
    if (iaDisponivel === false) {
      setEstado({
        fase: "form",
        dados: normalizeExtraida({}),
        bruto: null,
        preview,
        nota: "Leitura automática indisponível no servidor. Confira e preencha os campos.",
      });
      return;
    }
    const tamanhoKB = Math.round((arquivo.base64.length * 0.75) / 1024);
    setEstado({ fase: "lendo", preview, tamanhoKB });
    try {
      const { dados, bruto } = await api.extract(arquivo.base64, arquivo.mimeType);
      setEstado({ fase: "form", dados, bruto, preview, nota: null });
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      if (err?.status === 503) {
        setEstado({
          fase: "form",
          dados: normalizeExtraida({}),
          bruto: null,
          preview,
          nota: "Leitura automática não configurada no servidor. Preencha os campos manualmente.",
        });
        return;
      }
      const msg =
        err?.status === 429
          ? "Limite de uso da IA atingido. Aguarde um instante e tente de novo."
          : err?.code === "recusado" || err?.code === "sem_json"
            ? "Não consegui ler os dados dessa receita com segurança. Tente uma foto mais nítida ou preencha manualmente."
            : // mensagens específicas (timeout do cliente, rede, ou texto vindo do servidor)
              err?.message || "Falha temporária na leitura. Tente de novo.";
      setEstado({ fase: "erro", msg, podeRepetir: true });
    }
  }

  function reset() {
    arquivoRef.current = null;
    setEstado({ fase: "idle" });
  }

  return (
    <>
      <div className="view-head">
        <h2>Nova receita</h2>
        <p>Fotografe ou envie o arquivo. A leitura é automática.</p>
      </div>

      {iaDisponivel === false && (
        <div className="ai-status off">
          Leitura automática indisponível no servidor — configure a chave da API. O formulário manual funciona.
        </div>
      )}
      {iaDisponivel === null && <div className="ai-status wait">Verificando leitura automática…</div>}
      {iaDisponivel === true && estado.fase === "idle" && (
        <div className="ai-status on">Leitura automática ativa</div>
      )}

      {estado.fase === "idle" && (
        <div className="capture-cta">
          <button className="btn-shoot" onClick={() => camInput.current?.click()}>
            <span aria-hidden>📷</span>
            <span>Tirar foto</span>
          </button>
          <button className="btn-upload" onClick={() => fileInput.current?.click()}>
            <span aria-hidden>📎</span>
            <span>Enviar imagem ou arquivo</span>
          </button>
          <p className="hint">JPG, PNG ou PDF · a foto original fica guardada</p>
          <input
            ref={camInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => aoEscolher(e.target.files?.[0], "foto")}
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={(e) => aoEscolher(e.target.files?.[0], "arquivo")}
          />
        </div>
      )}

      {(estado.fase === "preparando" || estado.fase === "lendo") && (
        <div className="reading">
          <div className="thumb">
            {estado.fase === "lendo" && estado.preview ? (
              <img src={estado.preview} alt="Prévia" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              "📄"
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{estado.fase === "preparando" ? "Preparando o arquivo…" : "Lendo a receita…"}</b>
            <br />
            <small>
              {estado.fase === "lendo" ? `~${estado.tamanhoKB}KB · pode levar até 1 minuto` : "Aguarde"}
            </small>
            <div className="bar-track">
              <div className="bar-fill" />
            </div>
          </div>
        </div>
      )}

      {estado.fase === "erro" && (
        <div className="extracted">
          <div className="x-body">
            <p style={{ margin: ".2rem 0", fontSize: ".9rem" }}>⚠ {estado.msg}</p>
          </div>
          <div className="x-actions">
            <button
              className="btn-ghost"
              onClick={() =>
                setEstado({
                  fase: "form",
                  dados: normalizeExtraida({}),
                  bruto: null,
                  preview: null,
                  nota: "Preencha os campos e salve no painel.",
                })
              }
            >
              Preencher manualmente
            </button>
            {estado.podeRepetir && (
              <button className="btn-primary" onClick={() => ler(null)}>
                Tentar de novo
              </button>
            )}
          </div>
        </div>
      )}

      {estado.fase === "form" && (
        <ExtractForm
          dados={estado.dados}
          bruto={estado.bruto}
          previewUrl={estado.preview}
          arquivo={arquivoRef.current}
          origem={origemRef.current}
          nota={estado.nota}
          onTentarIA={estado.nota != null && iaDisponivel === true ? () => ler(estado.preview) : undefined}
          onCancelar={reset}
          onSalvo={() => {
            reset();
            onSalvo();
          }}
          onToast={onToast}
        />
      )}

      {estado.fase === "idle" && (
        <>
          <p className="section-label">Últimas capturas</p>
          {recentes.length === 0 ? (
            <p className="empty">Nenhuma receita ainda.</p>
          ) : (
            recentes.slice(0, 6).map((r) => {
              const pa = r.itens.map((i) => i.principio_ativo).filter(Boolean).join(", ") || "(sem itens)";
              const ret = r.itens.some((i) => i.retencao);
              return (
                <button key={r.id} className="rec" onClick={() => onAbrir(r.id)}>
                  <span className="r-ico">{ret ? "⚠" : "℞"}</span>
                  <span className="r-main">
                    <b>{pa}</b>
                    <small>{[r.animal_especie, r.vet_nome].filter(Boolean).join(" · ")}</small>
                  </span>
                  <span className="r-date">{diaMes(r.data_recebimento)}</span>
                </button>
              );
            })
          )}
        </>
      )}
    </>
  );
}
