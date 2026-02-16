"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@example.com");
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = async () => {
    setLoading(true);
    await signIn("credentials", { email, callbackUrl: "/dashboard" });
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(224 71% 16%) 0%, hsl(224 76% 28%) 100%)" }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-10 w-10 text-orange-500" />
              <span className="text-3xl font-bold text-gray-900">SEO Analyzer</span>
            </div>
            <p className="text-muted-foreground text-center">
              サイト分析、キーワードリサーチ、競合分析を<br />
              オールインワンで提供するSEOプラットフォーム
            </p>
          </div>

          {/* Demo Login */}
          <div className="space-y-3 mb-6">
            <Input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDemoLogin()}
            />
            <Button
              onClick={handleDemoLogin}
              disabled={loading || !email}
              className="w-full h-12 text-base font-medium bg-blue-700 hover:bg-blue-800"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              ログイン（デモ）
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">または</span>
            </div>
          </div>

          {/* Google Login */}
          <Button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full h-12 text-base font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
            variant="outline"
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Googleでログイン
          </Button>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              デモログインはそのままボタンを押すだけでOKです
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
