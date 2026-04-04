import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nglwscakhhdhelhbqkyb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbHdzY2FiaGhkaGVsaGJxa3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NDYzNjgsImV4cCI6MjA4NzEyMjM2OH0.MidIwMPLT17szfNnG9VRTnisoPzDAFnEw7IVLpqJj6A";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testPersistence() {
  console.log('Testing OS and Sales persistence...');

  // Test Service Order
  const { data: os, error: osErr } = await supabase.from('service_orders').insert({
    description: 'Test OS Persistence',
    status: 'aberta'
  }).select().single();

  if (osErr) console.error('OS Insert Error:', osErr);
  else {
    console.log('OS Insert Success:', os.id);
    await supabase.from('service_orders').delete().eq('id', os.id);
  }

  // Test Client Project (Sale)
  const { data: proj, error: projErr } = await supabase.from('client_projects').insert({
    name: 'Test Project Persistence',
    status: 'em_negociacao',
    value: 1000
  }).select().single();

  if (projErr) console.error('Project Insert Error:', projErr);
  else {
    console.log('Project Insert Success:', proj.id);
    await supabase.from('client_projects').delete().eq('id', proj.id);
  }
}

testPersistence();
