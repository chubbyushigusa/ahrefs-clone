import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
      apiVersion: "2024-04-10" as Stripe.LatestApiVersion,
    });
  }
  return stripeInstance;
}
