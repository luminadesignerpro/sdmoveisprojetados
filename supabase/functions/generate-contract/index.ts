import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONTRATO_TEMPLATE = `CONTRATADO: SD MOVEIS
RESP: SAMUEL DAVID CARVALHO DOS SANTOS
CPF: 044.595.413-27
ENDEREÇO: RUA JORGE FIGUEREDO N° 720

1. OBJETO DO CONTRATO
O PRESENTE CONTRATO TEM POR OBJETO A FABRICAÇÃO E MONTAGEM DOS MÓVEIS, E ESPELHOS, DOS AMBIENTES QUE ESTIVEREM DISCRIMINADOS NA ORDEM DE SERVIÇO.
OBS: CONFORME O DETALHAMENTO DO PROJETO.
OS MÓVEIS E ESPELHOS SERÃO INSTALADOS NA {endereco_cliente}, {cidade_cliente}-CE, DE ACORDO COM A DISCRIMINAÇÃO DA ORDEM DE SERVIÇO.

2. PRAZO DE ENTREGA
OS SERVIÇOS SERÃO EXECUTADOS NOS SEGUINTES AMBIENTES:
{ambientes}
OBS: {obs_prazo}

3. VALORES E FORMA DE PAGAMENTO
O CONTRATANTE PAGARÁ AO CONTRATADO UM VALOR DE {valor_total} ({valor_extenso}). À SER PAGO DA SEGUINTE FORMA:
{forma_pagamento}

DADOS BANCÁRIOS: CHAVES PIX PARA PAGAMENTO
INFINITYPAY (CNPJ): 49.228.811/0001-33
EMAIL: SDMOVEIS48@GMAIL.COM
CELULAR (ITAÚ): 85 99760-2237
TITULAR: SAMUEL DAVID CARVALHO DOS SANTOS

4. DESISTÊNCIA DO CONTRATO
CASO O CONTRATANTE DESISTA DO PRESENTE CONTRATO, PERDERÁ EM FAVOR DO CONTRATADO O VALOR DE ENTRADA JÁ PAGO. CASO O CONTRATADO DESISTA DO PRESENTE CONTRATO, DEVOLVERÁ EM DOBRO O VALOR RECEBIDO COMO ENTRADA.

5. DESCUMPRIMENTO DO PRAZO
A) APÓS 30 DIAS DO PRAZO ESTABELECIDO NA CLÁUSULA 2, EXCETO POR QUESTÕES JUDICIAL OU EXTRAJUDICIAL, O CONTRATANTE PODERÁ EXIGIR O PAGAMENTO DE 10% DO VALOR DO SERVIÇO.
B) APÓS 10 DIAS DO PRAZO ESTABELECIDO NA CLÁUSULA 3, EXCETO POR QUESTÕES JUDICIAL OU EXTRAJUDICIAL, O CONTRATADO PODERÁ EXIGIR O PAGAMENTO DE 10% DO VALOR DO SERVIÇO.

6. MATERIAL
TODOS OS MATERIAIS QUE SERÃO UTILIZADOS SERÃO COMPRADOS PELO CONTRATADO.

{cidade_cliente}, CE {data_contrato}

CONTRATANTE: {nome_cliente}
CONTRATADO: SD MÓVEIS`;

const ORDEM_TEMPLATE = `SD MÓVEIS - (85)98574-9686
RUA JORGE FIGUEREDO 740 - BARROCÃO - ITAITINGA-CE - 61887-449
(85)99760-2237 | SDMOVEIS48@GMAIL.COM | CNPJ: 49.228.811/0001-33

ORDEM DE SERVIÇO {numero_os}

Data: {data_os}
Hora: {hora_os}

Cliente: {nome_cliente} - {telefone_cliente}
Endereço: {endereco_cliente}
Bairro: {bairro_cliente}
Cidade: {cidade_cliente}  UF: CE  CEP: {cep_cliente}
CPF/CNPJ: {cpf_cliente}

Observações Gerais:
{observacoes}

FORMAS DE PAGAMENTO
- 50% NA ENTRADA E 50% NO FINAL DO SERVIÇO (VALOR TOTAL)
- 10X S/JUROS NO CARTÃO (VALOR TOTAL)
- À VISTA 10% DESCONTO

Responsável: SAMUEL DAVID

VALOR MATERIAL: R$ {valor_material}
VALOR SERVIÇO: R$ {valor_servico}
FRETE: R$ {valor_frete}
DESCONTO: R$ {valor_desconto}
VALOR TOTAL: R$ {valor_total}

Situação Atual: {situacao}
Data Aprovação: {data_aprovacao}
Data Entrega: {data_entrega}
Condições de Pagamento: {condicoes_pagamento}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { templateType, clientData, projectData, customInstructions } = await req.json();

    const template = templateType === "ordem_servico" ? ORDEM_TEMPLATE : CONTRATO_TEMPLATE;

    const systemPrompt = `Você é um assistente especializado em gerar contratos e ordens de serviço para a SD Móveis, uma empresa de MÓVEIS PROJETADOS (nunca use 'planejados') em Fortaleza-CE.

REGRAS CRÍTICAS DE PORTUGUÊS:
- NUNCA use a palavra "entregueu", use sempre "ENTREGUE".
- NUNCA use a palavra "Assassinado", use sempre "ASSINADO".
- Use terminologia de MÓVEIS PROJETADOS.

REGRAS DE FORMATAÇÃO:
- Preencha o template com os dados do cliente fornecidos.
- Mantenha o formato e estrutura do template original.
- Se algum dado não foi fornecido, use "_______________" como placeholder.
- Valores devem estar formatados em R$ com separador de milhar (ponto) e decimal (vírgula).
- Escreva o valor por extenso quando necessário.
- Datas no formato DD/MM/YYYY.
- Se houver instruções customizadas, aplique-as ao contrato.
- NUNCA invente dados que não foram fornecidos.
- Mantenha todo o texto em MAIÚSCULAS como no template original.
- Retorne APENAS o texto do contrato preenchido, sem explicações adicionais.`;

    const userPrompt = `Preencha o seguinte template de ${templateType === "ordem_servico" ? "Ordem de Serviço" : "Contrato de Serviço"} com os dados abaixo:

TEMPLATE:
${template}

DADOS DO CLIENTE:
${JSON.stringify(clientData, null, 2)}

DADOS DO PROJETO:
${JSON.stringify(projectData, null, 2)}

${customInstructions ? `INSTRUÇÕES ADICIONAIS:\n${customInstructions}` : ""}

Preencha o template e retorne o contrato completo.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-contract error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
