export async function sendToPrintful(customer, cart) {
  const order = {
    recipient: {
      name: `${customer.firstName} ${customer.lastName}`,
      address1: customer.address.line1,
      address2: customer.address.line2,
      city: customer.address.city,
      country_code: customer.address.country,
      zip: customer.address.postal_code,
      email: customer.email,
      phone: customer.phone,
    },
    items: cart.map(item => ({
      variant_id: item.variantId, // ⚠️ ID du produit Printful
      quantity: item.qty,
    })),
  };

  const response = await fetch("https://api.printful.com/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.PRINTFUL_API_KEY}`,
    },
    body: JSON.stringify(order),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ Erreur Printful:", data);
    throw new Error(data.error?.message || "Erreur Printful");
  }

  console.log("✅ Commande envoyée à Printful:", data.result?.id || data);
  return data;
}
