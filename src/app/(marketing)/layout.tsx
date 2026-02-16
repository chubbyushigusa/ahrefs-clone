import { Providers } from "@/components/layout/providers";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
