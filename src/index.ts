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

app.post("/create-checkout-session", async (req, res) => {
  try {
    const appUrl = process.env.APP_URL
      ? process.env.APP_URL.replace(/\/$/, "")
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: "price_1UEWKjFKirn3MxnXP10233Wk",
          quantity: 1,
        },
      ],
      success_url: `https://stripe-payment-livid.vercel.app/success.html`,
      cancel_url: `https://stripe-payment-livid.vercel.app/cancel.html`,
    });

    res.json({ url: session.url });
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
