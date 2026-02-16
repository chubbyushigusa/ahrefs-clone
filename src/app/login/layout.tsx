import { Providers } from "@/components/layout/providers";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
