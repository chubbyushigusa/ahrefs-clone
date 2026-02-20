// ─── Session List ─────────────────────────────────────────

export interface SessionListItem {
  sessionId: string;
  startedAt: string;
  pageCount: number;
  totalClicks: number;
  dwellMs: number;
  entryPage: string;
  referrer: string | null;
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  screenW: number | null;
  screenH: number | null;
}

export interface SessionListResponse {
  sessions: SessionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Session Detail ───────────────────────────────────────

export interface SessionTimelineEvent {
  type: "pageview" | "scroll" | "click" | "mousemove";
  timestamp: string;
  // pageview
  path?: string;
  title?: string;
  // scroll
  maxDepth?: number;
  dwellMs?: number;
  // click / mousemove
  x?: number;
  y?: number;
  scrollY?: number;
  selector?: string;
  text?: string;
  href?: string;
}

export interface SessionDetailResponse {
  sessionId: string;
  startedAt: string;
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  screenW: number | null;
  screenH: number | null;
  referrer: string | null;
  events: SessionTimelineEvent[];
}

// ─── Click Log ────────────────────────────────────────────

export interface ClickLogItem {
  id: string;
  createdAt: string;
  path: string;
  x: number;
  y: number;
  selector: string | null;
  text: string | null;
  href: string | null;
  sessionId: string;
  device: "desktop" | "mobile" | "tablet";
}

export interface ClickLogResponse {
  clicks: ClickLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Analytics ────────────────────────────────────────────

export interface DailyStats {
  date: string;
  pageviews: number;
  sessions: number;
}

export interface Distribution {
  name: string;
  count: number;
}

export interface AnalyticsResponse {
  daily: DailyStats[];
  deviceDist: Distribution[];
  browserDist: Distribution[];
  osDist: Distribution[];
  screenDist: Distribution[];
  referrerDist: Distribution[];
  avgSessionDurationMs: number;
  avgPagesPerSession: number;
  bounceRate: number;
}
