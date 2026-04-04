
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testTrips() {
  console.log('Testing trips table...');
  const { data: employees, error: empErr } = await supabase.from('employees').select('id').limit(1);
  if (empErr) {
    console.error('Error fetching employees:', empErr.message);
    return;
  }
  if (!employees || employees.length === 0) {
    console.log('No employees found to test with.');
    return;
  }
  const empId = employees[0].id;

  console.log('Attempting to insert a test trip for employee:', empId);
  const { data, error } = await supabase.from('trips').insert({
    employee_id: empId,
    status: 'active',
    description: 'Test Trip'
  }).select();

  if (error) {
    console.error('Error inserting trip:', error.message, error.code);
  } else {
    console.log('Trip inserted successfully:', data[0]);
    // Clean up
    await supabase.from('trips').delete().eq('id', data[0].id);
    console.log('Test trip deleted.');
  }
}

testTrips();
