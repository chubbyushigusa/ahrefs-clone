"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/layout/providers";
import { useAppStore } from "@/store/app-store";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#f1f5f9" }}>
      <Sidebar />
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? "256px" : "68px" }}
      >
        <Header />
        <main style={{ padding: "24px", flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <DashboardContent>{children}</DashboardContent>
    </Providers>
  );
}
