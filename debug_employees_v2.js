import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/['"]/g, '');
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.replace(/['"]/g, '');

console.log("URL:", supabaseUrl);
console.log("Key Prefix:", supabaseKey?.substring(0, 20), "...");

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployees() {
  const { data, error } = await supabase.from('employees').select('name').limit(1);
  if (error) {
    console.error("❌ ERROR:", error);
  } else {
    console.log("✅ Success! Data:", data);
  }
}

checkEmployees();
