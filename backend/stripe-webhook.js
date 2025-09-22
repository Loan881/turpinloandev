import Stripe from "stripe";
import { sendToPrintful } from "./printful.js";

const stripe = new Stripe(process.env.STRIPE_SK);

export const config = {
  api: { bodyParser: false }, // Stripe veut le body brut
};

// Helper pour récupérer le body brut
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Paiement validé
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    try {
      const cart = JSON.parse(paymentIntent.metadata.cart || "[]");
      const customer = JSON.parse(paymentIntent.metadata.customer || "{}");

      await sendToPrintful(customer, cart);
    } catch (err) {
      console.error("❌ Erreur envoi Printful:", err.message);
    }
  }

  res.json({ received: true });
}
