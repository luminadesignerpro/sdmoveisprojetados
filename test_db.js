const SU_URL = "https://nglwscakhhdhelhbqkyb.supabase.co";
const BAD_KEY = "sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2";

async function testQuery() {
  try {
    const res = await fetch(`${SU_URL}/rest/v1/conversations?select=*`, {
      method: 'GET',
      headers: {
        'apikey': BAD_KEY,
        'Authorization': `Bearer ${BAD_KEY}`
      }
    });
    console.log('STATUS:', res.status);
    const text = await res.text();
    console.log('RESPONSE:', text);
  } catch(e) {
    console.error(e);
  }
}
testQuery();
