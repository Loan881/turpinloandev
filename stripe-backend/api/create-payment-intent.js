// api/create-payment-intent.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ⚙️ URL publique de ton catalogue (utilisé pour calculer les montants)
const PRODUCTS_URL = 'https://loan881.github.io/loanturpin/products.json';

// CORS
const ALLOWED_ORIGINS = [
  'https://loan881.github.io',
  'http://localhost:3000',
  'http://localhost:5500'
];

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function loadProducts() {
  const r = await fetch(PRODUCTS_URL, { cache: 'no-store' });
  if (!r.ok) throw new Error('Impossible de charger products.json');
  return r.json();
}

// Convertit un prix en centimes (accepte "19,90", 19.9 ou 1990)
function asCents(v) {
  if (typeof v === 'string') v = v.replace(',', '.');
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return (n < 10 && String(n).includes('.')) ? Math.round(n * 100) : Math.round(n);
}

function priceFor(product, variantId) {
  let price = product.price;
  if (variantId && Array.isArray(product.variants)) {
    const v = product.variants.find(x =>
      x.id === variantId || x.sku === variantId || x.code === variantId
    );
    if (v && v.price != null) price = v.price;
  }
  return asCents(price);
}

function computeAmount(cart, products) {
  if (!Array.isArray(cart) || !cart.length) throw new Error('Panier vide');
  let total = 0;
  for (const line of cart) {
    const id = line.id;
    const qty = Math.max(1, parseInt(line.qty || 1, 10) || 1);
    if (!id) throw new Error('Ligne sans id');
    const p = products.find(
      pr => pr.id === id || pr.slug === id || pr.sku === id || pr.handle === id
    );
    if (!p) throw new Error(`Produit introuvable: ${id}`);
    total += priceFor(p, line.variantId || line.variant || line.option) * qty;
  }
  return total;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { cart, email, customer, saveCard } = req.body || {};

    // 1) Montant à partir du catalogue public
    const PRODUCTS = await loadProducts();
    const amount = computeAmount(cart, PRODUCTS);
    if (!amount || amount < 50) throw new Error('Montant invalide');

    // 2) (optionnel) créer/retrouver un customer si email fourni
    let customerId;
    if (email) {
      // On crée systématiquement un customer simple (plus robuste que search en clé standard)
      const created = await stripe.customers.create({
        email,
        name: customer?.firstName && customer?.lastName
          ? `${customer.firstName} ${customer.lastName}` : undefined,
        phone: customer?.phone || undefined,
        address: customer?.address ? {
          line1: customer.address.line1,
          line2: customer.address.line2 || undefined,
          city: customer.address.city,
          postal_code: customer.address.postal_code,
          country: customer.address.country
        } : undefined,
        metadata: { source: 'github-pages' }
      });
      customerId = created.id;
    }

    // 3) Créer le PaymentIntent
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      setup_future_usage: saveCard ? 'off_session' : undefined,
      receipt_email: email || undefined,
      metadata: {
        shipping_method: customer?.shipping_method || 'standard'
      },
      shipping: customer?.address ? {
        name: customer?.firstName && customer?.lastName
          ? `${customer.firstName} ${customer.lastName}` : email || 'Client',
        phone: customer?.phone || undefined,
        address: {
          line1: customer.address.line1,
          line2: customer.address.line2 || undefined,
          city: customer.address.city,
          postal_code: customer.address.postal_code,
          country: customer.address.country
        }
      } : undefined
    });

    res.json({ clientSecret: pi.client_secret });
  } catch (e) {
    // ⚠️ renvoyer l’erreur AVEC CORS (headers déjà posés en début)
    res.status(400).json({ error: e.message });
  }
}
