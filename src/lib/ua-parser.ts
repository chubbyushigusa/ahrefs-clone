// Lightweight UserAgent parser (regex-based, no dependencies)

export interface ParsedUA {
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { device: "desktop", browser: "不明", os: "不明" };

  // Device
  let device: ParsedUA["device"] = "desktop";
  if (/iPad|tablet|Kindle|PlayBook/i.test(ua)) {
    device = "tablet";
  } else if (/Mobile|Android.*Mobile|iPhone|iPod|Opera Mini|IEMobile/i.test(ua)) {
    device = "mobile";
  }

  // Browser
  let browser = "不明";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/MSIE|Trident/i.test(ua)) browser = "IE";

  // OS
  let os = "不明";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua)) os = "macOS";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";

  return { device, browser, os };
}
