/* Single vehicle page */
(function () {
  const { cfg, esc, fmtPrice, fmtKm, placeholder, fetchCar, initNav, fillBrand, waLink, reveal } = window.COB;
  fillBrand();
  initNav();

  const root = document.querySelector(".car-layout");
  const id = new URLSearchParams(location.search).get("id");

  const notFound = () => {
    root.innerHTML = `<div class="not-found"><h1>Vehicle not found</h1><p class="muted">It may have been sold or removed.</p><a class="btn btn-red" href="index.html#inventory">See all cars</a></div>`;
  };

  if (!id) return notFound();

  const chev = (dir) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${dir < 0 ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}"/></svg>`;
  const gridIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h6v6h-6zM14 4h6v6h-6zM4 14h6v6h-6zM14 14h6v6h-6z"/></svg>`;

  fetchCar(id).then((c) => {
    if (!c) return notFound();
    const name = `${c.year ? c.year + " " : ""}${c.make} ${c.model}${c.variant ? " " + c.variant : ""}`;
    document.title = `${name} — ${cfg.brand} ${cfg.brandSub || ""}`.trim();

    const imgs = [...new Set([c.cover_image, ...(c.images || [])].filter(Boolean))];
    const specs = [
      ["Year", c.year], ["Mileage", fmtKm(c.mileage)], ["Engine", c.engine],
      ["Transmission", c.transmission], ["Fuel", c.fuel], ["Body type", c.body_type],
      ["Drive", c.drive], ["Colour", c.color],
    ].filter(([, v]) => v != null && v !== "");

    const msg = `Hi ${cfg.brand}, I'm interested in the ${name}${c.price ? ` (${fmtPrice(c.price)})` : ""}. Is it still available?\n${location.href}`;
    const wa = waLink(msg);
    const statusLabel = { available: "Available", reserved: "Reserved", sold: "Sold" }[c.status] || "";

    // Collage (desktop): up to 5 photos. Swiper (phones): every photo.
    const shown = imgs.slice(0, 5);
    const gallery = imgs.length ? `
      <div class="collage n${shown.length}">
        ${shown.map((u, i) => `
          <button type="button" class="cg" data-i="${i}" aria-label="Open photo ${i + 1}">
            <img src="${esc(u)}" alt="${i === 0 ? esc(name) : ""}" ${i ? 'loading="lazy"' : ""} />          </button>`).join("")}
        ${imgs.length > 1 ? `<button type="button" class="cg-all">${gridIcon} View all ${imgs.length} photos</button>` : ""}
      </div>
      <div class="swiper">
        <div class="sw-track">
          ${imgs.map((u, i) => `<div class="sw-slide" data-i="${i}"><img src="${esc(u)}" alt="${i === 0 ? esc(name) : ""}" ${i ? 'loading="lazy"' : ""} draggable="false" /></div>`).join("")}
        </div>
        ${imgs.length > 1 ? `
          <button type="button" class="sw-nav sw-prev" aria-label="Previous photo">${chev(-1)}</button>
          <button type="button" class="sw-nav sw-next" aria-label="Next photo">${chev(1)}</button>
          <span class="sw-count">1 / ${imgs.length}</span>` : ""}
      </div>` : `<div class="g-empty">${placeholder}</div>`;

    root.innerHTML = `
      <div class="gallery reveal">${gallery}</div>
      <aside class="car-info reveal" style="--d:120ms">
        <div class="ci-head">
          <span class="status status-${esc(c.status)}">${esc(statusLabel)}</span>
          <div class="car-meta">${esc(c.make)}</div>
          <h1 class="car-h1">${esc(c.model)}${c.variant ? ` <span>${esc(c.variant)}</span>` : ""}</h1>
          <div class="car-price">${esc(fmtPrice(c.price))}</div>
          <div class="cta-row">
            ${wa ? `<a class="btn btn-red" href="${esc(wa)}" target="_blank" rel="noopener">Enquire on WhatsApp</a>` : ""}
            ${cfg.phone ? `<a class="btn btn-ghost" href="tel:${esc(cfg.phone.replace(/\s/g, ""))}">Call ${esc(cfg.phone)}</a>` : ""}
            ${!wa && !cfg.phone ? `<a class="btn btn-red" href="index.html#contact">Contact us</a>` : ""}
          </div>
        </div>
        <dl class="spec-grid">
          ${specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}
        </dl>
        ${c.description ? `<div class="desc"><h3>About this car</h3><p>${esc(c.description).replace(/\n/g, "<br>")}</p></div>` : ""}
      </aside>`;
    reveal(root);
    if (imgs.length) initGallery(imgs, name);
  }).catch((e) => { console.error(e); notFound(); });

  function initGallery(imgs, name) {
    const lb = document.getElementById("lightbox");
    const lbImg = lb.querySelector("img");
    let cur = 0;

    /* ---- lightbox ---- */
    const lbCount = document.createElement("span");
    lbCount.className = "lb-count";
    lb.appendChild(lbCount);
    const lbShow = (i) => {
      cur = (i + imgs.length) % imgs.length;
      lbImg.src = imgs[cur];
      lbImg.alt = name;
      lbCount.textContent = `${cur + 1} / ${imgs.length}`;
    };
    const open = (i) => { lbShow(i); lb.hidden = false; document.body.style.overflow = "hidden"; };
    const close = () => { lb.hidden = true; document.body.style.overflow = ""; goTo(cur, false); };
    lb.querySelector(".lb-close").onclick = close;
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    lb.querySelector(".lb-prev").onclick = () => lbShow(cur - 1);
    lb.querySelector(".lb-next").onclick = () => lbShow(cur + 1);
    if (imgs.length < 2) { lb.querySelectorAll(".lb-nav").forEach((b) => (b.hidden = true)); lbCount.hidden = true; }
    document.addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") lbShow(cur - 1);
      if (e.key === "ArrowRight") lbShow(cur + 1);
    });
    // swipe inside the lightbox
    let sx = null, sy = 0;
    lb.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener("touchend", (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      sx = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) lbShow(cur + (dx < 0 ? 1 : -1));
    }, { passive: true });

    /* ---- collage ---- */
    root.querySelectorAll(".cg").forEach((b) => b.addEventListener("click", () => open(+b.dataset.i)));
    root.querySelector(".cg-all")?.addEventListener("click", () => open(0));

    /* ---- swiper (phones): native finger swipe via scroll-snap, plus arrows ---- */
    const track = root.querySelector(".sw-track");
    const count = root.querySelector(".sw-count");
    const prev = root.querySelector(".sw-prev"), next = root.querySelector(".sw-next");
    function goTo(i, smooth = true) {
      if (!track || !track.clientWidth) return;
      const n = Math.max(0, Math.min(imgs.length - 1, i));
      track.scrollTo({ left: n * track.clientWidth, behavior: smooth ? "smooth" : "auto" });
    }
    const sync = () => {
      const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (count) count.textContent = `${i + 1} / ${imgs.length}`;
      if (prev) prev.disabled = i <= 0;
      if (next) next.disabled = i >= imgs.length - 1;
      return i;
    };
    if (track) {
      track.addEventListener("scroll", sync, { passive: true });
      prev?.addEventListener("click", () => goTo(sync() - 1));
      next?.addEventListener("click", () => goTo(sync() + 1));
      track.querySelectorAll(".sw-slide").forEach((s) => s.addEventListener("click", () => open(+s.dataset.i)));
      sync();
    }
  }
})();
