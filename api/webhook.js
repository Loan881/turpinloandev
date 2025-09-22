import Stripe from "stripe";
import { buffer } from "micro";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
export const config = {
  api: { bodyParser: false }, // Stripe demande le raw body
};

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "https://loan881.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Stripe-Signature");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];

  try {
    const event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // 🔎 Debug
    console.log("Webhook reçu:", event.type);

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      console.log("✅ Paiement réussi:", paymentIntent.id);
      // 👉 Ici tu pourras appeler Printful
    }

    res.json({ debug: { cors: true, event: event.type }, received: true });
  } catch (err) {
    console.error("⚠️ Webhook error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
