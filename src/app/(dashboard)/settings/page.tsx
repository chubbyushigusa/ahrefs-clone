"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Shield,
  BarChart3,
  Crown,
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [usage, setUsage] = useState({
    siteExplorer: 0,
    keywords: 0,
    audit: 0,
    projects: 0,
  });
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    fetch("/api/settings/usage")
      .then((res) => res.json())
      .then((data) => {
        if (data.usage) setUsage(data.usage);
        if (data.plan) setPlan(data.plan);
      })
      .catch(() => {});
  }, []);

  const planLimits = {
    free: { siteExplorer: 5, keywords: 10, audit: 1, rankTracker: 5 },
    pro: { siteExplorer: 50, keywords: 100, audit: 5, rankTracker: 50 },
    business: { siteExplorer: -1, keywords: -1, audit: -1, rankTracker: -1 },
  };

  const limits = planLimits[plan as keyof typeof planLimits] || planLimits.free;

  const planNames: Record<string, string> = { free: "Free", pro: "Pro", business: "Business" };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-muted-foreground">アカウントと利用状況の管理</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            プロフィール
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {session?.user?.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{session?.user?.name}</p>
              <p className="text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            現在のプラン
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={plan === "business" ? "bg-purple-600" : plan === "pro" ? "bg-orange-500" : "bg-gray-500"} variant="default">
                {planNames[plan] || "Free"}
              </Badge>
              <span className="text-muted-foreground">
                {plan === "free" && "基本機能のみ利用可能"}
                {plan === "pro" && "拡張機能が利用可能"}
                {plan === "business" && "全機能が無制限で利用可能"}
              </span>
            </div>
            {plan === "free" && (
              <Button asChild>
                <Link href="/pricing">アップグレード</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            本日の利用状況
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <UsageItem
              label="サイト分析"
              used={usage.siteExplorer}
              limit={limits.siteExplorer}
            />
            <UsageItem
              label="キーワード検索"
              used={usage.keywords}
              limit={limits.keywords}
            />
            <UsageItem
              label="サイト監査"
              used={usage.audit}
              limit={limits.audit}
            />
            <UsageItem
              label="プロジェクト"
              used={usage.projects}
              limit={limits.rankTracker}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            セキュリティ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">認証方法</p>
                <p className="text-sm text-muted-foreground">Google OAuth</p>
              </div>
              <Badge variant="outline">有効</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsageItem({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);

  return (
    <div className="p-4 rounded-lg border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {used} / {isUnlimited ? "\u221E" : limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage >= 90 ? "bg-red-500" : percentage >= 70 ? "bg-orange-500" : "bg-primary"
          }`}
          style={{ width: isUnlimited ? "0%" : `${percentage}%` }}
        />
      </div>
    </div>
  );
}
