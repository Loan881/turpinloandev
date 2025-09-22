import Stripe from 'stripe';

// Stripe exige le RAW body
export const config = { api: { bodyParser: false } };

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

// 🔁 Complète cette map avec tes variant_id Printful plus tard
const MAP = {
  // 'affiche-soleil|a3': 1234567,
  // 'tshirt-constellation|m': 7654321,
};

async function printful(path, payload){
  if(!PRINTFUL_API_KEY) { console.warn('PRINTFUL_API_KEY manquant'); return { skipped: true }; }
  const r = await fetch(`https://api.printful.com${path}`, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer ' + PRINTFUL_API_KEY
    },
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  if(!r.ok) throw new Error(data?.error?.message || 'Erreur Printful');
  return data;
}

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const buf = Buffer.from(await req.arrayBuffer());
  const sig = req.headers['stripe-signature'];

  let event;
  try{
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  }catch(err){
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try{
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;

      const cart = JSON.parse(pi.metadata?.cart || '[]');
      const customer = JSON.parse(pi.metadata?.customer || '{}');

      const items = cart.map(line => {
        const key = line.variantId ? `${line.id}|${line.variantId}` : line.id;
        const variant_id = MAP[key];
        if (!variant_id) throw new Error('Variant Printful manquant pour ' + key);
        return { variant_id, quantity: line.qty };
      });

      const recipient = {
        name: `${customer.firstName||''} ${customer.lastName||''}`.trim(),
        phone: customer.phone || undefined,
        address1: customer.address?.line1,
        address2: customer.address?.line2 || undefined,
        city: customer.address?.city,
        country_code: customer.address?.country,
        zip: customer.address?.postal_code,
        email: customer.email
      };

      try {
        await printful('/orders', {
          recipient, items,
          external_id: pi.id,
          confirm: true
        });
        console.log('✅ Commande Printful créée pour', pi.id);
      } catch (e) {
        console.error('Printful error:', e.message);
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      console.log('❌ Paiement échoué:', pi.id);
    }

    res.json({ received: true });
  }catch(err){
    console.error(err);
    res.status(500).send('Server error');
  }
}
