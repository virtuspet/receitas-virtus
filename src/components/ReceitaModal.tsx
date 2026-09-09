import { useEffect, useState } from "react";
import type { ReceitaComFoto } from "../../shared/types.js";
import { api } from "../lib/api.js";
import { fmtDate } from "../lib/format.js";

export function ReceitaModal({
  id,
  onFechar,
  onConferida,
  onToast,
}: {
  id: string;
  onFechar: () => void;
  onConferida: () => void;
  onToast: (m: string) => void;
}) {
  const [r, setR] = useState<ReceitaComFoto | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    api
      .getReceita(id)
      .then((res) => setR(res.receita))
      .catch(() => setErro(true));
  }, [id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onFechar]);

  async function conferir() {
    if (!r) return;
    await api.conferir(r.id, true);
    onToast("Receita marcada como conferida");
    onConferida();
    onFechar();
  }

  const join = (a: (string | null | undefined)[]) => a.filter(Boolean).join(" · ");

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="m-head">
          <b>{r ? `Receita · ${new Date(r.data_recebimento).toLocaleDateString("pt-BR")}` : "Receita"}</b>
          <span className="spacer" style={{ flex: 1 }} />
          <button className="icon-btn" onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="m-body">
          {erro && <p className="empty">Não foi possível carregar a receita.</p>}
          {!r && !erro && <p className="empty">Carregando…</p>}
          {r && (
            <>
              {r.foto_url ? (
                <img className="m-photo" src={r.foto_url} alt="Foto da receita" />
              ) : (
                <div className="m-photo placeholder">Foto original arquivada</div>
              )}
              <dl className="kv">
                <dt>Veterinário</dt>
                <dd>{r.vet_nome || "—"}</dd>
                <dt>CRMV</dt>
                <dd>{r.vet_crmv || "—"}</dd>
                <dt>Clínica</dt>
                <dd>{r.clinica || "—"}</dd>
                <dt>Animal</dt>
                <dd>{join([r.animal_nome, r.animal_especie, r.animal_raca, r.animal_peso_kg ? `${r.animal_peso_kg} kg` : null]) || "—"}</dd>
                <dt>Tutor</dt>
                <dd>{r.tutor_nome || "—"}</dd>
                <dt>Prescrição</dt>
                <dd>{fmtDate(r.data_prescricao)}</dd>
                <dt>Status</dt>
                <dd>{r.conferido ? "Conferida" : "Não conferida"}</dd>
              </dl>
              <div style={{ display: "grid", gap: ".5rem" }}>
                {r.itens.map((it) => (
                  <div key={it.id} className="m-item">
                    <b>
                      {it.principio_ativo || "(medicamento)"}
                      {it.retencao && <span style={{ color: "var(--crit)" }}> ⚠</span>}
                    </b>
                    {join([it.nome_comercial, it.concentracao, it.forma]) && (
                      <>
                        {join([it.nome_comercial, it.concentracao, it.forma])}
                        <br />
                      </>
                    )}
                    {join([it.frequencia, it.duracao_dias ? `${it.duracao_dias} dias` : null, it.quantidade]) && (
                      <span style={{ color: "var(--ink-2)" }}>
                        {join([it.frequencia, it.duracao_dias ? `${it.duracao_dias} dias` : null, it.quantidade])}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {!r.conferido && (
                <button className="btn-primary" style={{ border: "none", padding: ".7rem", borderRadius: 6, fontWeight: 600 }} onClick={conferir}>
                  Marcar como conferida
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
