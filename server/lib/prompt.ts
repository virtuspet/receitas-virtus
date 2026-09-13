export const EXTRACT_PROMPT = `Você recebe a imagem OU o PDF de uma receita veterinária brasileira. Transcreva os dados EXATAMENTE como aparecem no documento — não invente, não complete, não "corrija". Use null quando o dado não estiver presente.

Responda APENAS com um objeto JSON (nada antes ou depois) neste formato:
{
  "veterinario": { "nome": string|null, "crmv": string|null },
  "clinica": string|null,
  "dataPrescricao": "DD/MM/AAAA"|null,
  "animal": {
    "nome": string|null,
    "especie": "Canino"|"Felino"|"Ave"|"Roedor"|"Equino"|"Outro"|null,
    "raca": string|null,
    "sexo": string|null,
    "pesoKg": string|null,
    "idade": string|null
  },
  "tutor": string|null,
  "itens": [
    {
      "principioAtivo": string|null,
      "nomeComercial": string|null,
      "concentracao": string|null,
      "forma": string|null,
      "via": string|null,
      "frequencia": string|null,
      "duracaoDias": number|null,
      "quantidade": string|null,
      "retencao": boolean
    }
  ],
  "camposIncertos": [string]
}

Regras:
- especie: "Canina"/"Cão" => "Canino"; "Felina"/"Gato" => "Felino". Se não houver, null.
- crmv: inclua a UF e o número quando existir (ex.: "CRMV-RJ 14983").
- dataPrescricao: use a data de emissão/assinatura da receita. NÃO use a data de impressão ("Impresso em:").
- Uma receita costuma ter VÁRIOS medicamentos — devolva um item por medicamento (produto/princípio ativo) DIFERENTE, na ordem em que aparecem. NUNCA duplique o mesmo medicamento em vários itens: se ele aparece mais de uma vez no texto (ex.: dose de manhã e à noite, ou repetido em seções diferentes), ou se vem como "3 comprimidos", "30 unidades" etc., isso é UM item só — a quantidade total vai no campo "quantidade", não em itens repetidos.
- principioAtivo: o nome do fármaco (ex.: "Ceftriaxona", "Cloridrato de tramadol", "Meloxicam").
- concentracao: a dose/força indicada (ex.: "30mg/kg", "0,1mg/kg", "250 mg", "500mg/mL").
- via: "Oral", "Subcutânea", "Intramuscular", "Tópica" etc., conforme o texto ("Uso Injetável", "via subcutânea"...).
- frequencia: normalize para "12/12h", "24/24h", "8/8h" a partir de textos como "uma dose a cada 12 horas".
- duracaoDias: só o número de dias ("durante 10 dias seguidos" => 10).
- quantidade: a quantidade dispensada, se houver ("1 frasco", "30 comprimidos"). Senão null.
- retencao: true se o medicamento é de controle especial (tramadol e outros opioides, fenobarbital e barbitúricos, benzodiazepínicos, gabapentina, pregabalina, cetamina, metilfenidato, alguns antidepressivos). false caso contrário.
- camposIncertos: liste os caminhos dos campos que você NÃO conseguiu ler com confiança. Ex.: "veterinario.crmv", "animal.pesoKg", "itens.0.concentracao", "itens.2.frequencia".`;
