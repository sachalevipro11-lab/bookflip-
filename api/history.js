export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    const allVars = Object.keys(process.env).filter(k => k.includes('KV') || k.includes('REDIS') || k.includes('UPSTASH')).join(', ');
    return res.status(500).json({ error: `Variables dispo: ${allVars || 'aucune'}` });
  }

  async function redis(command) {
    const resp = await fetch(redisUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command)
    });
    const data = await resp.json();
    return data.result;
  }

  if (req.method === 'GET') {
    try {
      const ids = await redis(['LRANGE', 'books', '0', '99']);
      if (!ids || ids.length === 0) return res.status(200).json([]);
      const books = await Promise.all(ids.map(id => redis(['GET', `book:${id}`]).then(r => r ? JSON.parse(r) : null)));
      return res.status(200).json(books.filter(Boolean));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const book = req.body;
      const id = Date.now().toString();
      book.id = id;
      book.saved_at = new Date().toISOString();
      await redis(['SET', `book:${id}`, JSON.stringify(book)]);
      await redis(['LPUSH', 'books', id]);
      await redis(['LTRIM', 'books', '0', '199']);
      return res.status(200).json({ success: true, id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await redis(['DEL', `book:${id}`]);
      await redis(['LREM', 'books', '0', id]);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
