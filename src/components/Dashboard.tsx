import { useMemo, useState } from "react";
import type { Receita } from "../../shared/types.js";
import { fmt, fmt1, diaMes } from "../lib/format.js";
import {
  filtrar,
  kpis as calcKpis,
  contarPorReceita,
  contarItens,
  serieTemporal,
  type Periodo,
  type FiltroEspecie,
} from "../lib/aggregate.js";
import { TimeSeries, RankBars, Proportion } from "./charts.js";

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
}: {
  receitas: Receita[];
  onAbrir: (id: string) => void;
}) {
  const [periodo, setPeriodo] = useState<Periodo>("30");
  const [especie, setEspecie] = useState<FiltroEspecie>("all");

  const rows = useMemo(() => filtrar(receitas, periodo, especie), [receitas, periodo, especie]);
  const k = useMemo(() => calcKpis(rows), [rows]);
  const serie = useMemo(
    () => serieTemporal(rows, periodo === "all" ? 90 : parseInt(periodo, 10)),
    [rows, periodo],
  );
  const topPa = useMemo(
    () => contarPorReceita(rows, (r) => r.itens.map((i) => i.principio_ativo ?? "").filter(Boolean)),
    [rows],
  );
  const porEspecie = useMemo(
    () => contarPorReceita(rows, (r) => (r.animal_especie ? [r.animal_especie] : [])),
    [rows],
  );
  const porForma = useMemo(() => contarItens(rows, (i) => i.forma), [rows]);

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
      </div>

      <div className="kpis">
        <Kpi val={fmt.format(k.total)} lbl="receitas no período" sub={k.naoConferidas ? `${fmt.format(k.naoConferidas)} não conferidas` : "todas conferidas"} />
        <Kpi val={fmt.format(k.principiosUnicos)} lbl="princípios ativos únicos" sub={`${fmt.format(k.totalItens)} itens no total`} />
        <Kpi val={k.total ? fmt1.format(k.itensPorReceita) : "0,0"} lbl="itens por receita" sub="média do período" />
        <Kpi val={`${k.pctRetencao}%`} lbl="com retenção de receita" sub={`${fmt.format(k.comRetencao)} de controlado`} />
      </div>

      <div className="grid">
        <TimeSeries buckets={serie.buckets} semanal={serie.passoSemanal} />
        <RankBars titulo="Princípios ativos mais prescritos" sub="por nº de receitas" dados={topPa} limite={6} />
        <RankBars titulo="Receitas por espécie" dados={porEspecie} limite={5} />
        <RankBars titulo="Itens por forma farmacêutica" dados={porForma} limite={5} />
        <Proportion com={k.comRetencao} total={k.total} />
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
              const pa = r.itens.map((i) => i.principio_ativo).filter(Boolean).join(", ") || "(sem itens)";
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
