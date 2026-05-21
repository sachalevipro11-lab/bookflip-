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

  const prompt = `Tu es un expert en revente de livres d'occasion, spécialisé dans les livres anciens et rares. Analyse cette image de livre.

Contexte fourni par le vendeur :
- Prix d'achat : ${prixAchat ? prixAchat + '€' : 'inconnu'}
- État du livre : ${etat || 'non précisé'}

Réponds UNIQUEMENT en JSON valide, sans markdown. Format exact :

{
  "titre": "Titre exact",
  "auteur": "Auteur complet",
  "annee_estimee": "Année ou décennie",
  "genre": "Genre/catégorie",
  "edition": "Type d'édition si visible",
  "isbn": "ISBN si visible sinon null",
  "identifie": true,
  "rarete": "commun|rare|très rare",
  "prix_achat_estime": 5,
  "prix_vente_optimal": 18,
  "fourchette_min": 12,
  "fourchette_max": 25,
  "marge_estimee": 65,
  "potentiel": "high",
  "plateformes": [
    {"nom": "Vinted", "score": 85, "prix_moyen": 15, "conseil": "Conseil spécifique à cette plateforme"},
    {"nom": "eBay", "score": 70, "prix_moyen": 20, "conseil": "Conseil spécifique"},
    {"nom": "Momox", "score": 55, "prix_moyen": 8, "conseil": "Conseil spécifique"},
    {"nom": "Leboncoin", "score": 45, "prix_moyen": 12, "conseil": "Conseil spécifique"},
    {"nom": "Amazon Marketplace", "score": 60, "prix_moyen": 18, "conseil": "Conseil spécifique"}
  ],
  "meilleure_plateforme": "Vinted",
  "saisonnalite": {"jan":40,"fev":45,"mar":55,"avr":60,"mai":70,"jun":65,"jul":50,"aou":45,"sep":80,"oct":85,"nov":90,"dec":75},
  "meilleure_periode": "Septembre–Novembre",
  "etat_impact": "Impact de l'état '${etat || 'non précisé'}' sur le prix en 1 phrase",
  "points_valeur": ["Argument de valeur 1", "Argument de valeur 2", "Argument de valeur 3"],
  "risques": "Risque principal",
  "conseil_prix": "Stratégie de prix en 2 phrases",
  "fiche_vinted": {
    "titre": "Titre annonce Vinted max 80 car, accrocheur avec mots-clés",
    "description": "Description complète Vinted (300-400 mots), naturelle, avec état, points forts, pour qui c'est idéal, détails physiques du livre. Ton humain et vendeur, pas robotique.",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
    "prix_suggere": 15,
    "categorie": "Catégorie Vinted appropriée"
  },
  "fiche_ebay": {
    "titre": "Titre annonce eBay max 80 car, avec mots-clés de recherche",
    "description": "Description eBay complète (200-300 mots), plus formelle, avec détails bibliographiques, état, dimensions estimées si possibles.",
    "prix_suggere": 20,
    "type_vente": "Prix fixe ou Enchères",
    "duree_encheres": "7 jours si enchères"
  },
  "fiche_leboncoin": {
    "titre": "Titre Leboncoin court et efficace",
    "description": "Description Leboncoin concise (150-200 mots), directe, avec état et prix justifié.",
    "prix_suggere": 12
  }
}

Pour potentiel : high si marge > 60%, medium si 30-60%, low si < 30%.
Adapte TOUT au livre réel identifié. Les fiches doivent être prêtes à copier-coller directement sur les plateformes.`;

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
