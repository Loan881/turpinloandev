import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SK, {
  apiVersion: "2025-01-27.acacia", // tu peux aussi mettre "2023-10-16" selon ta version Stripe
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { cart, customer } = req.body;

    if (!cart || cart.length === 0) {
      return res.status(400).json({ error: "Panier vide" });
    }

    // Calcul simple du montant total en centimes (à adapter selon tes prix réels)
    const amount = cart.reduce((total, item) => {
      const price = item.price || 2000; // exemple : 20,00 €
      return total + price * item.qty;
    }, 0);

    // Crée un PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      receipt_email: customer?.email,
      metadata: {
        customerName: `${customer?.firstName || ""} ${customer?.lastName || ""}`,
        customerEmail: customer?.email || "",
      },
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Erreur Stripe:", err);
    return res.status(500).json({ error: err.message });
  }
}
