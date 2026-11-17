/* Shared helpers for the public site */
(function () {
  const cfg = window.SITE_CONFIG || {};
  const configured =
    !!cfg.supabaseUrl && !cfg.supabaseUrl.startsWith("YOUR") &&
    !!cfg.supabaseAnonKey && !cfg.supabaseAnonKey.startsWith("YOUR");

  const sb = configured && window.supabase
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;

  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const fmtPrice = (p) =>
    p == null || p === "" ? "Price on request" : `${cfg.currency || ""} ${Number(p).toLocaleString()}`.trim();

  const fmtKm = (m) => (m == null || m === "" ? "" : `${Number(m).toLocaleString()} km`);

  const icons = {
    engine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h2l2-3h6l2 3h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2l-2 2H8l-2-2H4z"/><path d="M9 7V5h6v2"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="6" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v10M12 7v10M18 7v5H6"/></svg>',
    road: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 12l5-5"/><circle cx="12" cy="12" r="1.2"/></svg>',
    fuel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M3 21h12M6 9h6"/><path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    car: '<svg viewBox="0 0 64 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22v-4c0-1.5 1-2.6 2.4-3l7.6-2 7-6c1-.8 2.2-1 3.4-1h14c1.4 0 2.6.6 3.5 1.6L47 12l9 2c2 .5 4 2.2 4 4.5V22a2 2 0 0 1-2 2h-3"/><path d="M9 24H4M21 24h22"/><circle cx="15" cy="24" r="4"/><circle cx="49" cy="24" r="4"/><path d="M22 12h24"/></svg>',
  };

  const placeholder = `<div class="img-ph">${icons.car}</div>`;

  /* ---------- Stock taken from the Rawalpindi K LTD Facebook page ----------
     Shown until Supabase is connected. After that, add cars in the admin panel. */
  const imgs = (slug, n) => Array.from({ length: n }, (_, i) => `assets/cars/${slug}-${i + 1}.jpg`);
  const demoCars = [
    { id: "land-cruiser-2015", make: "Toyota", model: "Land Cruiser", year: 2015, mileage: 75000, body_type: "SUV", color: "White Pearl",
      description: "Fully loaded.\nLocation: Moi Avenue, Mombasa.", images: imgs("land-cruiser", 3), created_at: "2022-10-05T02:25:00Z" },
    { id: "axio-2015", make: "Toyota", model: "Axio", year: 2015, transmission: "Automatic", fuel: "Petrol", body_type: "Sedan", color: "Silver",
      description: "Location: Moi Avenue, Mombasa.", images: imgs("axio", 9), created_at: "2022-09-24T10:47:00Z" },
    { id: "cx5-2014", make: "Mazda", model: "CX-5", year: 2014, mileage: 97000, transmission: "Automatic", fuel: "Diesel", body_type: "SUV", color: "Dark Blue",
      description: "Neat and clean.\nLocation: Moi Avenue, Mombasa.", images: imgs("cx5", 6), created_at: "2022-09-24T10:33:00Z" },
    { id: "x-trail-2015", make: "Nissan", model: "X-Trail", year: 2015, mileage: 145000, body_type: "SUV", drive: "4WD", color: "Pearl White",
      description: "Japan surplus, bought from the importer.\nLocation: Moi Avenue, Mombasa.", images: imgs("xtrail", 7), created_at: "2022-09-23T11:47:00Z" },
  ].map((c) => ({ status: "available", price: null, cover_image: null, ...c }));

  async function fetchCars() {
    if (!sb) return demoCars;
    const { data, error } = await sb.from("cars").select("*").eq("published", true).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function fetchCar(id) {
    if (!sb) return demoCars.find((c) => c.id === id) || null;
    const { data, error } = await sb.from("cars").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  }

  /* ---------- Loader: shown for ~2s, then fades out ---------- */
  function initLoader(minMs = 2000) {
    const el = document.getElementById("loader");
    if (!el) return Promise.resolve();
    return new Promise((resolve) => {
      setTimeout(() => {
        el.classList.add("done");
        document.body.classList.remove("is-loading");
        setTimeout(() => { el.remove(); resolve(); }, 700);
      }, minMs);
    });
  }

  /* ---------- Nav: solid on scroll + mobile menu ---------- */
  function initNav() {
    const nav = document.querySelector(".nav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const btn = nav.querySelector(".nav-toggle");
    btn?.addEventListener("click", () => nav.classList.toggle("open"));
    nav.querySelectorAll(".nav-links a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("open")));
  }

  /* ---------- Scroll reveal ---------- */
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" })
    : null;
  function reveal(root = document) {
    root.querySelectorAll(".reveal:not(.in)").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
  }

  /* ---------- Brand + contact fill-ins ---------- */
  function fillBrand() {
    document.querySelectorAll("[data-brand]").forEach((el) => (el.textContent = cfg.brand || ""));
    document.querySelectorAll("[data-brand-sub]").forEach((el) => (el.textContent = cfg.brandSub || ""));
    document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
    const enquire = waLink(`Hi ${cfg.brand}, I'd like to enquire about your cars.`);
    document.querySelectorAll("[data-enquire]").forEach((a) => {
      if (enquire) { a.href = enquire; a.target = "_blank"; a.rel = "noopener"; }
    });

    // Hidden admin entry: tap the footer logo 3 times quickly
    document.querySelectorAll(".footer-logo, .footer .nb-text").forEach((el) => {
      let taps = 0, timer;
      el.addEventListener("click", () => {
        taps++;
        clearTimeout(timer);
        if (taps >= 3) { taps = 0; location.href = "admin/index.html"; return; }
        timer = setTimeout(() => (taps = 0), 900);
      });
    });

    const list = document.getElementById("contact-list");
    if (list) {
      const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d.map((p) => `<path d="${p}"/>`).join("")}</svg>`;
      const ic = {
        phone: svg(["M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2"]),
        whatsapp: svg(["M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9", "M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"]),
        mail: svg(["M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z", "M3 7l9 6l9 -6"]),
        pin: svg(["M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0", "M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z"]),
        clock: svg(["M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0", "M12 7v5l3 3"]),
        facebook: svg(["M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3"]),
        instagram: svg(["M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z", "M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0", "M16.5 7.5v.01"]),
      };
      const tel = (p) => `tel:${p.replace(/\s/g, "")}`;
      const acts = [];
      if (cfg.phone) acts.push(["phone", "Call", cfg.phone, tel(cfg.phone)]);
      if (cfg.phone2) acts.push(["phone", "Call 2", cfg.phone2, tel(cfg.phone2)]);
      if (cfg.whatsapp) acts.push(["whatsapp", "WhatsApp", "Chat with us", waLink("")]);
      if (cfg.email) acts.push(["mail", "Email", cfg.email, `mailto:${cfg.email}`]);
      if (cfg.facebook) acts.push(["facebook", "Facebook", "Follow us", cfg.facebook]);
      if (cfg.instagram) acts.push(["instagram", "Instagram", "Follow us", cfg.instagram]);

      const loc = cfg.address ? `
        <a class="cc-loc" href="https://maps.google.com/?q=${encodeURIComponent(cfg.mapQuery || cfg.address)}" target="_blank" rel="noopener">
          <span class="cc-ic">${ic.pin}</span>
          <span class="cc-txt">
            <small>Showroom</small>
            <b>${esc(cfg.address)}</b>
            ${cfg.hours ? `<span class="cc-hours">${ic.clock}${esc(cfg.hours)}</span>` : ""}
            <em>Get directions ${icons.arrow}</em>
          </span>
        </a>` : "";
      const actions = acts.length ? `
        <div class="cc-actions">${acts.map(([i, k, v, href]) => `
          <a class="cc-act cc-${i}" href="${esc(href)}"${/^https?:/.test(href) ? ` target="_blank" rel="noopener"` : ""} aria-label="${esc(k)}: ${esc(v)}">
            <span class="cc-ic">${ic[i]}</span>
            <span class="cc-txt"><small>${esc(k)}</small><b>${esc(v)}</b></span>
          </a>`).join("")}
        </div>` : "";
      list.innerHTML = loc || actions
        ? `<div class="contact-card reveal${loc ? "" : " no-loc"}">${loc}${actions}</div>`
        : `<p class="muted">Contact details coming soon.</p>`;
    }
  }

  function waLink(text) {
    if (!cfg.whatsapp) return "";
    return `https://wa.me/${cfg.whatsapp.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  }

  function carTitle(c) {
    return `${c.make || ""} ${c.model || ""}`.trim();
  }

  window.COB = { cfg, sb, configured, esc, fmtPrice, fmtKm, icons, placeholder, fetchCars, fetchCar, initLoader, initNav, reveal, fillBrand, waLink, carTitle };
})();
