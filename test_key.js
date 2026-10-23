import { createClient } from '@supabase/supabase-js';

const URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbHdzY2FiaGhkaGVsaGJxa3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NDYzNjgsImV4cCI6MjA4NzEyMjM2OH0.MidIwMPLT17szfNnG9VRTnisoPzDAFnEw7IVLpqJj6A';

const supabase = createClient(URL, KEY);

async function test() {
  console.log("Testing connection...");
  const { data, error } = await supabase.from('employees').select('id').limit(1);
  if (error) {
    console.log("❌ ERROR:", error.message);
    console.log("Full error:", JSON.stringify(error, null, 2));
  } else {
    console.log("✅ SUCCESS! Connection is WORKING.");
  }
}

test();
