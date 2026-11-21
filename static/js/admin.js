// Admin: inline lead status / note, inline apartment status / price, chart tooltips. No dependencies.
(() => {
  const csrf = () => (document.getElementById("csrf") || document.querySelector("input[name=_csrf]") || {}).value || "";
  const toastEl = document.querySelector(".toast");
  let toastT;
  const toast = (msg, bad) => {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.toggle("bad", !!bad); toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 2200);
  };
  const post = async (url, data) => {
    const body = new URLSearchParams({ _csrf: csrf(), ...data });
    const r = await fetch(url, { method: "POST", body, headers: { "X-Requested-With": "fetch" } });
    const j = await r.json().catch(() => ({ ok: false, error: "Помилка мережі" }));
    if (!r.ok || !j.ok) throw new Error(j.error || "Не вдалося зберегти");
    return j;
  };
  const LEAD_ORDER = ["new", "work", "viewing", "booking", "closed"];
  const canMove = (a, b) => { const i = LEAD_ORDER.indexOf(a), j = LEAD_ORDER.indexOf(b); return a !== b && (b === "closed" || Math.abs(i - j) === 1); };

  // lead status
  document.querySelectorAll(".st-select").forEach(sel => {
    sel.addEventListener("change", async () => {
      const prev = sel.dataset.current, next = sel.value;
      try {
        const j = await post(sel.form.action, { status: next });
        sel.dataset.current = next;
        sel.className = "st-select st-" + next;
        [...sel.options].forEach(o => { o.disabled = o.value !== next && !canMove(next, o.value); });
        toast("Статус: " + j.label + (j.booked_until ? " · квартиру заброньовано до " + j.booked_until.split("-").reverse().slice(0, 2).join(".") : ""));
        sel.closest("tr").classList.add("saved");
        setTimeout(() => sel.closest("tr").classList.remove("saved"), 1300);
      } catch (e) { sel.value = prev; toast(e.message, true); }
    });
  });
  // manager note
  document.querySelectorAll(".note-in").forEach(inp => {
    let orig = inp.value;
    const save = async () => {
      if (inp.value === orig) return;
      try { await post(inp.dataset.note, { note: inp.value }); orig = inp.value; toast("Нотатку збережено"); }
      catch (e) { toast(e.message, true); }
    };
    inp.addEventListener("blur", save);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); inp.blur(); } });
  });

  // apartments inline edit
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const updTotals = t => {
    if (!t) return;
    const box = document.querySelector("[data-totals]");
    if (!box) return;
    box.querySelector("[data-t=free]").textContent = t.free;
    box.querySelector("[data-t=booked]").textContent = t.booked;
    box.querySelector("[data-t=sold]").textContent = t.sold;
    box.querySelector("[data-t=potential]").textContent = (t.potential / 1e6).toFixed(1).replace(".", ",");
  };
  document.querySelectorAll("tr[data-apt]").forEach(tr => {
    const url = tr.dataset.url;
    const sel = tr.querySelector(".ast-select");
    const price = tr.querySelector(".price-in");
    let prevStatus = sel.value;
    sel.addEventListener("change", async () => {
      try {
        const j = await post(url, { status: sel.value });
        prevStatus = sel.value; sel.className = "ast-select ast-" + j.status;
        tr.querySelector("[data-until]").textContent = j.booked_until && j.status === "booked" ? j.booked_until.split("-").reverse().slice(0, 2).join(".") : "";
        updTotals(j.t); toast("Статус квартири оновлено");
        tr.classList.add("saved"); setTimeout(() => tr.classList.remove("saved"), 1300);
      } catch (e) { sel.value = prevStatus; toast(e.message, true); }
    });
    const savePrice = async () => {
      const raw = price.value.replace(/[^\d]/g, "");
      if (!raw || raw === price.dataset.orig) { price.value = fmt(price.dataset.orig); return; }
      try {
        const j = await post(url, { price: raw });
        price.dataset.orig = String(j.price); price.value = fmt(j.price);
        tr.querySelector("[data-ppm]").textContent = j.ppm_fmt.replace(/\s₴$/, "").replace(" ₴", "");
        price.classList.remove("err-cell"); updTotals(j.t); toast("Ціну збережено: " + j.price_fmt);
        tr.classList.add("saved"); setTimeout(() => tr.classList.remove("saved"), 1300);
      } catch (e) { price.classList.add("err-cell"); toast(e.message, true); }
    };
    price.addEventListener("blur", savePrice);
    price.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); price.blur(); } if (e.key === "Escape") { price.value = fmt(price.dataset.orig); price.blur(); } });
  });

  // chart hover tooltips
  document.querySelectorAll(".panel").forEach(panel => {
    const tip = panel.querySelector(".chart-tip");
    if (!tip) return;
    panel.querySelectorAll("[data-tip]").forEach(el => {
      el.addEventListener("mouseenter", () => { tip.textContent = el.dataset.tip; tip.hidden = false; });
      el.addEventListener("mousemove", e => { const r = panel.getBoundingClientRect(); tip.style.left = (e.clientX - r.left) + "px"; tip.style.top = (e.clientY - r.top - 8) + "px"; });
      el.addEventListener("mouseleave", () => { tip.hidden = true; });
    });
  });
})();
