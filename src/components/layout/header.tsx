"use client";

import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        display: "flex",
        height: "64px",
        alignItems: "center",
        justifyContent: "flex-end",
        borderBottom: "1px solid #e2e8f0",
        backgroundColor: "#ffffff",
        paddingLeft: "24px",
        paddingRight: "24px",
        gap: "16px",
      }}
    >
      <button
        style={{
          position: "relative",
          padding: "8px",
          borderRadius: "6px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <Bell style={{ width: "20px", height: "20px", color: "#64748b" }} />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button style={{ border: "none", background: "transparent", cursor: "pointer", borderRadius: "999px" }}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {session?.user?.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{session?.user?.name || "Demo User"}</p>
            <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              設定
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              プロフィール
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
