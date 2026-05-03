const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

async function getCols() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contracts?select=*&limit=1`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
    });
    const data = await res.json();
    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
        console.log('Sample Data:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No data found in contracts table.');
    }
}
getCols();
