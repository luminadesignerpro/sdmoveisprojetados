import fetch from 'node-fetch'; // or just use global fetch in newer Node

const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

async function listTables() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`);
    const data = await res.json();
    console.log(data);
}
listTables().catch(console.error);
