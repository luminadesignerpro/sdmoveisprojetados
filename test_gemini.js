// TEST GEMINI API KEY
const GEMINI_API_KEY = 'YOUR_GEMINI_KEY_HERE';

async function testGemini() {
  console.log('Testing Gemini API Key...');
  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];
  const versions = ['v1', 'v1beta'];

  for (const v of versions) {
    for (const m of models) {
      console.log(`Trying ${v} with ${m}...`);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hi' }] }],
            }),
          }
        );

        const data = await res.json();
        if (res.ok) {
            console.log(`✅ SUCCESS with ${v}/${m}!`);
            console.log('Response:', data.candidates?.[0]?.content?.parts?.[0]?.text);
            return;
        } else {
            console.log(`❌ FAILED for ${v}/${m}: ${data.error?.message || res.statusText}`);
        }
      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
      }
    }
  }
}

testGemini();
