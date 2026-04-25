// Fix Lu Lima's phone number in the database
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'; // Need service role key

// Since we can't use ESM imports easily on Windows, let's use fetch directly
const WRONG_NUMBER = '18367588012778';
const CORRECT_NUMBER = '5585988412334';

async function fixNumber() {
  const headers = {
    'apikey': process.env.SUPABASE_KEY || '',
    'Authorization': `Bearer ${process.env.SUPABASE_KEY || ''}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // 1. Find the conversation with wrong number
  console.log(`\n🔍 Buscando conversa com número errado: ${WRONG_NUMBER}...`);
  const findRes = await fetch(
    `${SUPABASE_URL}/rest/v1/whatsapp_conversations?phone_number=eq.${WRONG_NUMBER}&select=id,contact_name,phone_number`,
    { headers }
  );
  const found = await findRes.json();
  console.log('Encontrado:', JSON.stringify(found, null, 2));

  if (found.length === 0) {
    // Try partial match
    console.log('\\n🔍 Tentando busca parcial...');
    const findRes2 = await fetch(
      `${SUPABASE_URL}/rest/v1/whatsapp_conversations?contact_name=ilike.*lu*&select=id,contact_name,phone_number`,
      { headers }
    );
    const found2 = await findRes2.json();
    console.log('Encontrado por nome:', JSON.stringify(found2, null, 2));
  }

  // 2. Check if correct number already exists
  console.log(`\n🔍 Verificando se ${CORRECT_NUMBER} já existe...`);
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/whatsapp_conversations?phone_number=eq.${CORRECT_NUMBER}&select=id,contact_name,phone_number`,
    { headers }
  );
  const existing = await checkRes.json();
  console.log('Existente:', JSON.stringify(existing, null, 2));

  // 3. Update the wrong number
  if (found.length > 0) {
    console.log(`\n✏️ Atualizando ${WRONG_NUMBER} → ${CORRECT_NUMBER}...`);
    
    if (existing.length > 0) {
      console.log('⚠️ Número correto já existe! Precisa mesclar as conversas manualmente.');
      console.log('ID com número errado:', found[0].id);
      console.log('ID com número correto:', existing[0].id);
    } else {
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/whatsapp_conversations?phone_number=eq.${WRONG_NUMBER}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ phone_number: CORRECT_NUMBER })
        }
      );
      const updated = await updateRes.json();
      console.log('✅ Atualizado:', JSON.stringify(updated, null, 2));
    }
  }

  // 4. List all conversations for verification
  console.log('\n📋 Todas as conversas:');
  const allRes = await fetch(
    `${SUPABASE_URL}/rest/v1/whatsapp_conversations?select=id,contact_name,phone_number&order=last_message_at.desc&limit=15`,
    { headers }
  );
  const all = await allRes.json();
  all.forEach(c => console.log(`  ${c.contact_name || '(sem nome)'}: ${c.phone_number}`));
}

fixNumber().catch(console.error);
