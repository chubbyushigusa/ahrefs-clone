"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Play,
  Pause,
  Monitor,
  Smartphone,
  Tablet,
  MousePointer2,
  Clock,
  Globe,
  ChevronLeft,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

interface SessionListItem {
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

interface SessionEvent {
  type: "pageview" | "scroll" | "click";
  timestamp: string;
  path?: string;
  title?: string;
  maxDepth?: number;
  dwellMs?: number;
  x?: number;
  y?: number;
  selector?: string;
  text?: string;
  href?: string;
}

interface SessionDetailData {
  sessionId: string;
  startedAt: string;
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  screenW: number | null;
  screenH: number | null;
  referrer: string | null;
  events: SessionEvent[];
}

interface ClickIndicator {
  id: number;
  x: number;
  y: number;
}

interface Props {
  siteId: string;
}

/* ─── Helpers ───────────────────────────────────────────── */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDwell(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
}

const DeviceIcon = ({ device }: { device: string }) => {
  if (device === "mobile")
    return <Smartphone style={{ width: "14px", height: "14px" }} />;
  if (device === "tablet")
    return <Tablet style={{ width: "14px", height: "14px" }} />;
  return <Monitor style={{ width: "14px", height: "14px" }} />;
};

/* ─── Component ─────────────────────────────────────────── */

export function SessionReplay({ siteId }: Props) {
  // Session list state
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // Selected session state
  const [selectedSession, setSelectedSession] =
    useState<SessionListItem | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetailData | null>(
    null
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [proxyHtml, setProxyHtml] = useState<string | null>(null);

  // Playback state
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [clickIndicators, setClickIndicators] = useState<ClickIndicator[]>([]);

  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickIdRef = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch session list ──────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const res = await fetch(
        `/api/heatmap/sessions?siteId=${siteId}&pageSize=50`
      );
      const json = await res.json();
      if (res.ok) {
        setSessions(json.sessions || []);
      } else {
        setSessionsError(json.error || "セッション取得に失敗しました");
      }
    } catch {
      setSessionsError("セッション取得に失敗しました");
    } finally {
      setLoadingSessions(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ── Select a session ────────────────────────────────────
  const selectSession = useCallback(
    async (session: SessionListItem) => {
      setSelectedSession(session);
      setLoadingDetail(true);
      setPlaying(false);
      setCurrentEventIndex(0);
      setCursorPos({ x: 0, y: 0 });
      setClickIndicators([]);
      setProxyHtml(null);
      setSessionDetail(null);

      try {
        // Fetch detail + proxy HTML in parallel
        const detailPromise = fetch(
          `/api/heatmap/sessions/${session.sessionId}?siteId=${siteId}`
        ).then((r) => r.json());

        // Determine the entry page URL for proxy
        const entryUrl = session.entryPage.startsWith("http")
          ? session.entryPage
          : `https://${session.entryPage}`;

        const proxyPromise = fetch(
          `/api/heatmap/proxy?url=${encodeURIComponent(entryUrl)}`
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        const [detail, proxy] = await Promise.all([
          detailPromise,
          proxyPromise,
        ]);

        if (detail && detail.events) {
          setSessionDetail(detail);
        }
        if (proxy && proxy.html) {
          setProxyHtml(proxy.html);
        }
      } catch {
        // ignore
      } finally {
        setLoadingDetail(false);
      }
    },
    [siteId]
  );

  // ── Compute mouse positions from events ─────────────────
  const mousePositions = sessionDetail
    ? sessionDetail.events
        .filter(
          (ev) =>
            ev.type === "click" &&
            ev.x !== undefined &&
            ev.y !== undefined
        )
        .map((ev) => ({
          x: ev.x!,
          y: ev.y!,
          timestamp: new Date(ev.timestamp).getTime(),
          isClick: true,
          path: ev.path,
        }))
    : [];

  // Interpolate positions between clicks for smoother movement
  const interpolatedPositions = (() => {
    if (mousePositions.length === 0) return [];
    const result: {
      x: number;
      y: number;
      timestamp: number;
      isClick: boolean;
    }[] = [];

    for (let i = 0; i < mousePositions.length; i++) {
      const current = mousePositions[i];
      if (i > 0) {
        const prev = mousePositions[i - 1];
        const timeDiff = current.timestamp - prev.timestamp;
        const steps = Math.min(Math.max(Math.floor(timeDiff / 100), 1), 20);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          result.push({
            x: prev.x + (current.x - prev.x) * t,
            y: prev.y + (current.y - prev.y) * t,
            timestamp: prev.timestamp + timeDiff * t,
            isClick: false,
          });
        }
      }
      result.push({
        x: current.x,
        y: current.y,
        timestamp: current.timestamp,
        isClick: true,
      });
    }
    return result;
  })();

  // ── Playback logic ──────────────────────────────────────
  useEffect(() => {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }

    if (!playing || interpolatedPositions.length === 0) return;
    if (currentEventIndex >= interpolatedPositions.length) {
      setPlaying(false);
      return;
    }

    const currentPos = interpolatedPositions[currentEventIndex];
    setCursorPos({ x: currentPos.x, y: currentPos.y });

    // Show click indicator if it is a click event
    if (currentPos.isClick) {
      const id = ++clickIdRef.current;
      setClickIndicators((prev) => [...prev, { id, x: currentPos.x, y: currentPos.y }]);
      setTimeout(() => {
        setClickIndicators((prev) => prev.filter((c) => c.id !== id));
      }, 800);
    }

    // Calculate delay to next event
    const nextIndex = currentEventIndex + 1;
    if (nextIndex < interpolatedPositions.length) {
      const delay =
        (interpolatedPositions[nextIndex].timestamp - currentPos.timestamp) /
        speed;
      const clampedDelay = Math.max(16, Math.min(delay, 2000));
      playTimerRef.current = setTimeout(() => {
        setCurrentEventIndex(nextIndex);
      }, clampedDelay);
    } else {
      setPlaying(false);
    }

    return () => {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
      }
    };
  }, [playing, currentEventIndex, speed, interpolatedPositions]);

  // ── Toggle play/pause ───────────────────────────────────
  const togglePlay = () => {
    if (!playing && currentEventIndex >= interpolatedPositions.length) {
      setCurrentEventIndex(0);
    }
    setPlaying(!playing);
  };

  // ── Progress bar click ──────────────────────────────────
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interpolatedPositions.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    const newIndex = Math.floor(fraction * (interpolatedPositions.length - 1));
    setCurrentEventIndex(newIndex);
    const pos = interpolatedPositions[newIndex];
    if (pos) setCursorPos({ x: pos.x, y: pos.y });
  };

