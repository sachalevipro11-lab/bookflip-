export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { image, mimeType, prixAchat, etat } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  const prompt = `Expert en revente de livres. Analyse cette image. Réponds UNIQUEMENT en JSON valide sans markdown.

Contexte: prix achat=${prixAchat||'?'}€, état=${etat||'non précisé'}

{"titre":"titre exact","auteur":"auteur","annee_estimee":"année","genre":"genre","edition":"édition si visible ou null","isbn":"ISBN si visible ou null","rarete":"commun|rare|très rare","prix_achat_estime":5,"prix_vente_optimal":18,"fourchette_min":12,"fourchette_max":25,"marge_estimee":65,"potentiel":"high","plateformes":[{"nom":"Vinted","score":85,"prix_moyen":15},{"nom":"eBay","score":70,"prix_moyen":20},{"nom":"Leboncoin","score":45,"prix_moyen":12},{"nom":"Momox","score":40,"prix_moyen":8}],"meilleure_plateforme":"Vinted","meilleure_periode":"Sep-Nov","saisonnalite":{"jan":40,"fev":45,"mar":55,"avr":60,"mai":70,"jun":65,"jul":50,"aou":45,"sep":80,"oct":85,"nov":90,"dec":75},"conseil_prix":"1 phrase max sur le prix","fiche_vinted":{"titre":"titre accrocheur max 60 car","description":"Description 80-120 mots: état, points forts, pour qui. Naturel.","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"],"prix_suggere":15,"categorie":"catégorie Vinted"},"fiche_ebay":{"titre":"titre eBay max 60 car","description":"Description 80-120 mots: détails, état, points forts.","prix_suggere":20,"type_vente":"Prix fixe","condition":"Used"},"fiche_leboncoin":{"titre":"titre court","description":"Description 60-80 mots directe.","prix_suggere":12}}

Potentiel: high>60% marge, medium 30-60%, low<30%. Adapte tout au livre identifié.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: image } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.content.map(b => b.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const book = JSON.parse(clean);
    return res.status(200).json(book);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
