const SU_URL = "https://nglwscakhhdhelhbqkyb.supabase.co";
const BAD_KEY = "sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2";

async function testEdge() {
  try {
    const res = await fetch(`${SU_URL}/functions/v1/whatsapp-connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BAD_KEY}`
      },
      body: JSON.stringify({ action: 'connect' })
    });
    console.log('STATUS:', res.status);
    const text = await res.text();
    console.log('RESPONSE:', text);
  } catch(e) {
    console.error(e);
  }
}
testEdge();
