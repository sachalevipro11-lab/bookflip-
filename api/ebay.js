export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { book, ebayToken } = req.body;
  if (!book || !ebayToken) return res.status(400).json({ error: 'Missing book data or eBay token' });

  const fiche = book.fiche_ebay;

  try {
    // Create eBay listing via Trading API
    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${ebayToken}</eBayAuthToken>
  </RequesterCredentials>
  <Item>
    <Title>${fiche.titre}</Title>
    <Description><![CDATA[${fiche.description}]]></Description>
    <PrimaryCategory><CategoryID>267</CategoryID></PrimaryCategory>
    <StartPrice>${fiche.prix_suggere}</StartPrice>
    <Currency>EUR</Currency>
    <Country>FR</Country>
    <Location>France</Location>
    <ListingType>FixedPriceItem</ListingType>
    <ListingDuration>GTC</ListingDuration>
    <Quantity>1</Quantity>
    <ConditionID>3000</ConditionID>
    <PaymentMethods>PayPal</PaymentMethods>
    <ShipToLocations>FR</ShipToLocations>
    <ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>FR_LaPosteLettreSuivie</ShippingService>
        <ShippingServiceCost>3.50</ShippingServiceCost>
      </ShippingServiceOptions>
    </ShippingDetails>
    <ReturnPolicy>
      <ReturnsAcceptedOption>ReturnsNotAccepted</ReturnsAcceptedOption>
    </ReturnPolicy>
  </Item>
</AddItemRequest>`;

    const response = await fetch('https://api.ebay.com/ws/api.dll', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'X-EBAY-API-SITEID': '71',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'AddItem',
        'X-EBAY-API-APP-NAME': process.env.EBAY_APP_ID || '',
        'X-EBAY-API-DEV-NAME': process.env.EBAY_DEV_ID || '',
        'X-EBAY-API-CERT-NAME': process.env.EBAY_CERT_ID || '',
      },
      body: xmlBody
    });

    const text = await response.text();
    const itemIdMatch = text.match(/<ItemID>(\d+)<\/ItemID>/);
    const feeMatch = text.match(/<ListingFee>([^<]+)<\/ListingFee>/);
    const errMatch = text.match(/<ShortMessage>([^<]+)<\/ShortMessage>/);

    if (itemIdMatch) {
      return res.status(200).json({
        success: true,
        itemId: itemIdMatch[1],
        listingFee: feeMatch ? feeMatch[1] : '?',
        url: `https://www.ebay.fr/itm/${itemIdMatch[1]}`
      });
    } else {
      return res.status(400).json({ error: errMatch ? errMatch[1] : 'eBay error', raw: text.slice(0, 500) });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
