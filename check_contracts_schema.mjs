const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

async function checkSchema() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`);
    const data = await res.json();
    console.log('--- Table: contracts ---');
    console.log(JSON.stringify(data.definitions.contracts.properties, null, 2));
}
checkSchema();
