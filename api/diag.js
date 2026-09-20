const { getClient } = require('./_supabase');

module.exports = async (req, res) => {
  try {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const maskedUrl = url ? url.substring(0, 15) + '...' : 'ausente';
    const maskedKey = key ? key.substring(0, 10) + '...' : 'ausente';

    let errObj = null;
    let client = null;
    try {
      client = getClient();
      const { data, error } = await client.from('contratos').select('id').limit(1);
      if (error) errObj = { message: error.message, details: error.details, hint: error.hint, code: error.code };
      else return res.json({ ok: true, url: maskedUrl, count: data ? data.length : 0 });
    } catch (e) {
      errObj = { message: e.message, name: e.name, cause: e.cause ? String(e.cause) : null };
    }

    res.json({
      ok: false,
      url: maskedUrl,
      key_present: !!key,
      error: errObj
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
