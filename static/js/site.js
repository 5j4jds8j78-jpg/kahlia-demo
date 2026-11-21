// ЖК «Кахля» — public site behaviour. Progressive: every page works without JS (links, GET filters, POST forms).
(() => {
  const doc = document.documentElement;
  doc.classList.remove("no-js"); doc.classList.add("js");
  const EN = document.body.dataset.lang === "en";
  const T = (uk, en) => (EN ? en : uk);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const nb = " ";
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, nb);
  const uah = n => fmt(n) + " ₴";
  const mln = n => (n / 1e6).toFixed(2).replace(/0+$/, "").replace(/\.$/, "").replace(".", EN ? "." : ",");
  const plural = (n, one, few, many) => { n = Math.abs(n) % 100; const d = n % 10; if (n > 10 && n < 20) return many; if (d === 1) return one; if (d >= 2 && d <= 4) return few; return many; };
  const roomsLabel = r => r === 0 ? T("студія", "studio") : (EN ? r + "-bed" : r + "-кімн.");

  // ---------- header ----------
  const header = $(".site-header");
  const onScroll = () => header && header.classList.toggle("scrolled", scrollY > 24);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const menuBtn = $(".menu-btn"), nav = $("#nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open);
      if (open) header.classList.add("scrolled"); else onScroll();
    });
    $$("a", nav).forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }));
  }

  // ---------- one authored moment: image masks open as they enter ----------
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -12% 0px" });
    $$(".mask").forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("pre"); io.observe(el); } });
  }

  // ---------- tooltip helper ----------
  const placeTip = (tip, wrap, e) => {
    const r = wrap.getBoundingClientRect();
    let x = e.clientX - r.left + 18, y = e.clientY - r.top + 18;
    const w = tip.offsetWidth || 240, h = tip.offsetHeight || 150;
    if (x + w > r.width - 8) x = e.clientX - r.left - w - 18;
    if (y + h > r.height - 8) y = Math.max(8, e.clientY - r.top - h - 14);
    tip.style.left = x + "px"; tip.style.top = y + "px";
  };
  const placeTipAt = (tip, wrap, el) => {
    const r = wrap.getBoundingClientRect(), b = el.getBoundingClientRect();
    placeTip(tip, wrap, { clientX: Math.min(b.right - 20, b.left + b.width * 0.6), clientY: b.top + b.height / 2 });
  };

  // ---------- facade picker ----------
  $$("[data-facade]").forEach(wrap => {
    const statsEl = wrap.parentElement.querySelector(".floor-stats") || $(".floor-stats");
    const stats = statsEl ? JSON.parse(statsEl.textContent) : {};
    const base = wrap.dataset.floorUrl.replace(/\/$/, "");
    const tip = document.createElement("div");
    tip.className = "tip"; tip.setAttribute("aria-hidden", "true");
    wrap.style.position = "relative"; wrap.appendChild(tip);
    const secOf = el => el.dataset.section || (el.closest("[data-section]") || {}).dataset?.section || "";
    // artist facades: <g class="fl" data-section data-floor> wraps .fl-hit + per-apartment .apt paths
    let floors = $$("g.fl[data-floor]", wrap);
    if (!floors.length) floors = $$("[data-floor]", wrap).filter(el => !/^(text|tspan)$/i.test(el.tagName));
    const aptStatus = statsEl && statsEl.dataset.apts ? JSON.parse(statsEl.dataset.apts) : {};
    $$(".apt[data-apt]", wrap).forEach(p => { const st = aptStatus[p.dataset.apt]; if (st) p.classList.add("s-" + st, "is-" + ({ free: "free", booked: "reserved", sold: "sold" })[st]); });
    const secName = s => EN ? "Building " + s : "Секція " + ({ A: "А", B: "Б" }[s] || s);
    floors.forEach(el => {
      const sec = secOf(el).toUpperCase(), fl = parseInt(el.dataset.floor, 10);
      const st = (stats[sec] || {})[fl];
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "link");
      if (!st) {
        el.classList.add("is-empty");
        el.setAttribute("aria-label", `${secName(sec)}, ${fl} ${T("поверх: лобі та комерція", "floor: lobby and retail")}`);
      } else {
        el.setAttribute("aria-label", `${secName(sec)}, ${fl} ${T("поверх", "floor")}: ${st.free} ${T("вільних", "available")}`);
      }
      const show = () => {
        floors.forEach(f => f.classList.remove("is-hover"));
        // highlight every shape of this floor (some facades draw one floor as several paths)
        floors.filter(f => f.dataset.floor === el.dataset.floor && secOf(f).toUpperCase() === sec).forEach(f => f.classList.add("is-hover"));
        if (!st) {
          tip.className = "tip empty show";
          tip.innerHTML = `<div class="tip-top"><span class="tip-floor">${fl}<small>${T("поверх", "floor")}</small></span><span class="tip-sec">${secName(sec)}</span></div><dl><dt>${T("Лобі, аптека, пекарня", "Lobby, pharmacy, bakery")}</dt><dd></dd></dl><div class="tip-go">${T("Квартир на цьому поверсі немає", "No apartments on this floor")}</div>`;
          return;
        }
        tip.className = "tip show";
        const rooms = st.rooms.map(r => r === 0 ? T("ст.", "st.") : r).join(" · ") || "—";
        tip.innerHTML = `<div class="tip-top"><span class="tip-floor">${fl}<small>${T("поверх", "floor")}</small></span><span class="tip-sec">${secName(sec)}</span></div>
          <dl><dt>${T("Вільні", "Available")}</dt><dd class="tip-free">${st.free} ${T("з", "of")} ${st.free + st.booked + st.sold}</dd>
          ${st.from ? `<dt>${T("Ціна від", "From")}</dt><dd>${uah(st.from)}</dd><dt>${T("За м² від", "Per m² from")}</dt><dd>${uah(st.ppm_from)}</dd><dt>${T("Кімнат", "Rooms")}</dt><dd>${rooms}</dd>` : `<dt>${T("Бронь", "Reserved")}</dt><dd>${st.booked}</dd>`}</dl>
          <div class="tip-go">${st.free ? T("Натисніть, щоб відкрити план поверху →", "Click to open the floor plan →") : T("Вільних немає. План — за кліком", "Nothing available. Click for the plan")}</div>`;
      };
      const hide = () => { el.classList.remove("is-hover"); floors.forEach(f => f.classList.remove("is-hover")); tip.classList.remove("show"); };
      const go = () => { if (st) location.href = `${base}/${sec}/${fl}`; };
      el.addEventListener("mouseenter", e => { show(); placeTip(tip, wrap, e); });
      el.addEventListener("mousemove", e => placeTip(tip, wrap, e));
      el.addEventListener("mouseleave", hide);
      el.addEventListener("focus", () => { show(); placeTipAt(tip, wrap, el); });
      el.addEventListener("blur", hide);
      el.addEventListener("click", go);
      el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
  });

  // ---------- floor plan ----------
  const aptMap = root => {
    const by = {};
    $$(".floor-json i", root).forEach(i => { by[i.dataset.code] = i.dataset; by["pos:" + i.dataset.pos] = i.dataset; });
    return by;
  };
  const findApt = (el, by) => {
    const v = el.dataset.apt || el.dataset.code || "";
    if (by[v]) return by[v];
    const pos = el.dataset.aptPosition || el.dataset.pos || el.dataset.position || (/^\d+$/.test(v) ? v : (v.match(/-(\d+)$/) || [])[1]);
    return pos ? by["pos:" + parseInt(pos, 10)] : null;
  };
  $$("[data-floor-plan]").forEach(stage => {
    const by = aptMap(stage.parentElement);
    const tip = $(".tip", stage);
    const shapes = $$("[data-apt], [data-pos], [data-position], [data-apt-position]", stage)
      .filter(el => !el.closest(".floor-json") && !/^(text|tspan|g)$/i.test(el.tagName));
    shapes.forEach(el => {
      const a = findApt(el, by);
      if (!a) return;
      el.classList.add("apt-" + a.status, "is-" + ({ free: "free", booked: "reserved", sold: "sold" })[a.status]);
      el.setAttribute("tabindex", a.status === "sold" ? "-1" : "0");
      el.setAttribute("role", "link");
      el.setAttribute("aria-label", `№ ${a.num}, ${a.title}, ${a.area} м², ${a.statusLabel}`);
      const row = $(`[data-row="${a.code}"]`);
      const on = () => {
        el.classList.add("is-hover"); row && row.classList.add("is-hover");
        tip.className = "tip show";
        tip.innerHTML = `<div class="tip-top"><span class="tip-floor">${a.title}</span><span class="tip-sec">№ ${a.num}</span></div>
          <dl><dt>${T("Площа", "Area")}</dt><dd>${a.area} м²</dd><dt>${T("Вікна", "Windows")}</dt><dd>${a.win}</dd>
          <dt>${T("Ціна", "Price")}</dt><dd>${a.price}</dd>${a.status !== "sold" ? `<dt>${T("За м²", "Per m²")}</dt><dd>${a.ppm}</dd>` : ""}</dl>
          <div class="tip-go">${a.status === "free" ? T("Відкрити квартиру →", "Open apartment →") : a.status === "booked" ? T("У броні · відкрити →", "Reserved · open →") : T("Продана", "Sold")}</div>`;
      };
      const off = () => { el.classList.remove("is-hover"); row && row.classList.remove("is-hover"); tip.classList.remove("show"); };
      el.addEventListener("mouseenter", e => { on(); placeTip(tip, stage, e); });
      el.addEventListener("mousemove", e => placeTip(tip, stage, e));
      el.addEventListener("mouseleave", off);
      el.addEventListener("focus", () => { on(); placeTipAt(tip, stage, el); });
      el.addEventListener("blur", off);
      const go = () => { if (a.status !== "sold") location.href = a.url; };
      el.addEventListener("click", go);
      el.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
      if (row) {
        row.addEventListener("mouseenter", () => el.classList.add("is-hover"));
        row.addEventListener("mouseleave", () => el.classList.remove("is-hover"));
      }
    });
  });
  // mini floor on the apartment page
  $$("[data-mini-floor]").forEach(box => {
    const code = box.dataset.miniFloor, pos = box.dataset.pos;
    $$("[data-apt], [data-pos], [data-position], [data-apt-position]", box).forEach(el => {
      if (/^(text|tspan|g)$/i.test(el.tagName)) return;
      const v = el.dataset.apt || "";
      const p = el.dataset.aptPosition || el.dataset.pos || el.dataset.position || (/^\d+$/.test(v) ? v : (v.match(/-(\d+)$/) || [])[1]);
      if (v === code || String(parseInt(p, 10)) === pos) el.classList.add("apt-current");
    });
  });

  // ---------- catalog filters (URL state) ----------
  const form = $("[data-filters]");
  if (form) {
    const results = $("[data-results]"), found = $("[data-found]");
    const sortSel = $("select[name=sort]");
    let timer, ctrl;
    const query = () => {
      const fd = new FormData(form);
      if (sortSel) fd.set("sort", sortSel.value);
      const p = new URLSearchParams();
      for (const [k, v] of fd) {
        if (v === "" || (k === "sort" && v === "price_asc") || (k === "view" && v === "table")) continue;
        p.append(k, /_(min|max)$/.test(k) ? String(v).replace(/[\s\u202f]/g, "") : v);
      }
      // drop range values equal to the bounds — keeps URLs short and honest
      $$("[data-range]", form).forEach(g => {
        const k = g.dataset.range;
        if (p.get(k + "_min") === g.dataset.min) p.delete(k + "_min");
        if (p.get(k + "_max") === g.dataset.max) p.delete(k + "_max");
      });
      if (p.getAll("status").length === 1 && p.get("status") === "free") p.delete("status");
      return p;
    };
    const run = () => {
      const p = query();
      const qs = p.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
      ctrl && ctrl.abort(); ctrl = new AbortController();
      results.classList.add("loading");
      fetch(location.pathname + "?" + qs, { headers: { "X-Requested-With": "fetch" }, signal: ctrl.signal })
        .then(r => r.json()).then(j => {
          results.innerHTML = j.html; results.classList.remove("loading");
          const n = j.count, tpl = plural(n, found.dataset.one, found.dataset.few, found.dataset.many);
          found.innerHTML = tpl.replace("{n}", `<b>${n}</b>`);
        }).catch(() => {});
    };
    const later = (ms = 220) => { clearTimeout(timer); timer = setTimeout(run, ms); };
    form.addEventListener("change", e => { if (!e.target.matches("[type=range]")) later(60); });
    sortSel && sortSel.addEventListener("change", () => later(0));
    form.addEventListener("submit", e => { e.preventDefault(); run(); });

    // double range sliders
    $$("[data-range]", form).forEach(g => {
      const [lo, hi] = [$("[data-lo]", g), $("[data-hi]", g)];
      const [inLo, inHi] = $$(".range-vals input", g);
      const fill = $(".fill", g);
      const min = +g.dataset.min, max = +g.dataset.max;
      const paint = () => {
        const a = (+lo.value - min) / (max - min) * 100, b = (+hi.value - min) / (max - min) * 100;
        fill.style.left = a + "%"; fill.style.width = (b - a) + "%";
      };
      const fromSlider = which => {
        if (+lo.value > +hi.value) { if (which === lo) hi.value = lo.value; else lo.value = hi.value; }
        const show = v => g.dataset.range === "price" ? fmt(v) : v;
        inLo.value = +lo.value === min ? "" : show(lo.value); inHi.value = +hi.value === max ? "" : show(hi.value);
        paint(); later();
      };
      lo.addEventListener("input", () => fromSlider(lo));
      hi.addEventListener("input", () => fromSlider(hi));
      [inLo, inHi].forEach(inp => inp.addEventListener("change", () => {
        const v = inp.value.replace(/[^\d.,]/g, "").replace(",", ".");
        inp.value = v && g.dataset.range === "price" ? fmt(v) : v;
        (inp === inLo ? lo : hi).value = v || (inp === inLo ? min : max); paint();
      }));
      paint();
    });
    // view toggle
    $$("[data-view]").forEach(a => a.addEventListener("click", e => {
      e.preventDefault();
      form.querySelector("[name=view]").value = a.dataset.view;
      $$("[data-view]").forEach(b => b.classList.toggle("on", b === a));
      run();
    }));
    const reset = $("[data-reset]", form);
    reset && reset.addEventListener("click", e => {
      e.preventDefault();
      $$("input[type=checkbox]", form).forEach(c => { c.checked = c.name === "status" && c.value === "free"; });
      $$(".range-vals input", form).forEach(i => (i.value = ""));
      $$("[data-range]", form).forEach(g => { $("[data-lo]", g).value = g.dataset.min; $("[data-hi]", g).value = g.dataset.max; $("[data-lo]", g).dispatchEvent(new Event("input")); });
      run();
    });
    const ft = $(".filters-toggle");
    ft && ft.addEventListener("click", () => { const o = form.classList.toggle("open"); ft.setAttribute("aria-expanded", o); });
  }

  // ---------- payment calculator ----------
  $$("[data-calc]").forEach(box => {
    const terms = JSON.parse($(".calc-terms", box).textContent);
    let plan = "i12";
    const priceIn = $("#calc-price", box), priceRange = $("[data-price-range]", box);
    const first = $("[data-first]", box), down = $("[data-down]", box), years = $("[data-years]", box);
    const out = k => $(`[data-out="${k}"]`, box);
    const sched = box.nextElementSibling && box.nextElementSibling.matches("[data-schedule]") ? box.nextElementSibling : null;
    const setP = el => el && el.style.setProperty("--p", ((el.value - el.min) / (el.max - el.min) * 100) + "%");
    const price = () => Math.min(100e6, Math.max(100e3, parseInt(priceIn.value.replace(/\D/g, ""), 10) || +box.dataset.price));
    const set = (k, v) => { const el = out(k); if (el) el.textContent = v; };
    const row = (k, show) => { const dt = $(`[data-row="${k}"]`, box); if (dt) { dt.hidden = !show; dt.nextElementSibling.hidden = !show; } };
    const annuity = (p, rate, n) => rate === 0 ? p / n : p * (rate / 12) / (1 - Math.pow(1 + rate / 12, -n));
    let last = {};
    const calc = () => {
      const P = price();
      $$("[data-show]", box).forEach(el => { el.hidden = !el.dataset.show.split(" ").includes(plan); });
      let r;
      if (plan === "full") {
        const disc = Math.round(P * terms.full_discount);
        r = { total: P - disc, first: P - disc, monthly: 0, months: 0, adj: -disc, over: 0, rate: null };
        set("main-label", T("До сплати одразу", "Pay now"));
      } else if (plan === "i12" || plan === "i24") {
        const m = plan === "i12" ? 12 : 24, t = terms.installment[String(m)];
        first.min = Math.round(t.min_first * 100);
        if (+first.value < +first.min) first.value = first.min;
        const total = Math.round(P * (1 + t.markup)), f = Math.round(total * first.value / 100);
        const monthly = Math.ceil((total - f) / m);
        r = { total, first: f, monthly, months: m, adj: total - P, over: total - P, rate: null };
        set("first-pct", first.value + " %"); set("first-min", first.min + " %");
        set("main-label", T(`Щомісяця, ${m} міс.`, `Monthly, ${m} months`));
      } else {
        const prog = $("input[name=calc-program]:checked", box).value, t = terms.mortgage[prog];
        const n = +years.value * 12, d = Math.round(P * down.value / 100);
        const monthly = Math.ceil(annuity(P - d, t.rate, n));
        r = { total: d + monthly * n, first: d, monthly, months: n, adj: 0, over: d + monthly * n - P, rate: t.rate };
        set("down-pct", down.value + " %");
        set("years", years.value + " " + T(plural(+years.value, "рік", "роки", "років"), +years.value === 1 ? "year" : "years"));
        set("main-label", T(`Щомісяця, ${years.value} ${plural(+years.value, "рік", "роки", "років")}`, `Monthly, ${years.value} years`));
      }
      set("main", fmt(plan === "full" ? r.total : r.monthly));
      set("price", uah(P));
      set("adj", r.adj ? (r.adj > 0 ? "+" : "−") + uah(Math.abs(r.adj)) : "0 ₴");
      out("adj").classList.toggle("pos", r.adj < 0);
      set("first", uah(r.first));
      set("monthly", r.monthly ? uah(r.monthly) + " × " + r.months : "—");
      set("rate", r.rate === null ? "—" : (r.rate * 100).toFixed(0) + " % " + T("річних", "p.a."));
      row("rate", plan === "mortgage"); row("monthly", plan !== "full"); row("adj", plan !== "mortgage");
      set("total", uah(r.total));
      const tot = Math.max(r.total, 1);
      $("[data-bar=first]", box).style.flexGrow = r.first / tot;
      $("[data-bar=rest]", box).style.flexGrow = Math.max(0, r.total - r.first - Math.max(r.over, 0)) / tot;
      $("[data-bar=over]", box).style.flexGrow = Math.max(r.over, 0) / tot;
      [first, down, years, priceRange].forEach(setP);
      last = { plan, months: r.months, first_pct: plan === "mortgage" ? down.value : first.value, monthly: r.monthly, program: plan === "mortgage" ? $("input[name=calc-program]:checked", box).value : "", years: plan === "mortgage" ? years.value : "", price: P };
      if (sched) schedule(r, P);
    };
    const schedule = (r, P) => {
      const head = $("[data-out=sched-head]", sched), body = $("[data-out=sched-body]", sched);
      const d0 = new Date();
      const md = i => { const d = new Date(d0.getFullYear(), d0.getMonth() + i, Math.min(d0.getDate(), 28)); return d.toLocaleDateString(EN ? "en-GB" : "uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" }); };
      if (plan === "full") {
        head.innerHTML = `<tr><th>${T("Дата", "Date")}</th><th>${T("Платіж", "Payment")}</th><th class="r">${T("Сума", "Amount")}</th></tr>`;
        body.innerHTML = `<tr><td>${md(0)}</td><td>${T("Повна оплата зі знижкою", "Full payment, discounted")}</td><td class="r">${uah(r.total)}</td></tr>`;
      } else if (plan !== "mortgage") {
        head.innerHTML = `<tr><th>№</th><th>${T("Дата", "Date")}</th><th class="r">${T("Платіж", "Payment")}</th><th class="r">${T("Залишок", "Balance")}</th></tr>`;
        let bal = r.total - r.first, rows = `<tr><td>0</td><td>${md(0)}</td><td class="r">${uah(r.first)}</td><td class="r">${uah(bal)}</td></tr>`;
        for (let i = 1; i <= r.months; i++) { const p = Math.min(r.monthly, bal); bal -= p; rows += `<tr><td>${i}</td><td>${md(i)}</td><td class="r">${uah(p)}</td><td class="r">${uah(Math.max(bal, 0))}</td></tr>`; }
        body.innerHTML = rows;
      } else {
        const t = terms.mortgage[$("input[name=calc-program]:checked", box).value];
        head.innerHTML = `<tr><th>${T("Рік", "Year")}</th><th class="r">${T("Тіло", "Principal")}</th><th class="r">${T("Відсотки", "Interest")}</th><th class="r">${T("Залишок боргу", "Balance")}</th></tr>`;
        let bal = P - r.first, rows = "";
        for (let y = 1; y <= r.months / 12; y++) {
          let pr = 0, it = 0;
          for (let m = 0; m < 12; m++) { const i = bal * t.rate / 12; const p = Math.min(r.monthly - i, bal); it += i; pr += p; bal -= p; }
          rows += `<tr><td>${d0.getFullYear() + y - 1}</td><td class="r">${uah(pr)}</td><td class="r">${uah(it)}</td><td class="r">${uah(Math.max(bal, 0))}</td></tr>`;
        }
        body.innerHTML = rows;
      }
    };
    $$(".calc-tabs button", box).forEach(b => b.addEventListener("click", () => {
      plan = b.dataset.plan;
      $$(".calc-tabs button", box).forEach(x => x.setAttribute("aria-selected", x === b));
      if (plan === "i24" && +first.value < 40) first.value = 40;
      calc();
    }));
    [first, down, years].forEach(el => el && el.addEventListener("input", calc));
    $$("input[name=calc-program]", box).forEach(el => el.addEventListener("change", calc));
    if (priceRange) priceRange.addEventListener("input", () => { priceIn.value = fmt(priceRange.value); calc(); });
    priceIn.addEventListener("input", () => { const v = priceIn.value.replace(/\D/g, ""); priceIn.value = v ? fmt(v) : ""; if (priceRange && v) priceRange.value = v; calc(); });
    const send = $("[data-calc-send]", box);
    send && send.addEventListener("click", () => openDrawer("calc", T("Розрахунок від менеджера", "Get a quote"),
      T(`Надішлемо розрахунок з датами платежів і зателефонуємо, щоб уточнити умови. Ваш варіант: ${$(".calc-tabs [aria-selected=true] b", box).textContent}, ${uah(last.monthly || last.price)}.`,
        `We'll send the schedule and call to confirm terms. Your option: ${$(".calc-tabs [aria-selected=true] b", box).textContent}.`), last));
    calc();
  });

  // ---------- drawer ----------
  const drawer = $("#drawer");
  let lastFocus;
  function openDrawer(kind, title, lead, payload) {
    if (!drawer) return;
    lastFocus = document.activeElement;
    $$("[data-drawer-form]", drawer).forEach(f => (f.hidden = f.dataset.drawerForm !== kind));
    $("#drawer-title").textContent = title || "";
    $("#drawer-lead").textContent = lead || "";
    const f = $(`[data-drawer-form="${kind}"] form`, drawer);
    if (f && payload) {
      $$("input[data-payload]", f).forEach(i => i.remove());
      Object.entries(payload).forEach(([k, v]) => { if (v === "" || v === undefined) return; const i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = v; i.dataset.payload = 1; f.appendChild(i); });
    }
    drawer.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => { const first = f && $("input[name=name]", f); first && first.focus(); }, 60);
  }
  const closeDrawer = () => { if (!drawer) return; drawer.classList.remove("open"); document.body.style.overflow = ""; lastFocus && lastFocus.focus(); };
  $$("[data-open]").forEach(b => b.addEventListener("click", () => openDrawer(b.dataset.open, b.dataset.title, b.dataset.lead)));
  drawer && $$("[data-close]", drawer).forEach(b => b.addEventListener("click", closeDrawer));
  addEventListener("keydown", e => { if (e.key === "Escape" && drawer && drawer.classList.contains("open")) closeDrawer(); });

  // ---------- lead forms ----------
  const today = new Date(); const iso = d => d.toISOString().slice(0, 10);
  $$("[data-mindate]").forEach(i => { i.min = iso(today); const t = new Date(today); t.setDate(t.getDate() + (today.getDay() === 6 ? 2 : 1)); i.value = iso(t); });
  const PHONE = /^\+?[0-9 ()\-]{9,18}$/;
  $$("form[data-lead]").forEach(f => {
    const phone = $("input[name=phone]", f);
    f.addEventListener("submit", async e => {
      e.preventDefault();
      let ok = true;
      $$(".fld", f).forEach(x => x.classList.remove("invalid"));
      const name = $("input[name=name]", f);
      if (!name.value.trim() || name.value.trim().length < 2) { name.closest(".fld").classList.add("invalid"); ok = false; }
      const digits = phone.value.replace(/\D/g, "");
      if (!PHONE.test(phone.value.trim()) || digits.length < 10) { phone.closest(".fld").classList.add("invalid"); ok = false; }
      const msg = $(".form-msg", f); msg.textContent = "";
      if (!ok) { $(".invalid input", f).focus(); return; }
      const btn = $("button[type=submit]", f); btn.classList.add("loading");
      const slot = $("input[name=slot]:checked", f);
      const fd = new FormData(f);
      if (slot && fd.get("visit_date")) fd.set("message", (T("Час: ", "Time: ") + slot.value + ". " + (fd.get("message") || "")).trim());
      try {
        const r = await fetch(f.action, { method: "POST", body: new URLSearchParams(fd), headers: { "X-Requested-With": "fetch" } });
        const j = await r.json();
        if (j.ok) { f.classList.add("sent"); }
        else if (j.errors) { Object.keys(j.errors).forEach(k => { const i = $(`[name=${k}]`, f); i && i.closest(".fld") && i.closest(".fld").classList.add("invalid"); }); msg.textContent = Object.values(j.errors).join(" "); }
        else msg.textContent = j.error || T("Не вдалося надіслати. Зателефонуйте нам.", "Could not send. Please call us.");
      } catch (_) { msg.textContent = T("Немає звʼязку. Спробуйте ще раз.", "No connection. Try again."); }
      btn.classList.remove("loading");
    });
  });

  // ---------- print ----------
  $$("[data-print]").forEach(b => b.addEventListener("click", () => print()));
})();
