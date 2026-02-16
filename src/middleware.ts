export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/site-explorer/:path*", "/keywords/:path*", "/audit/:path*", "/rank-tracker/:path*", "/competitors/:path*", "/heatmap/:path*", "/content-gap/:path*", "/settings/:path*", "/api/site-explorer/:path*", "/api/keywords/:path*", "/api/audit/:path*", "/api/rank-tracker/:path*", "/api/competitor/:path*", "/api/heatmap/:path*", "/api/content-gap/:path*", "/api/projects/:path*", "/api/heatmap/sites/:path*", "/api/heatmap/data/:path*"],
};
