import { useState } from "react";
import type { ReceitaExtraida, ItemExtraido, NovaReceita } from "../../shared/types.js";
import { ESPECIES, isControlado } from "../../shared/domain.js";
import { api, ApiError } from "../lib/api.js";

interface Props {
  dados: ReceitaExtraida;
  bruto: unknown;
  previewUrl: string | null;
  arquivo: { base64: string; mimeType: string } | null;
  origem: "foto" | "arquivo";
  nota: string | null;
  onTentarIA?: () => void;
  onCancelar: () => void;
  onSalvo: () => void;
  onToast: (msg: string) => void;
}

type ItemForm = ItemExtraido;

function vazio(): ItemForm {
  return {
    principioAtivo: "",
    nomeComercial: "",
    concentracao: "",
    forma: "",
    via: "",
    frequencia: "",
    duracaoDias: null,
    quantidade: "",
    retencao: false,
  };
}

export function ExtractForm({
  dados,
  bruto,
  previewUrl,
  arquivo,
  origem,
  nota,
  onTentarIA,
  onCancelar,
  onSalvo,
  onToast,
}: Props) {
  const [vet, setVet] = useState(dados.veterinario.nome ?? "");
  const [crmv, setCrmv] = useState(dados.veterinario.crmv ?? "");
  const [clinica, setClinica] = useState(dados.clinica ?? "");
  const [dataPresc, setDataPresc] = useState(dados.dataPrescricao ?? "");
  const [especie, setEspecie] = useState(dados.animal.especie ?? "Canino");
  const [raca, setRaca] = useState(dados.animal.raca ?? "");
  const [animal, setAnimal] = useState(dados.animal.nome ?? "");
  const [peso, setPeso] = useState(dados.animal.pesoKg ?? "");
  const [tutor, setTutor] = useState(dados.tutor ?? "");
  const [sexo, setSexo] = useState(dados.animal.sexo ?? "");
  const [itens, setItens] = useState<ItemForm[]>(dados.itens.length ? dados.itens : [vazio()]);
  const [salvando, setSalvando] = useState(false);

  const inc = new Set(dados.camposIncertos.map((c) => c.toLowerCase()));
  const low = (k: string) => inc.has(k.toLowerCase());

  function setItem(i: number, patch: Partial<ItemForm>) {
    setItens((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function salvar() {
    const itensLimpos = itens
      .map((it) => ({
        principio_ativo: it.principioAtivo?.trim() || null,
        nome_comercial: it.nomeComercial?.trim() || null,
        concentracao: it.concentracao?.trim() || null,
        forma: it.forma?.trim() || null,
        via: it.via?.trim() || null,
        frequencia: it.frequencia?.trim() || null,
        duracao_dias:
          it.duracaoDias == null || Number.isNaN(it.duracaoDias) ? null : Number(it.duracaoDias),
        quantidade: it.quantidade?.trim() || null,
        retencao:
          it.retencao || isControlado(it.principioAtivo, it.nomeComercial),
      }))
      .filter((it) => it.principio_ativo || it.nome_comercial || it.concentracao);

    if (itensLimpos.length === 0 && !vet.trim()) {
      onToast("Preencha ao menos o princípio ativo");
      return;
    }

    const payload: NovaReceita = {
      data_prescricao: dataPresc.trim() || null,
      clinica: clinica.trim() || null,
      vet_nome: vet.trim() || null,
      vet_crmv: crmv.trim() || null,
      animal_nome: animal.trim() || null,
      animal_especie: especie || null,
      animal_raca: raca.trim() || null,
      animal_sexo: sexo.trim() || null,
      animal_peso_kg: peso.trim() || null,
      tutor_nome: tutor.trim() || null,
      origem,
      itens: itensLimpos,
      arquivo,
      bruto,
    };

    setSalvando(true);
    try {
      await api.criarReceita(payload);
      onToast("Receita salva · painel atualizado");
      onSalvo();
    } catch (e) {
      onToast(e instanceof ApiError ? e.message : "Falha ao salvar");
      setSalvando(false);
    }
  }

  return (
    <div className="extracted">
      <div className="x-head">
        <b>{nota ? "Confira os dados" : "Receita lida"}</b>
        <span className={`tag${nota ? " revisar" : ""}`}>{nota ? "REVISAR" : "EXTRAÍDO"}</span>
      </div>
      {nota && (
        <p className="x-note">
          {nota}
          {onTentarIA && (
            <>
              {" "}
              <button className="btn-ghost" style={{ padding: ".2rem .5rem", borderRadius: 4, marginLeft: 4 }} onClick={onTentarIA}>
                Tentar leitura automática
              </button>
            </>
          )}
        </p>
      )}

      <div className="x-body">
        <div className="x-row">
          <Field label="Veterinário" value={vet} onChange={setVet} low={low("veterinario.nome")} />
          <Field label="CRMV" value={crmv} onChange={setCrmv} low={low("veterinario.crmv") || low("crmv")} />
        </div>
        <div className="x-row">
          <Field label="Clínica" value={clinica} onChange={setClinica} />
          <Field label="Data da prescrição" value={dataPresc} onChange={setDataPresc} placeholder="DD/MM/AAAA" low={low("dataprescricao")} />
        </div>
        <div className="x-row">
          <div className="fld">
            <label>Espécie</label>
            <select value={especie} onChange={(e) => setEspecie(e.target.value as typeof especie)}>
              {ESPECIES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <Field label="Raça" value={raca} onChange={setRaca} />
        </div>
        <div className="x-row">
          <Field label="Animal" value={animal} onChange={setAnimal} />
          <Field label="Peso (kg)" value={peso} onChange={setPeso} low={low("animal.pesokg") || low("pesokg")} />
        </div>
        <div className="x-row">
          <Field label="Tutor" value={tutor} onChange={setTutor} />
          <Field label="Sexo" value={sexo} onChange={setSexo} />
        </div>

        <div className="x-items">
          {itens.map((it, i) => (
            <div key={i}>
              <div className="x-item-title">
                <span>MEDICAMENTO {i + 1}</span>
                {itens.length > 1 && (
                  <button onClick={() => setItens((p) => p.filter((_, idx) => idx !== i))}>remover</button>
                )}
              </div>
              <div className="x-row">
                <Field label="Princípio ativo" value={it.principioAtivo ?? ""} onChange={(v) => setItem(i, { principioAtivo: v })} low={low(`itens.${i}.principioativo`)} />
                <Field label="Nome comercial" value={it.nomeComercial ?? ""} onChange={(v) => setItem(i, { nomeComercial: v })} />
              </div>
              <div className="x-row">
                <Field label="Concentração / dose" value={it.concentracao ?? ""} onChange={(v) => setItem(i, { concentracao: v })} low={low(`itens.${i}.concentracao`)} />
                <Field label="Forma" value={it.forma ?? ""} onChange={(v) => setItem(i, { forma: v })} />
              </div>
              <div className="x-row">
                <Field label="Frequência" value={it.frequencia ?? ""} onChange={(v) => setItem(i, { frequencia: v })} />
                <Field
                  label="Duração (dias)"
                  value={it.duracaoDias == null ? "" : String(it.duracaoDias)}
                  onChange={(v) => setItem(i, { duracaoDias: v.trim() ? parseInt(v, 10) : null })}
                />
              </div>
              <div className="x-row">
                <Field label="Quantidade" value={it.quantidade ?? ""} onChange={(v) => setItem(i, { quantidade: v })} />
                <div className="fld">
                  <label>Retenção obrigatória</label>
                  <select value={it.retencao ? "Sim" : "Não"} onChange={(e) => setItem(i, { retencao: e.target.value === "Sim" })}>
                    <option>Não</option>
                    <option>Sim</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          <button className="x-add" onClick={() => setItens((p) => [...p, vazio()])}>
            + medicamento
          </button>
        </div>
      </div>

      <div className="x-actions">
        <button className="btn-ghost" onClick={onCancelar} disabled={salvando}>
          Descartar
        </button>
        <button className="btn-primary" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar no painel"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  low,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  low?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={`fld${low ? " low" : ""}`}>
      <label>{label}</label>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