  // ── Calculate progress percent ──────────────────────────
  const progressPercent =
    interpolatedPositions.length > 1
      ? (currentEventIndex / (interpolatedPositions.length - 1)) * 100
      : 0;

  // ── Duration helper ─────────────────────────────────────
  const sessionDuration =
    sessionDetail && sessionDetail.events.length > 1
      ? new Date(
          sessionDetail.events[sessionDetail.events.length - 1].timestamp
        ).getTime() - new Date(sessionDetail.events[0].timestamp).getTime()
      : 0;

  // ── Write proxy HTML into iframe ────────────────────────
  useEffect(() => {
    if (iframeRef.current && proxyHtml) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(proxyHtml);
        doc.close();
      }
    }
  }, [proxyHtml]);

  /* ─── Session list view ───────────────────────────────── */
  if (!selectedSession) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Play style={{ width: "16px", height: "16px", color: "#f97316" }} />
              セッションリプレイ
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
              セッションを選択してリプレイを再生します
            </p>

            {loadingSessions && (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#f97316" }} />
              </div>
            )}

            {sessionsError && (
              <p style={{ fontSize: "13px", color: "#ef4444", textAlign: "center", padding: "20px" }}>
                {sessionsError}
              </p>
            )}

            {!loadingSessions && !sessionsError && sessions.length === 0 && (
              <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "40px" }}>
                セッションデータがありません
              </p>
            )}

            {!loadingSessions && sessions.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {sessions.map((s) => (
                  <button
                    key={s.sessionId}
                    onClick={() => selectSession(s)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "background-color 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f8fafc")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#fff")
                    }
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        backgroundColor: "#fff7ed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Play style={{ width: "16px", height: "16px", color: "#f97316" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>
                          {formatDate(s.startedAt)}
                        </span>
                        <Badge variant="secondary" style={{ fontSize: "10px" }}>
                          {s.pageCount}ページ
                        </Badge>
                        <Badge variant="secondary" style={{ fontSize: "10px" }}>
                          {s.totalClicks}クリック
                        </Badge>
                      </div>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.entryPage}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                      <DeviceIcon device={s.device} />
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {formatDwell(s.dwellMs)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Replay view ─────────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Back button + session metadata */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedSession(null);
                setSessionDetail(null);
                setPlaying(false);
                setCurrentEventIndex(0);
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              戻る
            </Button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, flexWrap: "wrap" }}>
              <Badge variant="secondary" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <DeviceIcon device={selectedSession.device} />
                {selectedSession.device}
              </Badge>
              <Badge variant="secondary">{selectedSession.browser}</Badge>
              <Badge variant="secondary">{selectedSession.os}</Badge>
              {selectedSession.screenW && selectedSession.screenH && (
                <Badge variant="outline" style={{ fontSize: "10px" }}>
                  {selectedSession.screenW}x{selectedSession.screenH}
                </Badge>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock style={{ width: "12px", height: "12px", color: "#94a3b8" }} />
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  {formatDate(selectedSession.startedAt)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Globe style={{ width: "12px", height: "12px", color: "#94a3b8" }} />
                <span
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedSession.entryPage}
                </span>
              </div>
              {sessionDuration > 0 && (
                <Badge variant="outline" style={{ fontSize: "10px" }}>
                  {formatDwell(sessionDuration)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loadingDetail && (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#f97316" }} />
        </div>
      )}

      {/* Replay area */}
      {!loadingDetail && sessionDetail && (
        <>
          {/* Iframe + cursor overlay */}
          <div
            ref={containerRef}
            style={{
              position: "relative",
              width: "100%",
              height: "600px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              backgroundColor: "#f8fafc",
            }}
          >
            {/* Browser chrome */}
            <div
              style={{
                height: "32px",
                backgroundColor: "#f1f5f9",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#eab308" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
              </div>
              <div
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderRadius: "4px",
                  padding: "2px 10px",
                  fontSize: "11px",
                  color: "#94a3b8",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selectedSession.entryPage}
              </div>
            </div>

            {/* Iframe */}
            <iframe
              ref={iframeRef}
              style={{
                width: "100%",
                height: "calc(100% - 32px)",
                border: "none",
                pointerEvents: "none",
              }}
              sandbox="allow-same-origin"
              title="Session Replay"
            />

            {/* Cursor overlay */}
            <div
              style={{
                position: "absolute",
                top: "32px",
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              {/* Cursor */}
              {interpolatedPositions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: `${(cursorPos.x / (selectedSession.screenW || 1920)) * 100}%`,
                    top: `${(cursorPos.y / (selectedSession.screenH || 1080)) * 100}%`,
                    transform: "translate(-2px, -2px)",
                    transition: "left 0.08s linear, top 0.08s linear",
                    zIndex: 20,
                  }}
                >
                  <MousePointer2
                    style={{
                      width: "20px",
                      height: "20px",
                      color: "#f97316",
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                    }}
                  />
                </div>
              )}

              {/* Click indicators */}
              {clickIndicators.map((ci) => (
                <div
                  key={ci.id}
                  style={{
                    position: "absolute",
                    left: `${(ci.x / (selectedSession.screenW || 1920)) * 100}%`,
                    top: `${(ci.y / (selectedSession.screenH || 1080)) * 100}%`,
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    border: "3px solid #ef4444",
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    transform: "translate(-12px, -12px)",
                    animation: "clickPulse 0.8s ease-out forwards",
                    zIndex: 15,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Playback controls */}
          <Card>
            <CardContent className="pt-3 pb-3">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {/* Play/Pause */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={togglePlay}
                  disabled={interpolatedPositions.length === 0}
                  style={{
                    width: "36px",
                    height: "36px",
                    padding: 0,
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}
                >
                  {playing ? (
                    <Pause style={{ width: "16px", height: "16px" }} />
                  ) : (
                    <Play style={{ width: "16px", height: "16px" }} />
                  )}
                </Button>

                {/* Speed selector */}
                <div
                  style={{
                    display: "flex",
                    gap: "2px",
                    backgroundColor: "#f1f5f9",
                    padding: "2px",
                    borderRadius: "6px",
                    flexShrink: 0,
                  }}
                >
                  {[1, 2, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "4px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: speed === s ? 600 : 400,
                        backgroundColor: speed === s ? "#fff" : "transparent",
                        color: speed === s ? "#f97316" : "#64748b",
                        boxShadow: speed === s ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* Progress bar */}
                <div
                  onClick={handleProgressClick}
                  style={{
                    flex: 1,
                    height: "8px",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "4px",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: "100%",
                      backgroundColor: "#f97316",
                      borderRadius: "4px",
                      transition: playing ? "width 0.1s linear" : "none",
                    }}
                  />
                  {/* Thumb */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${progressPercent}%`,
                      top: "50%",
                      transform: "translate(-6px, -50%)",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: "#f97316",
                      border: "2px solid #fff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </div>

                {/* Event count */}
                <span style={{ fontSize: "11px", color: "#94a3b8", flexShrink: 0 }}>
                  {currentEventIndex + 1} / {interpolatedPositions.length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Session event summary */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">イベントサマリー</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#3b82f6",
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    ページビュー:{" "}
                    {sessionDetail.events.filter((e) => e.type === "pageview").length}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#f97316",
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    クリック:{" "}
                    {sessionDetail.events.filter((e) => e.type === "click").length}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#22c55e",
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    スクロール:{" "}
                    {sessionDetail.events.filter((e) => e.type === "scroll").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* No events fallback */}
      {!loadingDetail && sessionDetail && interpolatedPositions.length === 0 && (
        <Card>
          <CardContent className="pt-6 pb-6">
            <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center" }}>
              このセッションにはマウスイベントが記録されていません
            </p>
          </CardContent>
        </Card>
      )}

      {/* Inject keyframe animation for click pulse */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes clickPulse {
              0% { transform: translate(-12px, -12px) scale(0.5); opacity: 1; }
              100% { transform: translate(-12px, -12px) scale(2); opacity: 0; }
            }
          `,
        }}
      />
    </div>
  );
}
