import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook signature missing" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId === process.env.STRIPE_PRICE_PRO ? "pro" : "business";

        await prisma.user.update({
          where: { id: userId },
          data: {
            plan,
            stripeSubscriptionId: session.subscription as string,
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (user) {
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId === process.env.STRIPE_PRICE_PRO ? "pro" : "business";

        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan,
            stripeSubscriptionId: subscription.id,
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: "free",
            stripeSubscriptionId: null,
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
