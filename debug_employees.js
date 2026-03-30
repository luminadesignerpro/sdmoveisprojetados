import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployees() {
  console.log("Fetching employees with .eq('active', true)...");
  const { data, error } = await supabase.from('employees').select('*').eq('active', true);
  
  if (error) {
    console.error("❌ ERROR:", error.message, error.details, error.hint);
  } else {
    console.log("✅ Success! Found", data.length, "employees.");
    if (data.length > 0) {
      console.log("First employee:", data[0].name, "Active:", data[0].active);
    } else {
      console.log("Table is empty (or everyone is inactive).");
      const { data: allData } = await supabase.from('employees').select('*');
      console.log("Total rows in table (without filter):", allData?.length || 0);
    }
  }
}

checkEmployees();
