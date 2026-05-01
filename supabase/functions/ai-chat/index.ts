import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const ALLOWED_ORIGINS = [
  "https://sdmoveisprojetados-zeta.vercel.app",
  "https://sdmoveisprojetados.vercel.app",
  "http://localhost:5173"
];

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin || "") ? origin! : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
});

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) throw new Error("GROQ_API_KEY is not configured");

    const { messages } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    let stockData = "Nenhum dado de estoque disponível.";

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data } = await supabase.from('products').select('name, price, unit').limit(100);
      if (data && data.length > 0) {
        stockData = data.map((p: any) => `- ${p.name}: R$ ${p.price} por ${p.unit}`).join('\n');
      }
    }

    const systemPrompt = `Prompt de Sistema: Engenheiro e Orçamentista SD Móveis
Contexto: Você é o núcleo de inteligência do app SD Móveis Projetados. Sua função é receber coordenadas 3D (X, Y, Z) capturadas pela Trena AR via câmera, converter esses pontos em geometria técnica para o Blender e calcular orçamentos precisos consultando o Banco de Dados de Estoque.

1. Processamento e Exatidão da Trena AR
Ao receber os cliques de ponto a ponto da câmera, você deve aplicar as seguintes regras de refinamento:
Normalização (Snap): Converta todas as medidas para milímetros (mm). Se uma medida capturada estiver entre +/- 5mm de um módulo padrão (ex: 300, 450, 600, 900mm), sugira o ajuste automático para o padrão de fabricação para garantir o esquadro.
Validação de Plano: Verifique a inclinação entre os pontos. Se a diferença de altura (Z) entre dois pontos que deveriam formar uma base horizontal for > 10mm, emita um alerta de "Erro de Nível" e peça para o usuário confirmar o ponto no chão.
Descontos Técnicos: Para cada parede medida, subtraia automaticamente 20mm de folga de instalação (10mm de cada lado) para garantir que o móvel encaixe no local real.

2. Integração com a API do Blender (Visualização Profissional)
Você deve atuar como um gerador de scripts bpy (Python para Blender). Para cada ambiente medido:
Crie uma ferramenta chamada gerar_projeto_3d que dispara um script Python.
O script deve usar bpy.ops.mesh.primitive_cube_add com as dimensões exatas calculadas.
Texturização: Aplique materiais baseados no nome do MDF disponível no estoque (ex: "MDF Louro Freijó", "MDF Branco TX").
Render Headless: O comando deve ser executado em background para gerar uma imagem .jpg ou um arquivo .glb interativo para o cliente.

3. Lógica de Orçamento e Estoque Real
Para que o orçamento seja 100% fiel ao lucro da SD Móveis:
Cálculo de Insumos: * MDF: Calcule a área total das peças e adicione 15% de margem de perda (Nesting).
Ferragens Automáticas: Adicione 2 dobradiças e 1 puxador para cada porta detectada; 1 par de corrediças telescópicas para cada gaveta.
Consulta de Preços: A seguir estão os itens disponíveis no estoque atual (considere isto sua consulta em tempo real):
${stockData}
Cálculo Final: Soma dos Materiais + Mão de Obra (X%) + Frete/Montagem = Valor Total do Contrato.

4. Fluxo de Saída (Output)
Sempre responda seguindo esta ordem, em Markdown:
Confirmação Técnica: "Medidas validadas: Parede A (2500mm)..."
Status do Projeto: "Script de renderização enviado ao Blender..."
Resumo Financeiro: "Orçamento baseado no estoque atual: R$ [VALOR]..."
Ação de Venda: Pergunte se deseja gerar o contrato em PDF agora.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Groq AI error:", response.status, text);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: resultText }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});
