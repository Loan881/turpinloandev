import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SK);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { cart, customer } = req.body;
    if (!cart || !customer) {
      return res.status(400).json({ error: "Cart et customer requis" });
    }

    // 💰 Calcul du montant total (en centimes)
    const amount = cart.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: {
        cart: JSON.stringify(cart),
        customer: JSON.stringify(customer),
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
