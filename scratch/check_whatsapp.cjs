
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Using publishable as I don't have service role here easily (but I can try)
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConvs() {
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Last 5 conversations:');
  data.forEach(c => {
    console.log(`- ID: ${c.id}, Phone: ${c.phone_number}, Name: ${c.contact_name}, Last: ${c.last_message_at}`);
  });
}

checkConvs();
