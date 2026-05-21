import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - retrieve history
  if (req.method === 'GET') {
    try {
      const ids = await kv.lrange('books', 0, 99);
      if (!ids || ids.length === 0) return res.status(200).json([]);
      const books = await Promise.all(ids.map(id => kv.get(`book:${id}`)));
      return res.status(200).json(books.filter(Boolean));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST - save a book
  if (req.method === 'POST') {
    try {
      const book = req.body;
      const id = Date.now().toString();
      book.id = id;
      book.saved_at = new Date().toISOString();
      await kv.set(`book:${id}`, book);
      await kv.lpush('books', id);
      await kv.ltrim('books', 0, 199); // keep last 200
      return res.status(200).json({ success: true, id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE - remove a book
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await kv.del(`book:${id}`);
      await kv.lrem('books', 0, id);
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
