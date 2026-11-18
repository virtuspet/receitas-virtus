import ExcelJS from "exceljs";
import type { Receita } from "../../shared/types.js";

function fmtData(v: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("pt-BR");
}

export async function gerarExportXlsx(receitas: Receita[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Receitas Virtus Pet";
  wb.created = new Date();

  // ---------- aba: Receitas (uma linha por receita) ----------
  const shR = wb.addWorksheet("Receitas");
  shR.columns = [
    { header: "Data recebimento", key: "data_recebimento", width: 16 },
    { header: "Data prescrição", key: "data_prescricao", width: 16 },
    { header: "Clínica", key: "clinica", width: 26 },
    { header: "Veterinário", key: "vet_nome", width: 24 },
    { header: "CRMV", key: "vet_crmv", width: 16 },
    { header: "Animal", key: "animal_nome", width: 16 },
    { header: "Espécie", key: "animal_especie", width: 12 },
    { header: "Raça", key: "animal_raca", width: 18 },
    { header: "Sexo", key: "animal_sexo", width: 10 },
    { header: "Peso (kg)", key: "animal_peso_kg", width: 10 },
    { header: "Tutor", key: "tutor_nome", width: 20 },
    { header: "Nº de itens", key: "n_itens", width: 10 },
    { header: "Conferida", key: "conferido", width: 10 },
    { header: "Origem", key: "origem", width: 10 },
  ];
  shR.getRow(1).font = { bold: true };
  for (const r of receitas) {
    shR.addRow({
      data_recebimento: fmtData(r.data_recebimento),
      data_prescricao: fmtData(r.data_prescricao),
      clinica: r.clinica ?? "",
      vet_nome: r.vet_nome ?? "",
      vet_crmv: r.vet_crmv ?? "",
      animal_nome: r.animal_nome ?? "",
      animal_especie: r.animal_especie ?? "",
      animal_raca: r.animal_raca ?? "",
      animal_sexo: r.animal_sexo ?? "",
      animal_peso_kg: r.animal_peso_kg ?? "",
      tutor_nome: r.tutor_nome ?? "",
      n_itens: r.itens.length,
      conferido: r.conferido ? "Sim" : "Não",
      origem: r.origem,
    });
  }

  // ---------- aba: Itens (uma linha por item — melhor pra tabela dinâmica) ----------
  const shI = wb.addWorksheet("Itens");
  shI.columns = [
    { header: "Data recebimento", key: "data_recebimento", width: 16 },
    { header: "Clínica", key: "clinica", width: 26 },
    { header: "Veterinário", key: "vet_nome", width: 24 },
    { header: "Animal", key: "animal_nome", width: 16 },
    { header: "Espécie", key: "animal_especie", width: 12 },
    { header: "Princípio ativo", key: "principio_ativo", width: 26 },
    { header: "Nome comercial", key: "nome_comercial", width: 22 },
    { header: "Fornecedor", key: "fornecedor", width: 20 },
    { header: "Categoria", key: "categoria", width: 20 },
    { header: "Concentração", key: "concentracao", width: 16 },
    { header: "Forma", key: "forma", width: 16 },
    { header: "Via", key: "via", width: 14 },
    { header: "Frequência", key: "frequencia", width: 14 },
    { header: "Duração (dias)", key: "duracao_dias", width: 12 },
    { header: "Quantidade", key: "quantidade", width: 14 },
    { header: "Retenção", key: "retencao", width: 10 },
  ];
  shI.getRow(1).font = { bold: true };
  for (const r of receitas) {
    for (const it of r.itens) {
      shI.addRow({
        data_recebimento: fmtData(r.data_recebimento),
        clinica: r.clinica ?? "",
        vet_nome: r.vet_nome ?? "",
        animal_nome: r.animal_nome ?? "",
        animal_especie: r.animal_especie ?? "",
        principio_ativo: it.principio_ativo ?? "",
        nome_comercial: it.nome_comercial ?? "",
        fornecedor: it.fornecedor ?? "Não identificado",
        categoria: it.categoria ?? "Não identificado",
        concentracao: it.concentracao ?? "",
        forma: it.forma ?? "",
        via: it.via ?? "",
        frequencia: it.frequencia ?? "",
        duracao_dias: it.duracao_dias ?? "",
        quantidade: it.quantidade ?? "",
        retencao: it.retencao ? "Sim" : "Não",
      });
    }
  }

  const arrBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrBuf);
}
