const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

const newConfig = {
  "greeting": "Olá! 👋 Bem-vindo à *SD Móveis*!\nSomos especialistas em móveis projetados.\n\nComo posso te ajudar hoje?\n\n1️⃣ Orçamento de móveis projetados\n2️⃣ Acompanhar meu projeto\n3️⃣ Pós-venda / Garantia\n4️⃣ Falar com um atendente\n5️⃣ Horário de funcionamento",
  "responses": {
    "1": "Ótima escolha! 🎉\n\nPara preparar seu orçamento, preciso de algumas informações:\n\n📐 *Qual ambiente?* (cozinha, quarto, sala, banheiro, etc.)\n📏 *Medidas aproximadas?*\n🎨 *Tem preferência de cor ou material?*\n📸 *Se possível, envie fotos do ambiente*",
    "2": "Perfeito! 📋 Por favor, me informe seu *nome completo* ou o *número do contrato* para eu localizar seu projeto.",
    "3": "Estamos aqui para te ajudar no pós-venda! 🛡️ Por favor, descreva sua solicitação ou acionamento de garantia.",
    "4": "Vou te conectar com um atendente! 👤 Um momento, por favor...",
    "5": "🕐 *Horário de Funcionamento:*\n\n📅 Segunda a Sexta: *8h às 18h*\n📅 Sábado: *8h às 12h*\n📅 Domingo: *Fechado*"
  }
};

async function fix() {
    console.log('Forçando atualização limpa da configuração...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/atendimento_config?chave=eq.menu_principal`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ conteudo: newConfig }),
    });

    if (res.ok) {
        console.log('✅ Configuração resetada e corrigida com sucesso!');
    } else {
        console.error('❌ Erro ao atualizar:', await res.text());
    }
}
fix();
