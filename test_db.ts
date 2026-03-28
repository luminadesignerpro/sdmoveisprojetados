import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);

async function checkSchema() {
  const { data, error } = await supabase.from('employees').select('*').limit(1);
  if (error) {
    console.error('Error fetching employees:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in employees:', Object.keys(data[0]));
  } else {
    // If no data, try to get column names from a query that might fail if col doesn't exist
    console.log('No data in employees. Testing specific columns...');
    const cols = ['email', 'password'];
    for (const col of cols) {
      const { error: colErr } = await supabase.from('employees').select(col).limit(1);
      if (colErr) {
        console.log(`Column ${col} DOES NOT exist.`);
      } else {
        console.log(`Column ${col} EXISTS.`);
      }
    }
  }
}

checkSchema();
