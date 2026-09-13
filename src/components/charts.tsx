import { fmt } from "../lib/format.js";
import type { Bucket, Contagem } from "../lib/aggregate.js";

// ---------- série temporal ----------
export function TimeSeries({ buckets, semanal }: { buckets: Bucket[]; semanal: boolean }) {
  const W = 320;
  const H = 132;
  const pl = 8;
  const pr = 10;
  const pt = 10;
  const pb = 20;
  const iw = W - pl - pr;
  const ih = H - pt - pb;
  const max = Math.max(1, ...buckets.map((b) => b.v));
  const total = buckets.reduce((a, b) => a + b.v, 0);
  const X = (i: number) => pl + (buckets.length < 2 ? iw / 2 : (i / (buckets.length - 1)) * iw);
  const Y = (v: number) => pt + ih - (v / max) * ih;

  const line = buckets.map((b, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(b.v).toFixed(1)}`).join(" ");
  const area = `${line} L${X(buckets.length - 1).toFixed(1)} ${pt + ih} L${X(0).toFixed(1)} ${pt + ih} Z`;

  const ticks = [0, 1, 2].map((g) => {
    const yv = Math.round((max * g) / 2);
    const yy = Y(yv);
    return (
      <g key={g}>
        <line className="grid-line" x1={pl} y1={yy} x2={W - pr} y2={yy} />
        <text className="axis-txt" x={pl} y={yy - 3}>{yv}</text>
      </g>
    );
  });

  const d0 = buckets[0]?.data;
  const dN = buckets[buckets.length - 1]?.data;

  return (
    <div className="viz col-span">
      <h3>Receitas recebidas {semanal ? "(por semana)" : "(por dia)"}</h3>
      <p className="v-sub">{fmt.format(total)} no período · pico de {max}</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Receitas recebidas ao longo do tempo, total ${total}, pico ${max}`}>
        {ticks}
        <path d={area} fill="var(--series-soft)" opacity="0.55" />
        <path d={line} fill="none" stroke="var(--series)" strokeWidth="2" strokeLinejoin="round" />
        {dN && <circle cx={X(buckets.length - 1)} cy={Y(buckets[buckets.length - 1]!.v)} r="3.5" fill="var(--series)" />}
        {d0 && <text className="axis-txt" x={pl} y={H - 6}>{d0.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</text>}
        {dN && <text className="axis-txt" textAnchor="end" x={W - pr} y={H - 6}>{dN.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</text>}
      </svg>
    </div>
  );
}

// ---------- ranking de barras ----------
export function RankBars({
  titulo,
  sub,
  dados,
  limite,
}: {
  titulo: string;
  sub?: string;
  dados: Contagem[];
  limite: number;
}) {
  const truncar = (s: string, n = 28) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
  let rows = dados.slice(0, limite);
  const outros = dados.slice(limite).reduce((a, x) => a + x.v, 0);
  if (outros > 0) rows = [...rows, { k: "Outros", v: outros }];
  const max = Math.max(1, ...rows.map((r) => r.v));
  const W = 320;
  const rowH = 34;
  const barX = 8;
  const barMaxW = W - 42;
  const H = rows.length * rowH + 6;

  return (
    <div className="viz">
      <h3>{titulo}</h3>
      {sub ? <p className="v-sub">{sub}</p> : <div style={{ height: ".35rem" }} />}
      {rows.length === 0 ? (
        <p className="empty">Sem dados no filtro atual</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${titulo}: ${rows.map((r) => `${r.k} ${r.v}`).join(", ")}`}>
          {rows.map((r, i) => {
            const y = i * rowH + 4;
            const w = Math.max(3, (r.v / max) * barMaxW);
            return (
              <g key={r.k}>
                <text className="bar-lbl" x={barX} y={y + 11}>
                  {truncar(r.k)}
                  <title>{r.k}</title>
                </text>
                <rect x={barX} y={y + 16} width={w} height="9" rx="4" fill="var(--series)" />
                <text className="bar-val" x={barX + w + 5} y={y + 24}>{r.v}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ---------- proporção (retenção) ----------
export function Proportion({ com, total }: { com: number; total: number }) {
  const pct = total ? Math.round((com / total) * 100) : 0;
  return (
    <div className="viz">
      <h3>Receitas com retenção obrigatória</h3>
      <p className="v-sub">
        Controlados (Portaria 344/98) · {fmt.format(com)} de {fmt.format(total)}
      </p>
      <div className="prop" role="img" aria-label={`${pct}% das receitas com retenção obrigatória`}>
        <div className="p-a" style={{ width: `${Math.max(pct, 14)}%` }}>⚠ {pct}%</div>
        <div className="p-b" />
      </div>
      <div className="prop-legend">
        <span><i style={{ background: "var(--crit)" }} />Com retenção</span>
        <span><i style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }} />Demais</span>
      </div>
    </div>
  );
}
