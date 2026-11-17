/* Home page: search filter + inventory grid */
(function () {
  const { esc, fmtPrice, fmtKm, icons, placeholder, fetchCars, initLoader, initNav, reveal, fillBrand } = window.COB;
  const $ = (id) => document.getElementById(id);

  const grid = $("grid"), empty = $("empty"), count = $("car-count");
  const chipsEl = $("chips"), searchEl = $("search"), sortEl = $("sort");
  const sel = { make: $("f-make"), model: $("f-model"), year: $("f-year"), color: $("f-color"), engine: $("f-engine") };
  const clearBtn = $("f-clear");

  let cars = [];
  let bodyFilter = "All";
  let brandFilter = "";
  const brandsEl = $("brands");
  const setBrand = (b) => {
    brandFilter = b;
    brandsEl.querySelectorAll(".brand").forEach((x) => x.classList.toggle("active", x.dataset.make === b));
  };

  fillBrand();
  initNav();
  const loaderDone = initLoader(2000);

  /* ---------- helpers ---------- */
  const norm = (v) => String(v ?? "").trim().toLowerCase();
  const title = (v) => String(v).trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Pull litres out of free-text engine field: "3.3L V6", "2500cc", "2.0 Turbo"
  function engineLitres(e) {
    const s = String(e || "");
    let m = s.match(/(\d+(?:\.\d+)?)\s*(?:l\b|ltr|litre|liter)/i);
    if (m) return +m[1];
    m = s.match(/(\d{3,4})\s*cc/i);
    if (m) return Math.round(+m[1] / 100) / 10;
    m = s.match(/(?:^|\s)(\d\.\d)(?:\s|$)/);
    return m ? +m[1] : null;
  }
  const ENGINE_BANDS = [
    { v: "0-1.5", label: "Up to 1.5L", lo: 0, hi: 1.5 },
    { v: "1.5-2", label: "1.6L – 2.0L", lo: 1.5, hi: 2.0 },
    { v: "2-3", label: "2.1L – 3.0L", lo: 2.0, hi: 3.0 },
    { v: "3-4", label: "3.1L – 4.0L", lo: 3.0, hi: 4.0 },
    { v: "4+", label: "Over 4.0L", lo: 4.0, hi: Infinity },
  ];
  const band = (l) => (l == null ? null : ENGINE_BANDS.find((b) => (b.lo === 0 ? l <= b.hi : l > b.lo && l <= b.hi)));

  function fillSelect(el, anyLabel, options, keep = true) {
    const prev = el.value;
    el.innerHTML = `<option value="">${anyLabel}</option>` +
      options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("");
    el.value = keep && options.some(([v]) => v === prev) ? prev : "";
    el.disabled = options.length === 0;
  }

  function distinct(list, key) {
    const map = new Map();
    list.forEach((c) => { const k = norm(c[key]); if (k && !map.has(k)) map.set(k, title(c[key])); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }

  function buildFilters() {
    fillSelect(sel.make, "Any make", distinct(cars, "make"));
    refreshModels();
    const years = [...new Set(cars.map((c) => c.year).filter(Boolean))].sort((a, b) => b - a);
    fillSelect(sel.year, "Any year", years.map((y) => [String(y), String(y)]));
    fillSelect(sel.color, "Any colour", distinct(cars, "color"));
    const used = new Set(cars.map((c) => band(engineLitres(c.engine))?.v).filter(Boolean));
    fillSelect(sel.engine, "Any size", ENGINE_BANDS.filter((b) => used.has(b.v)).map((b) => [b.v, b.label]));

    const types = [...new Set(cars.map((c) => c.body_type).filter(Boolean))].sort();
    chipsEl.innerHTML = types.length < 2 ? "" : ["All", ...types]
      .map((t) => `<button class="chip${t === bodyFilter ? " active" : ""}" data-t="${esc(t)}">${esc(t)}</button>`).join("");
  }

  function refreshModels() {
    const mk = sel.make.value;
    fillSelect(sel.model, "Any model", distinct(mk ? cars.filter((c) => norm(c.make) === mk) : cars, "model"));
  }

  function matches(c) {
    const f = Object.fromEntries(Object.entries(sel).map(([k, el]) => [k, el.value]));
    if (f.make && norm(c.make) !== f.make) return false;
    if (f.model && norm(c.model) !== f.model) return false;
    if (f.year && String(c.year) !== f.year) return false;
    if (f.color && norm(c.color) !== f.color) return false;
    if (f.engine && band(engineLitres(c.engine))?.v !== f.engine) return false;
    if (bodyFilter !== "All" && c.body_type !== bodyFilter) return false;
    if (brandFilter && !brandFilter.split("|").some((b) => norm(c.make).includes(b))) return false;
    const q = norm(searchEl.value);
    if (q && ![c.make, c.model, c.variant, c.year, c.body_type, c.fuel, c.transmission, c.color, c.engine]
      .filter(Boolean).join(" ").toLowerCase().includes(q)) return false;
    return true;
  }

  /* ---------- card ---------- */
  function card(c, i) {
    const img = c.cover_image || (c.images && c.images[0]);
    const specs = [
      c.engine && [icons.engine, c.engine],
      c.transmission && [icons.gear, c.transmission],
      c.mileage != null && c.mileage !== "" ? [icons.road, fmtKm(c.mileage)] : c.fuel && [icons.fuel, c.fuel],
    ].filter(Boolean).slice(0, 3);
    const badge = c.status && c.status !== "available"
      ? `<span class="badge badge-${esc(c.status)}">${esc(c.status)}</span>` : "";
    return `
      <a class="car-card reveal" style="--d:${(i % 4) * 70}ms" href="car.html?id=${encodeURIComponent(c.id)}">
        <div class="car-media">
          ${img ? `<img src="${esc(img)}" alt="${esc(`${c.year || ""} ${c.make} ${c.model}`)}" loading="lazy" />` : placeholder}
          ${badge}
        </div>
        <div class="car-body">
          <div class="car-meta">${esc([c.year, c.make].filter(Boolean).join(" · "))}</div>
          <h3 class="car-title">${esc(c.model)}${c.variant ? ` <span>${esc(c.variant)}</span>` : ""}</h3>
          <ul class="car-specs">${specs.map(([ic, t]) => `<li>${ic}<span>${esc(t)}</span></li>`).join("")}</ul>
          <div class="car-foot">
            <span class="price">${esc(fmtPrice(c.price))}</span>
            <span class="view">View ${icons.arrow}</span>
          </div>
        </div>
      </a>`;
  }

  /* ---------- render ---------- */
  function render() {
    const list = cars.filter(matches);
    const num = (v, d) => (v == null || v === "" ? d : Number(v));
    const sorters = {
      new: (a, b) => (b.featured - a.featured) || new Date(b.created_at) - new Date(a.created_at),
      "price-asc": (a, b) => num(a.price, Infinity) - num(b.price, Infinity),
      "price-desc": (a, b) => num(b.price, -1) - num(a.price, -1),
      "year-desc": (a, b) => num(b.year, 0) - num(a.year, 0),
      "km-asc": (a, b) => num(a.mileage, Infinity) - num(b.mileage, Infinity),
    };
    list.sort(sorters[sortEl.value] || sorters.new);
    list.sort((a, b) => (a.status === "sold") - (b.status === "sold")); // sold cars last

    grid.innerHTML = list.map(card).join("");
    empty.hidden = list.length > 0;
    empty.textContent = cars.length ? "No cars match your search." : "New stock arriving soon — check back shortly.";
    const filtered = list.length !== cars.length;
    count.textContent = filtered
      ? `${list.length} of ${cars.length} vehicles`
      : `${cars.length} ${cars.length === 1 ? "vehicle" : "vehicles"}`;

    const anyActive = Object.values(sel).some((el) => el.value) || searchEl.value.trim() || bodyFilter !== "All" || brandFilter;
    clearBtn.hidden = !anyActive;
    Object.values(sel).forEach((el) => el.closest(".f-field").classList.toggle("active", !!el.value));
    reveal(grid);
  }

  /* ---------- events ---------- */
  brandsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".brand");
    if (!b) return;
    setBrand(brandFilter === b.dataset.make ? "" : b.dataset.make);
    sel.make.value = ""; refreshModels();
    render();
    if (brandFilter) $("inventory").scrollIntoView({ behavior: "smooth" });
  });
  sel.make.addEventListener("change", () => { setBrand(""); refreshModels(); render(); });
  [sel.model, sel.year, sel.color, sel.engine].forEach((el) => el.addEventListener("change", render));
  $("finder").addEventListener("submit", (e) => {
    e.preventDefault();
    render();
    $("inventory").scrollIntoView({ behavior: "smooth" });
  });
  clearBtn.addEventListener("click", () => {
    Object.values(sel).forEach((el) => (el.value = ""));
    searchEl.value = "";
    bodyFilter = "All";
    setBrand("");
    refreshModels();
    chipsEl.querySelectorAll(".chip").forEach((x) => x.classList.toggle("active", x.dataset.t === "All"));
    render();
  });
  chipsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    bodyFilter = b.dataset.t;
    chipsEl.querySelectorAll(".chip").forEach((x) => x.classList.toggle("active", x === b));
    render();
  });
  searchEl.addEventListener("input", render);
  sortEl.addEventListener("change", render);

  fetchCars()
    .then((data) => { cars = data; buildFilters(); })
    .catch((err) => {
      console.error(err);
      grid.innerHTML = "";
      empty.textContent = "Couldn't load the inventory right now. Please try again shortly.";
      empty.hidden = false;
    })
    .finally(() => loaderDone.then(() => { if (cars.length || empty.hidden) render(); reveal(); }));
})();
