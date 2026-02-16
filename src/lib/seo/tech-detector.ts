import type { CheerioAPI } from "cheerio";

interface TechSignature {
  name: string;
  checks: ((html: string, $: CheerioAPI, headers: Record<string, string>) => boolean)[];
}

const techSignatures: TechSignature[] = [
  {
    name: "WordPress",
    checks: [
      (html) => /wp-content|wp-includes/i.test(html),
      (_, $) => $('meta[name="generator"][content*="WordPress"]').length > 0,
    ],
  },
  {
    name: "React",
    checks: [
      (html) => /react\.production\.min\.js|__NEXT_DATA__|_reactRootContainer/i.test(html),
      (_, $) => $("[data-reactroot], [data-reactid]").length > 0,
    ],
  },
  {
    name: "Next.js",
    checks: [
      (html) => /__NEXT_DATA__|_next\/static/i.test(html),
      (_, $) => $('script#__NEXT_DATA__').length > 0,
    ],
  },
  {
    name: "Vue.js",
    checks: [
      (html) => /vue\.runtime|vue\.min\.js|__vue_/i.test(html),
      (_, $) => $("[data-v-], [data-vue]").length > 0,
    ],
  },
  {
    name: "Nuxt.js",
    checks: [
      (html) => /__NUXT__|_nuxt\//i.test(html),
    ],
  },
  {
    name: "Angular",
    checks: [
      (html) => /ng-version|angular\.min\.js/i.test(html),
      (_, $) => $("[ng-app], [ng-controller], [_ngcontent]").length > 0,
    ],
  },
  {
    name: "jQuery",
    checks: [
      (html) => /jquery\.min\.js|jquery-\d/i.test(html),
    ],
  },
  {
    name: "Bootstrap",
    checks: [
      (html) => /bootstrap\.min\.(css|js)/i.test(html),
    ],
  },
  {
    name: "Tailwind CSS",
    checks: [
      (html) => /tailwindcss|tailwind\.min\.css/i.test(html),
      (_, $) => {
        const classCount = $("[class*='flex'], [class*='grid'], [class*='px-'], [class*='py-'], [class*='bg-']").length;
        return classCount > 10;
      },
    ],
  },
  {
    name: "Google Analytics",
    checks: [
      (html) => /google-analytics\.com|googletagmanager\.com|gtag\(|ga\(/i.test(html),
    ],
  },
  {
    name: "Google Tag Manager",
    checks: [
      (html) => /googletagmanager\.com\/gtm/i.test(html),
    ],
  },
  {
    name: "Shopify",
    checks: [
      (html) => /cdn\.shopify\.com|Shopify\.theme/i.test(html),
    ],
  },
  {
    name: "Wix",
    checks: [
      (html) => /static\.wixstatic\.com|wix-code-sdk/i.test(html),
    ],
  },
  {
    name: "Squarespace",
    checks: [
      (html) => /squarespace\.com|static1\.squarespace/i.test(html),
    ],
  },
  {
    name: "PHP",
    checks: [
      (_, __, headers) => /php/i.test(headers["x-powered-by"] || ""),
    ],
  },
  {
    name: "Nginx",
    checks: [
      (_, __, headers) => /nginx/i.test(headers["server"] || ""),
    ],
  },
  {
    name: "Apache",
    checks: [
      (_, __, headers) => /apache/i.test(headers["server"] || ""),
    ],
  },
  {
    name: "Cloudflare",
    checks: [
      (_, __, headers) => /cloudflare/i.test(headers["server"] || "") || !!headers["cf-ray"],
    ],
  },
  {
    name: "Font Awesome",
    checks: [
      (html) => /font-awesome|fontawesome/i.test(html),
    ],
  },
  {
    name: "Webpack",
    checks: [
      (html) => /webpackJsonp|webpack/i.test(html),
    ],
  },
  {
    name: "TypeScript",
    checks: [
      (html) => /\.tsx?"/i.test(html),
    ],
  },
  {
    name: "Stripe",
    checks: [
      (html) => /js\.stripe\.com/i.test(html),
    ],
  },
  {
    name: "Vercel",
    checks: [
      (_, __, headers) => /vercel/i.test(headers["server"] || "") || !!headers["x-vercel-id"],
    ],
  },
  {
    name: "Netlify",
    checks: [
      (_, __, headers) => !!headers["x-nf-request-id"],
    ],
  },
];

export function detectTechnologies(html: string, $: CheerioAPI, headers: Record<string, string>): string[] {
  const detected: string[] = [];

  for (const tech of techSignatures) {
    const isDetected = tech.checks.some((check) => {
      try {
        return check(html, $, headers);
      } catch {
        return false;
      }
    });

    if (isDetected) {
      detected.push(tech.name);
    }
  }

  return detected;
}
