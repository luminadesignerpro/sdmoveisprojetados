const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function checkConfig() {
    const { data, error } = await supabase
        .from('atendimento_config')
        .select('*')
        .eq('chave', 'menu_principal')
        .maybeSingle();
    
    if (error) {
        console.error('Error fetching atendimento_config:', error.message);
    } else {
        console.log('Config found:', data ? 'Yes' : 'No');
        if (data) console.log('Content:', JSON.stringify(data.conteudo, null, 2));
    }
}

checkConfig();
