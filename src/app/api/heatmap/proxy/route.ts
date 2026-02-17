import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SWIPE_CSS = `
<style data-heatmap-proxy>
  *[style*="100vh"], .section, .slide, .swiper-slide, [class*="slide"], [class*="section"] {
    height: auto !important;
    min-height: 700px !important;
  }
  html, body {
    scroll-snap-type: none !important;
    overflow: visible !important;
    height: auto !important;
    overflow-x: hidden !important;
  }
  * {
    scroll-snap-align: unset !important;
    scroll-snap-stop: unset !important;
  }
</style>
`;

const SWIPE_JS = `
<script data-heatmap-proxy>
  document.addEventListener('wheel', function(e) { e.stopImmediatePropagation(); }, true);
  document.addEventListener('touchstart', function(e) { e.stopImmediatePropagation(); }, true);
  document.addEventListener('touchend', function(e) { e.stopImmediatePropagation(); }, true);
  document.addEventListener('touchmove', function(e) { e.stopImmediatePropagation(); }, true);
  // Report total height to parent after load
  window.addEventListener('load', function() {
    try {
      var h = document.documentElement.scrollHeight || document.body.scrollHeight;
      window.parent.postMessage({ type: 'proxy-page-height', height: h }, '*');
    } catch(e) {}
  });
  setTimeout(function() {
    try {
      var h = document.documentElement.scrollHeight || document.body.scrollHeight;
      window.parent.postMessage({ type: 'proxy-page-height', height: h }, '*');
    } catch(e) {}
  }, 2000);
</script>
`;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "urlパラメータが必要です" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: "無効なURLです" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "無効なURLです" }, { status: 400 });
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `ページ取得に失敗しました (${response.status})` },
        { status: 502 }
      );
    }

    let html = await response.text();

    // Replace 100vh in inline styles and CSS blocks
    html = html.replace(/height\s*:\s*100vh/gi, "height: auto; min-height: 700px");
    html = html.replace(/min-height\s*:\s*100vh/gi, "min-height: 700px");
    html = html.replace(/max-height\s*:\s*100vh/gi, "max-height: none");

    // Convert relative URLs to absolute for resources
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    // Fix relative src/href that start with /
    html = html.replace(/((?:src|href|action)\s*=\s*["'])\/(?!\/)/gi, `$1${baseUrl}/`);

    // Inject CSS before </head>
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${SWIPE_CSS}</head>`);
    } else {
      html = SWIPE_CSS + html;
    }

    // Inject JS before </body>
    if (html.includes("</body>")) {
      html = html.replace("</body>", `${SWIPE_JS}</body>`);
    } else {
      html = html + SWIPE_JS;
    }

    return NextResponse.json({ html });
  } catch (e) {
    console.error("heatmap/proxy error:", e);
    return NextResponse.json({ error: "ページ取得に失敗しました" }, { status: 500 });
  }
}
