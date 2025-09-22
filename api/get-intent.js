import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "https://loan881.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "PaymentIntent ID manquant" });

    const paymentIntent = await stripe.paymentIntents.retrieve(id);
    res.json({ paymentIntent });
  } catch (err) {
    console.error("Erreur Stripe:", err);
    res.status(500).json({ error: err.message });
  }
}

