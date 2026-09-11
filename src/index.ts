import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import path from "path";
import { productPrices, servicePrices } from "./pricing";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-08-26.dahlia",
});

app.use(express.static(path.join(__dirname, "../public")));

app.use(cors());

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error("❌ Signature webhook invalide:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // On a la certitude que cet événement vient bien de Stripe
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("✅ Paiement confirmé pour la session:", session.id);
      // ICI : ta vraie logique métier
      // - débloquer l'accès au produit dans ta BDD
      // - envoyer un email de confirmation
      // - etc.
      break;

    case "checkout.session.expired":
      console.log("⏰ Session expirée:", event.data.object);
      break;

    default:
      console.log(`Event non géré: ${event.type}`);
  }

  res.json({ received: true });
});
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Serveur Stripe OK 🚀");
});

app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount, // en plus petite unité (ex: 1000 = 10.00€)
      currency: currency || "eur",
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/create-checkout", async (req, res) => {
  try {
    const { product, service } = req.body; // ex: { product: "pantalon", service: "retouche" }

    const productPrice = productPrices[product];
    const servicePrice = servicePrices[service];

    if (!productPrice || !servicePrice) {
      return res.status(400).json({ error: "Produit ou prestation invalide" });
    }

    const totalAmount = productPrice + servicePrice;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${product} - ${service}`,
              description: `Transformation: ${product}, Prestation: ${service}`,
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      success_url: "https://stripe-payment-livid.vercel.app/success.html",
      cancel_url: "https://stripe-payment-livid.vercel.app/cancel.html",
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default app;

if (!process.env.VERCEL) {
  app.listen(3000, () =>
    console.log("Serveur lancé sur http://localhost:3000"),
  );
}
