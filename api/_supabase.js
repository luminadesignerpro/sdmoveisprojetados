const { createClient } = require('@supabase/supabase-js');

function getClient() {
  let url = process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase não configurado no Vercel (SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes).');
  }
  url = String(url).trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  key = String(key).trim();
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (...args) => fetch(...args)
    }
  });
}

module.exports = { getClient };
