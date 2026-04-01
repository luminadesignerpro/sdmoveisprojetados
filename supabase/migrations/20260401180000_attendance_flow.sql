
-- Tabela para guardar as configurações do fluxo de atendimento (Saudação, Opções, Horários)
CREATE TABLE IF NOT EXISTS public.atendimento_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave TEXT UNIQUE NOT NULL, -- ex: 'menu_principal', 'horario_funcionamento'
    conteudo JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.atendimento_config ENABLE ROW LEVEL SECURITY;

-- Política de acesso total (para este projeto simplificado)
CREATE POLICY "Acesso total atendimento_config" ON public.atendimento_config FOR ALL USING (true) WITH CHECK (true);

-- Inserir dados iniciais (baseado no seu print)
INSERT INTO public.atendimento_config (chave, conteudo) VALUES 
('menu_principal', '{
    "greeting": "Olá! 👋 Bem-vindo à *SD Móveis*!\nSomos especialistas em móveis projetados.\n\nComo posso te ajudar hoje?\n\n1️⃣ Orçamento de móveis projetados\n2️⃣ Acompanhar meu projeto\n3️⃣ Pós-venda / Garantia\n4️⃣ Falar com um atendente\n5️⃣ Horário de funcionamento",
    "responses": {
        "1": "Ótima escolha! 🎉\n\nPara preparar seu orçamento, preciso de algumas informações:\n\n📐 *Qual ambiente?* (cozinha, quarto, sala, banheiro, etc.)\n📏 *Medidas aproximadas?*\n🎨 *Tem preferência de cor ou material?*\n📸 *Se possível, envie fotos do ambiente*",
        "2": "Claro! 📋 Por favor, me informe seu *nome completo* ou o *número do contrato* para eu localizar seu projeto.",
        "3": "Estamos aqui para te ajudar no pós-venda! 🛡️ Por favor, descreva sua solicitação ou acionamento de garantia.",
        "4": "Vou te conectar com um humano! 👤 Um momento, por favor...",
        "5": "🕐 *Horário de Funcionamento:*\n\n📅 Segunda a Sexta: *8h às 18h*\n📅 Sábado: *8h às 12h*\n📅 Domingo: *Fechado*"
    }
}')
ON CONFLICT (chave) DO NOTHING;
