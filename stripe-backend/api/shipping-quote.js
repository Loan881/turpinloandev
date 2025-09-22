const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

// ⚠️ À RENSEIGNER : map produit local -> variant_id Printful
const MAP = {
  // 'affiche-soleil|a3': 1234567,
  // 'tshirt-constellation|m': 7654321,
};

export default async function handler(req, res) {
  const ORIGIN = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    if (!PRINTFUL_API_KEY) throw new Error('PRINTFUL_API_KEY manquant');

    const { cart, customer } = req.body || {};
    if (!Array.isArray(cart) || !cart.length) throw new Error('Panier vide');
    if (!customer?.address?.line1 || !customer.address?.city || !customer.address?.postal_code || !customer.address?.country) {
      throw new Error('Adresse incomplète');
    }

    const items = cart.map(line => {
      const key = line.variantId ? `${line.id}|${line.variantId}` : line.id;
      const variant_id = MAP[key];
      if (!variant_id) throw new Error('Variant Printful manquant pour ' + key);
      return { variant_id, quantity: line.qty };
    });

    const r = await fetch('https://api.printful.com/shipping/rates', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Authorization': 'Bearer ' + PRINTFUL_API_KEY
      },
      body: JSON.stringify({
        recipient: {
          address1: customer.address.line1,
          address2: customer.address.line2 || undefined,
          city: customer.address.city,
          country_code: customer.address.country,
          zip: customer.address.postal_code
        },
        items
      })
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || 'Erreur Printful');

    const options = (data.result || []).map((o, idx) => ({
      id: o.id || String(idx),
      label: `${o.name} (${o.min_delivery_days}-${o.max_delivery_days} j)`,
      amount: Math.round(parseFloat(o.rate) * 100),
      carrier: o.carrier,
      service: o.service
    }));

    res.json({ subtotal: 0, options });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}
