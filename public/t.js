// Analyzer Heatmap Tracker v1.1
// Usage: <script src="https://analyzer.chubby.co.jp/t.js" data-site="YOUR_SITE_KEY"></script>
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;
  var siteKey = script.getAttribute("data-site");
  if (!siteKey) return;

  var API = script.src.replace(/\/t\.js.*$/, "") + "/api/t";
  var sid =
    sessionStorage.getItem("_az_sid") ||
    (function () {
      var s =
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("_az_sid", s);
      return s;
    })();

  var pvId = null;
  var maxScroll = 0;
  var startTime = Date.now();
  var clickBuf = [];
  var flushTimer = null;

  // --- Attention Zone Tracking ---
  // 10 zones (0-10%, 10-20%, ..., 90-100%) — cumulative dwell seconds
  var zones = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  function send(path, data) {
    var payload = JSON.stringify(data);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API + path, payload);
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", API + path, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(payload);
    }
  }

  // --- Pageview ---
  function trackPageview() {
    var data = {
      sk: siteKey,
      sid: sid,
      url: location.href,
      path: location.pathname,
      title: document.title,
      ref: document.referrer,
      sw: screen.width,
      sh: screen.height,
    };
    var xhr = new XMLHttpRequest();
    xhr.open("POST", API + "/pv", false); // sync to get pvId before user leaves
    xhr.setRequestHeader("Content-Type", "application/json");
    try {
      xhr.send(JSON.stringify(data));
      var res = JSON.parse(xhr.responseText);
      pvId = res.id;
    } catch (e) {
      // fallback: async
      send("/pv", data);
    }
  }

  // --- Scroll ---
  function onScroll() {
    var scrollTop =
      window.pageYOffset || document.documentElement.scrollTop || 0;
    var viewH = window.innerHeight || document.documentElement.clientHeight;
    var docH = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    var depth = docH > 0 ? Math.round(((scrollTop + viewH) / docH) * 100) : 0;
    if (depth > maxScroll) maxScroll = depth;
  }

  // --- Zone Sampling (every 2 seconds) ---
  function sampleZones() {
    var scrollTop =
      window.pageYOffset || document.documentElement.scrollTop || 0;
    var viewH = window.innerHeight || document.documentElement.clientHeight;
    var docH = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    if (docH <= 0) return;

    var viewTop = scrollTop / docH;        // 0..1
    var viewBottom = (scrollTop + viewH) / docH; // 0..1

    for (var i = 0; i < 10; i++) {
      var zoneTop = i * 0.1;
      var zoneBottom = (i + 1) * 0.1;
      // Check if this zone overlaps with viewport
      if (viewBottom > zoneTop && viewTop < zoneBottom) {
        zones[i] += 2; // 2 seconds per sample
      }
    }
  }

  function flushScroll() {
    if (!pvId || maxScroll === 0) return;
    var dwell = Date.now() - startTime;
    send("/scroll", { pvId: pvId, d: maxScroll, dw: dwell, zones: zones });
  }

  // --- Clicks ---
  function onClick(e) {
    if (!pvId) return;
    var t = e.target;
    var rect = t.getBoundingClientRect();
    var scrollY =
      window.pageYOffset || document.documentElement.scrollTop || 0;
    var scrollX =
      window.pageXOffset || document.documentElement.scrollLeft || 0;
    var x = Math.round(rect.left + rect.width / 2 + scrollX);
    var y = Math.round(rect.top + rect.height / 2 + scrollY);

    // Build CSS selector (simplified)
    var sel = t.tagName.toLowerCase();
    if (t.id) sel += "#" + t.id;
    else if (t.className && typeof t.className === "string")
      sel += "." + t.className.trim().split(/\s+/).slice(0, 2).join(".");

    var text = (t.textContent || "").trim().slice(0, 50);
    var href = t.closest("a") ? t.closest("a").href : null;

    clickBuf.push({
      pvId: pvId,
      x: x,
      y: y,
      sel: sel,
      text: text,
      href: href,
    });

    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushClicks, 2000);
  }

  function flushClicks() {
    if (clickBuf.length === 0) return;
    send("/click", { clicks: clickBuf });
    clickBuf = [];
  }

  // --- Init ---
  trackPageview();
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("click", onClick, true);

  // Zone sampling every 2 seconds
  setInterval(sampleZones, 2000);

  // Send data when leaving
  window.addEventListener("beforeunload", function () {
    flushScroll();
    flushClicks();
  });

  // Also send periodically (every 30s)
  setInterval(function () {
    flushScroll();
    flushClicks();
  }, 30000);

  // Measure page height after load
  window.addEventListener("load", function () {
    if (!pvId) return;
    var docH = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    send("/ph", { pvId: pvId, h: docH });
  });
})();
