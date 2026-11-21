/* Static (GitHub Pages) demo mode: replaces the two server calls the site makes.
   - POST /lead       -> answers {ok:true}; nothing is sent (demo)
   - catalog filters  -> filtered in the browser from static/apts-<lang>.json */
(function () {
  const me = document.currentScript.src;
  const STATIC = me.slice(0, me.indexOf("/js/static-shim.js"));
  const SORT = {
    price_asc: (a, b) => a.price - b.price, price_desc: (a, b) => b.price - a.price,
    area_asc: (a, b) => a.area - b.area, area_desc: (a, b) => b.area - a.area,
    floor_asc: (a, b) => a.floor - b.floor || a.number - b.number,
    floor_desc: (a, b) => b.floor - a.floor || a.number - b.number,
    ppm_asc: (a, b) => a.price / a.area - b.price / b.area,
  };
  let data = null;
  const load = () => data || (data = fetch(STATIC + "/apts-" + (document.body.dataset.lang === "en" ? "en" : "uk") + ".json").then(r => r.json()));
  const num = v => { if (v == null || String(v).trim() === "") return null; const n = +String(v).replace(",", ".").replace(/[\s ]/g, ""); return isNaN(n) ? null : n; };

  function filter(p, d) {
    const rooms = p.getAll("rooms").map(Number);
    const secs = p.getAll("section").map(s => s.toUpperCase());
    let st = p.getAll("status").filter(s => ["free", "booked", "sold"].includes(s));
    if (p.getAll("status").includes("all")) st = ["free", "booked", "sold"];
    if (!st.length) st = ["free"];
    const r = {};
    ["area", "floor", "price"].forEach(k => { r[k + "_min"] = num(p.get(k + "_min")); r[k + "_max"] = num(p.get(k + "_max")); });
    const terrace = ["1", "on", "true"].includes(p.get("terrace"));
    let out = d.items.filter(a =>
      (!rooms.length || rooms.includes(a.rooms) || (rooms.includes(4) && a.rooms >= 4)) &&
      (!secs.length || secs.includes(a.section)) && st.includes(a.status) &&
      ["area", "floor", "price"].every(k => (r[k + "_min"] == null || a[k] >= Math.min(r[k + "_min"], r[k + "_max"] ?? Infinity)) &&
                                            (r[k + "_max"] == null || a[k] <= Math.max(r[k + "_max"], r[k + "_min"] ?? -Infinity))) &&
      (!terrace || a.terrace > 0));
    out.sort(SORT[p.get("sort")] || SORT.price_asc);
    const view = p.get("view") === "cards" ? "cards" : "table";
    const html = !out.length ? d.empty : d[view].replace("@@ROWS@@", out.map(a => view === "cards" ? a.card : a.tr).join(""));
    return { count: out.length, html };
  }

  const json = o => new Response(JSON.stringify(o), { headers: { "Content-Type": "application/json" } });
  const orig = window.fetch.bind(window);
  window.fetch = function (url, init = {}) {
    const u = new URL(String(url), location.href);
    if ((init.method || "GET").toUpperCase() === "POST" && /\/lead\/?$/.test(u.pathname)) {
      return Promise.resolve(json({ ok: true, demo: true }));
    }
    const xr = init.headers && (init.headers["X-Requested-With"] || (init.headers.get && init.headers.get("X-Requested-With")));
    if (xr === "fetch" && /\/apartments\/?$/.test(u.pathname)) {
      return load().then(d => json(filter(u.searchParams, d)));
    }
    return orig(url, init);
  };

  // deep links like /apartments/?rooms=2 : put the values into the form and run the filter once
  document.addEventListener("DOMContentLoaded", () => {
    const f = document.getElementById("filters");
    if (!f || !location.search) return;
    const p = new URLSearchParams(location.search);
    f.querySelectorAll("input,select").forEach(i => {
      if (!i.name || !p.has(i.name)) return;
      if (i.type === "checkbox" || i.type === "radio") i.checked = p.getAll(i.name).includes(i.value);
      else i.value = p.get(i.name);
    });
    const s = document.querySelector("select[name=sort]"); if (s && p.get("sort")) s.value = p.get("sort");
    setTimeout(() => f.dispatchEvent(new Event("submit", { cancelable: true })), 0);
  });
})();
