const SU_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SU_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbHdzY2FiaGhkaGVsaGJxa3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NDYzNjgsImV4cCI6MjA4NzEyMjM2OH0.MidIwMPLT17szfNnG9VRTnisoPzDAFnEw7IVLpqJj6A';

async function testEdge() {
  try {
    const res = await fetch(`${SU_URL}/functions/v1/whatsapp-connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SU_KEY}`
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
