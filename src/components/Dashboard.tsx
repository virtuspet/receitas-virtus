import { useMemo, useState } from "react";
import type { Receita } from "../../shared/types.js";
import { fmt, fmt1, diaMes } from "../lib/format.js";
import { api } from "../lib/api.js";
import {
  filtrar,
  kpis as calcKpis,
  contarPorReceita,
  contarItens,
  serieTemporal,
  type Periodo,
  type FiltroEspecie,
} from "../lib/aggregate.js";
import { TimeSeries, RankBars } from "./charts.js";

const PERIODOS: { v: Periodo; label: string }[] = [
  { v: "30", label: "30 dias" },
  { v: "90", label: "90 dias" },
  { v: "all", label: "Tudo" },
];
const ESPECIES: { v: FiltroEspecie; label: string }[] = [
  { v: "all", label: "Todas" },
  { v: "Canino", label: "Canino" },
  { v: "Felino", label: "Felino" },
  { v: "Outros", label: "Outros" },
];

export function Dashboard({
  receitas,
  onAbrir,
  onToast,
}: {
  receitas: Receita[];
  onAbrir: (id: string) => void;
  onToast: (m: string) => void;
}) {
  const [periodo, setPeriodo] = useState<Periodo>("30");
  const [especie, setEspecie] = useState<FiltroEspecie>("all");
  const [exportando, setExportando] = useState(false);

  const rows = useMemo(() => filtrar(receitas, periodo, especie), [receitas, periodo, especie]);
  const k = useMemo(() => calcKpis(rows), [rows]);
  const serie = useMemo(
    () => serieTemporal(rows, periodo === "all" ? 90 : parseInt(periodo, 10)),
    [rows, periodo],
  );
  const topProdutos = useMemo(
    () => contarItens(rows, (i) => i.nome_comercial || i.principio_ativo),
    [rows],
  );
  const porEspecie = useMemo(
    () => contarPorReceita(rows, (r) => (r.animal_especie ? [r.animal_especie] : [])),
    [rows],
  );
  const porFornecedor = useMemo(() => contarItens(rows, (i) => i.fornecedor ?? "Não identificado"), [rows]);
  const porVeterinario = useMemo(
    () => contarPorReceita(rows, (r) => (r.vet_nome ? [r.vet_nome] : [])),
    [rows],
  );
  const porCategoria = useMemo(() => contarItens(rows, (i) => i.categoria ?? "Não identificado"), [rows]);
  const porClinica = useMemo(
    () => contarPorReceita(rows, (r) => (r.clinica ? [r.clinica] : [])),
    [rows],
  );

  async function exportarExcel() {
    setExportando(true);
    try {
      await api.baixarExport();
    } catch {
      onToast("Não consegui gerar a planilha. Tente de novo.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <>
      <div className="view-head">
        <h2>Painel</h2>
        <p>Atualiza a cada receita salva</p>
      </div>

      <div className="filters" role="group" aria-label="Filtros">
        <div className="f-group">
          {PERIODOS.map((p) => (
            <button key={p.v} className="chip" aria-pressed={periodo === p.v} onClick={() => setPeriodo(p.v)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="f-group">
          {ESPECIES.map((e) => (
            <button key={e.v} className="chip" aria-pressed={especie === e.v} onClick={() => setEspecie(e.v)}>
              {e.label}
            </button>
          ))}
        </div>
        <span className="spacer" style={{ flex: 1 }} />
        <button className="btn-upload" style={{ padding: ".45rem .8rem" }} onClick={exportarExcel} disabled={exportando}>
          <span aria-hidden>📊</span>&nbsp;{exportando ? "Gerando…" : "Exportar Excel"}
        </button>
      </div>

      <div className="kpis">
        <Kpi val={fmt.format(k.total)} lbl="receitas no período" sub={k.naoConferidas ? `${fmt.format(k.naoConferidas)} não conferidas` : "todas conferidas"} />
        <Kpi val={k.total ? fmt1.format(k.itensPorReceita) : "0,0"} lbl="itens por receita" sub={`${fmt.format(k.totalItens)} itens no total`} />
        <Kpi val={fmt.format(k.produtosDiferentes)} lbl="produtos diferentes" sub="prescritos no período" />
        <Kpi val={fmt.format(k.veterinariosUnicos)} lbl="veterinários únicos" sub="atenderam no período" />
      </div>

      <div className="grid">
        <TimeSeries buckets={serie.buckets} semanal={serie.passoSemanal} />
        <RankBars titulo="Produtos mais prescritos" sub="por nº de vezes" dados={topProdutos} limite={6} />
        <RankBars titulo="Receitas por espécie" dados={porEspecie} limite={5} />
        <RankBars titulo="Fornecedores mais prescritos" sub="por nº de itens" dados={porFornecedor} limite={6} />
        <RankBars titulo="Ranking de receitas por veterinário" dados={porVeterinario} limite={6} />
        <RankBars titulo="Categorias mais prescritas" sub="por nº de itens" dados={porCategoria} limite={6} />
        <RankBars titulo="Clínica que mais prescreve" dados={porClinica} limite={6} />
        <Tabela rows={rows} onAbrir={onAbrir} />
      </div>
    </>
  );
}

function Kpi({ val, lbl, sub }: { val: string; lbl: string; sub: string }) {
  return (
    <div className="kpi">
      <div className="k-val">{val}</div>
      <div className="k-lbl">{lbl}</div>
      <div className="k-sub">{sub}</div>
    </div>
  );
}

function Tabela({ rows, onAbrir }: { rows: Receita[]; onAbrir: (id: string) => void }) {
  const list = rows.slice(0, 12);
  return (
    <div className="viz col-span">
      <h3>Receitas recentes</h3>
      <p className="v-sub">Toque para ver a receita e a foto original</p>
      <div style={{ overflowX: "auto" }}>
        <table className="detail">
          <thead>
            <tr>
              <th>Data</th>
              <th>Itens / origem</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={3} className="empty">Sem receitas no filtro atual</td>
              </tr>
            )}
            {list.map((r) => {
              const pa = r.itens.map((i) => i.nome_comercial || i.principio_ativo).filter(Boolean).join(", ") || "(sem itens)";
              const ret = r.itens.some((i) => i.retencao);
              return (
                <tr key={r.id} tabIndex={0} onClick={() => onAbrir(r.id)} onKeyDown={(e) => e.key === "Enter" && onAbrir(r.id)}>
                  <td className="t-date">{diaMes(r.data_recebimento)}</td>
                  <td>
                    {pa}
                    <br />
                    <span style={{ color: "var(--ink-muted)", fontSize: ".72rem" }}>
                      {[r.animal_especie, r.vet_nome].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td>
                    {ret ? (
                      <span className="st ret">retenção</span>
                    ) : r.conferido ? (
                      <span className="st ok">conferida</span>
                    ) : (
                      <span className="st rev">a conferir</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
