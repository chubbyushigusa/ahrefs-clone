"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "¥0",
    period: "永久無料",
    description: "個人利用やお試しに最適",
    features: [
      "サイト分析 5回/日",
      "サイト監査 1回/日",
      "キーワード検索 10回/日",
      "ランクトラッカー 5キーワード",
      "基本的なSEOレポート",
    ],
    cta: "無料で始める",
    popular: false,
    priceId: null,
  },
  {
    name: "Pro",
    price: "¥980",
    period: "/月",
    description: "本格的なSEO分析に",
    features: [
      "サイト分析 50回/日",
      "サイト監査 5回/日",
      "キーワード検索 100回/日",
      "ランクトラッカー 50キーワード",
      "詳細なSEOレポート",
      "競合分析",
      "優先サポート",
    ],
    cta: "Proを始める",
    popular: true,
    priceId: "pro",
  },
  {
    name: "Business",
    price: "¥2,980",
    period: "/月",
    description: "エージェンシー・大規模サイト向け",
    features: [
      "サイト分析 無制限",
      "サイト監査 無制限",
      "キーワード検索 無制限",
      "ランクトラッカー 無制限",
      "全機能アクセス",
      "API アクセス",
      "専任サポート",
      "カスタムレポート",
    ],
    cta: "Businessを始める",
    popular: false,
    priceId: "business",
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSubscribe = async (priceId: string | null) => {
    if (!priceId) {
      if (session) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
      return;
    }

    if (!session) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-blue-900">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-orange-500" />
            <span className="text-xl font-bold text-white">SEO Analyzer</span>
          </Link>
          <div className="flex items-center gap-4">
            {session ? (
              <Button variant="outline" className="text-white border-white/20 hover:bg-white/10" asChild>
                <Link href="/dashboard">ダッシュボード</Link>
              </Button>
            ) : (
              <Button variant="outline" className="text-white border-white/20 hover:bg-white/10" asChild>
                <Link href="/login">ログイン</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">料金プラン</h1>
          <p className="text-lg text-blue-200 max-w-2xl mx-auto">
            あなたのニーズに合ったプランを選択してください。<br />
            いつでもアップグレード・ダウングレードが可能です。
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${plan.popular ? "border-orange-500 border-2 shadow-xl shadow-orange-500/10" : "border-white/10"} bg-white`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white px-4 py-1">人気</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${plan.popular ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan.priceId)}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
