import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const { priceId } = await req.json();
    const stripePriceId = priceId === "pro"
      ? process.env.STRIPE_PRICE_PRO
      : process.env.STRIPE_PRICE_BUSINESS;

    if (!stripePriceId) {
      return NextResponse.json({ error: "料金プランが設定されていません" }, { status: 400 });
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/settings?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      metadata: { userId: user.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "チェックアウトの作成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
