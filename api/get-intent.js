import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SK);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "payment_intent ID requis" });

    const intent = await stripe.paymentIntents.retrieve(id);

    const cart = intent.metadata?.cart ? JSON.parse(intent.metadata.cart) : [];
    const customer = intent.metadata?.customer ? JSON.parse(intent.metadata.customer) : null;

    res.json({
      id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      cart,
      customer,
      status: intent.status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
