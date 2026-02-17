// Analyzer Heatmap Tracker v2.0
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
  var zones = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  // --- Mouse Move Recording ---
  var mouseBuf = [];
  var mouseStartTime = Date.now();

  // --- Rage/Dead Click Detection ---
  var clickHistory = []; // [{el, time}]

  // --- UTM Params ---
  function getUtm() {
    var params = new URLSearchParams(location.search);
    return {
      us: params.get("utm_source") || "",
      um: params.get("utm_medium") || "",
      uc: params.get("utm_campaign") || "",
    };
  }

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
    var utm = getUtm();
    var data = {
      sk: siteKey,
      sid: sid,
      url: location.href,
      path: location.pathname,
      title: document.title,
      ref: document.referrer,
      sw: screen.width,
      sh: screen.height,
      us: utm.us,
      um: utm.um,
      uc: utm.uc,
    };
    var xhr = new XMLHttpRequest();
    xhr.open("POST", API + "/pv", false);
    xhr.setRequestHeader("Content-Type", "application/json");
    try {
      xhr.send(JSON.stringify(data));
      var res = JSON.parse(xhr.responseText);
      pvId = res.id;
    } catch (e) {
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
    var viewTop = scrollTop / docH;
    var viewBottom = (scrollTop + viewH) / docH;
    for (var i = 0; i < 10; i++) {
      var zoneTop = i * 0.1;
      var zoneBottom = (i + 1) * 0.1;
      if (viewBottom > zoneTop && viewTop < zoneBottom) {
        zones[i] += 2;
      }
    }
  }

  function flushScroll() {
    if (!pvId || maxScroll === 0) return;
    var dwell = Date.now() - startTime;
    send("/scroll", { pvId: pvId, d: maxScroll, dw: dwell, zones: zones });
  }

  // --- Mouse Move Recording (throttled to ~100ms) ---
  var lastMouseTime = 0;
  function onMouseMove(e) {
    var now = Date.now();
    if (now - lastMouseTime < 100) return;
    lastMouseTime = now;
    if (mouseBuf.length >= 500) return; // cap at 500 moves
    mouseBuf.push({
      t: now - mouseStartTime,
      x: e.clientX,
      y: e.clientY,
    });
  }

  function flushMouse() {
    if (!pvId || mouseBuf.length === 0) return;
    send("/mouse", { pvId: pvId, moves: mouseBuf });
    mouseBuf = [];
  }

  // --- Click Detection (rage + dead) ---
  function isInteractive(el) {
    var tag = el.tagName.toLowerCase();
    if (tag === "a" || tag === "button" || tag === "input" || tag === "select" || tag === "textarea") return true;
    if (el.getAttribute("role") === "button" || el.getAttribute("tabindex")) return true;
    if (el.onclick || el.getAttribute("onclick")) return true;
    var cur = el;
    while (cur && cur !== document.body) {
      if (cur.tagName.toLowerCase() === "a" || cur.tagName.toLowerCase() === "button") return true;
      cur = cur.parentElement;
    }
    return false;
  }

  function onClick(e) {
    if (!pvId) return;
    var t = e.target;
    var rect = t.getBoundingClientRect();
    var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
    var x = Math.round(rect.left + rect.width / 2 + scrollX);
    var y = Math.round(rect.top + rect.height / 2 + scrollY);

    var sel = t.tagName.toLowerCase();
    if (t.id) sel += "#" + t.id;
    else if (t.className && typeof t.className === "string")
      sel += "." + t.className.trim().split(/\s+/).slice(0, 2).join(".");

    var text = (t.textContent || "").trim().slice(0, 50);
    var href = t.closest("a") ? t.closest("a").href : null;

    // Rage click detection: 3+ clicks on same selector within 1.5s
    var now = Date.now();
    clickHistory.push({ sel: sel, time: now });
    // Keep only last 2 seconds of history
    clickHistory = clickHistory.filter(function (c) { return now - c.time < 2000; });
    var sameCount = clickHistory.filter(function (c) { return c.sel === sel; }).length;
    var isRage = sameCount >= 3;

    // Dead click detection
    var isDead = !isInteractive(t) && !href;

    clickBuf.push({
      pvId: pvId,
      x: x,
      y: y,
      sel: sel,
      text: text,
      href: href,
      isRage: isRage,
      isDead: isDead,
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
  document.addEventListener("mousemove", onMouseMove, { passive: true });

  // Zone sampling every 2 seconds
  setInterval(sampleZones, 2000);

  // Send data when leaving
  window.addEventListener("beforeunload", function () {
    flushScroll();
    flushClicks();
    flushMouse();
  });

  // Periodic flush (every 30s)
  setInterval(function () {
    flushScroll();
    flushClicks();
    flushMouse();
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
