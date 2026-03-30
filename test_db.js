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

async function checkData() {
  console.log("Checking 'employees' table...");
  const { data: employees, error: empError } = await supabase.from('employees').select('*').limit(5);
  if (empError) console.error("Error fetching employees:", empError.message);
  else console.log("Employees found:", employees?.length || 0, employees);

  console.log("\nChecking 'app_users' table...");
  const { data: users, error: userError } = await supabase.from('app_users').select('*').limit(5);
  if (userError) console.error("Error fetching app_users:", userError.message);
  else console.log("App Users found:", users?.length || 0, users);
}

checkData();
