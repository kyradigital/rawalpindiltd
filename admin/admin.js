/* Rawalpindi K LTD — local admin panel */
(function () {
  const cfg = window.SITE_CONFIG || {};
  const BUCKET = "cars";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtPrice = (p) => (p == null ? "On request" : `${cfg.currency || ""} ${Number(p).toLocaleString()}`.trim());
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

  document.querySelectorAll("[data-brand]").forEach((el) => (el.textContent = cfg.brand || "Admin"));
  document.querySelectorAll("[data-currency]").forEach((el) => (el.textContent = cfg.currency || ""));

  const configured = cfg.supabaseUrl && !cfg.supabaseUrl.startsWith("YOUR") && cfg.supabaseAnonKey && !cfg.supabaseAnonKey.startsWith("YOUR");
  if (!configured || !window.supabase) { $("#setup").hidden = false; return; }

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  let cars = [];

  /* ---------------- Toast ---------------- */
  let toastT;
  function toast(msg, err) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show" + (err ? " err" : "");
    clearTimeout(toastT);
    toastT = setTimeout(() => (t.className = "toast" + (err ? " err" : "")), err ? 5000 : 2600);
  }

  /* ---------------- Auth ---------------- */
  async function boot() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return showLogin();
    const { data: isAdmin, error } = await sb.rpc("is_admin");
    if (error || !isAdmin) {
      await sb.auth.signOut();
      return showLogin(error ? `Couldn't verify admin: ${error.message}` : `${session.user.email} is not on the admin list. Add it to the "admins" table in Supabase.`);
    }
    $("#login").hidden = true;
    $("#app").hidden = false;
    $("#who").textContent = session.user.email;
    loadCars();
  }

  function showLogin(msg = "") {
    $("#app").hidden = true;
    $("#login").hidden = false;
    $("#login-msg").textContent = msg;
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector("button");
    btn.disabled = true; btn.textContent = "Signing in…";
    $("#login-msg").textContent = "";
    const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
    btn.disabled = false; btn.textContent = "Sign in";
    if (error) { $("#login-msg").textContent = error.message; return; }
    f.password.value = "";
    boot();
  });

  $("#logout").addEventListener("click", async () => { await sb.auth.signOut(); showLogin(); });

  /* ---------------- List ---------------- */
  async function loadCars() {
    $("#list").innerHTML = `<div class="empty">Loading…</div>`;
    const { data, error } = await sb.from("cars").select("*").order("created_at", { ascending: false });
    if (error) { $("#list").innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
    cars = data || [];
    const makes = [...new Set(cars.map((c) => c.make).filter(Boolean))].sort();
    $("#dl-make").innerHTML = makes.map((m) => `<option>${esc(m)}</option>`).join("");
    renderList();
  }

  function renderStats() {
    const n = (s) => cars.filter((c) => c.status === s).length;
    $("#stats").innerHTML = [
      ["Total cars", cars.length], ["Available", n("available")], ["Reserved", n("reserved")], ["Sold", n("sold"), "red"],
    ].map(([k, v, cls]) => `<div class="stat ${cls || ""}"><span>${k}</span><b>${v}</b></div>`).join("");
  }

  function renderList() {
    renderStats();
    const q = $("#q").value.trim().toLowerCase();
    const st = $("#f-status").value;
    const list = cars.filter((c) => {
      if (st === "hidden" ? c.published : st && c.status !== st) return false;
      if (!q) return true;
      return [c.make, c.model, c.variant, c.year, c.body_type, c.color].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
    if (!cars.length) { $("#list").innerHTML = `<div class="empty">No cars yet. Click <b>+ Add car</b> to add your first one.</div>`; return; }
    if (!list.length) { $("#list").innerHTML = `<div class="empty">No cars match.</div>`; return; }
    $("#list").innerHTML = list.map((c) => {
      const img = c.cover_image || c.images?.[0];
      return `
        <div class="item" data-id="${esc(c.id)}">
          <div class="thumb">${img ? `<img src="${esc(img)}" alt="" loading="lazy" />` : "No photo"}</div>
          <div>
            <h3>${esc([c.year, c.make, c.model].filter(Boolean).join(" "))}${c.featured ? `<span class="tag feat">Featured</span>` : ""}${c.published ? "" : `<span class="tag">Hidden</span>`}</h3>
            <div class="sub">${esc([c.variant, c.engine, c.transmission, c.mileage != null ? Number(c.mileage).toLocaleString() + " km" : ""].filter(Boolean).join(" · "))}</div>
          </div>
          <div class="price">${esc(fmtPrice(c.price))}</div>
          <div class="status-cell">
            <select class="quick-status s-${esc(c.status)}">
              ${["available", "reserved", "sold"].map((s) => `<option value="${s}" ${c.status === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}
            </select>
          </div>
          <button class="btn btn-ghost btn-sm edit">Edit</button>
        </div>`;
    }).join("");
  }

  $("#q").addEventListener("input", renderList);
  $("#f-status").addEventListener("change", renderList);

  $("#list").addEventListener("click", (e) => {
    const item = e.target.closest(".item");
    if (!item || e.target.closest("select")) return;
    openEditor(cars.find((c) => c.id === item.dataset.id));
  });

  $("#list").addEventListener("change", async (e) => {
    if (!e.target.matches(".quick-status")) return;
    const id = e.target.closest(".item").dataset.id;
    const status = e.target.value;
    const { error } = await sb.from("cars").update({ status }).eq("id", id);
    if (error) return toast(error.message, true);
    cars.find((c) => c.id === id).status = status;
    renderList();
    toast(`Marked as ${status}`);
  });

  /* ---------------- Editor ---------------- */
  const form = $("#car-form");
  const drawer = $("#drawer");
  let editing = null; // { id, isNew, images: [{url}|{file, preview}], original: [urls] }

  function openEditor(car) {
    form.reset();
    editing = {
      id: car?.id || uuid(),
      isNew: !car,
      images: car ? orderedImages(car).map((url) => ({ url })) : [],
      original: car ? orderedImages(car) : [],
    };
    if (car) {
      for (const el of form.elements) {
        if (!el.name) continue;
        if (el.type === "checkbox") el.checked = !!car[el.name];
        else el.value = car[el.name] ?? "";
      }
      if (car.price != null) form.price.value = Number(car.price).toLocaleString();
      if (car.mileage != null) form.mileage.value = Number(car.mileage).toLocaleString();
    } else {
      form.published.checked = true;
      form.status.value = "available";
    }
    $("#drawer-title").textContent = car ? `Edit ${car.make} ${car.model}` : "Add car";
    $("#delete").hidden = !car;
    renderThumbs();
    $("#drawer-bg").hidden = false;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    setTimeout(() => (car ? null : form.make.focus()), 350);
  }

  function orderedImages(car) {
    return [...new Set([car.cover_image, ...(car.images || [])].filter(Boolean))];
  }

  function closeEditor() {
    if (saving) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    $("#drawer-bg").hidden = true;
    editing?.images.forEach((im) => im.preview && URL.revokeObjectURL(im.preview));
    editing = null;
  }

  $("#add").addEventListener("click", () => openEditor(null));
  $("#close-drawer").addEventListener("click", closeEditor);
  $("#cancel").addEventListener("click", closeEditor);
  $("#drawer-bg").addEventListener("click", closeEditor);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && editing) closeEditor(); });

  // number fields: keep digits, show thousands separators
  ["price", "mileage"].forEach((n) => form[n].addEventListener("input", (e) => {
    const d = e.target.value.replace(/\D/g, "");
    e.target.value = d ? Number(d).toLocaleString() : "";
  }));
  form.year.addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4)));

  /* ---- Photos ---- */
  const dz = $("#dropzone");
  const fileInput = $("#files");
  dz.addEventListener("click", (e) => { if (!e.target.closest(".link")) fileInput.click(); });
  $("#pick").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });
  ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); dz.classList.add("over"); } }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove("over")));
  dz.addEventListener("drop", (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); });

  function addFiles(files) {
    [...files].filter((f) => f.type.startsWith("image/")).forEach((file) => {
      editing.images.push({ file, preview: URL.createObjectURL(file) });
    });
    renderThumbs();
  }

  let dragFrom = null;
  function renderThumbs() {
    const box = $("#thumbs");
    box.innerHTML = editing.images.map((im, i) => `
      <div class="tile" draggable="true" data-i="${i}">
        <img src="${esc(im.url || im.preview)}" alt="" />
        ${i === 0 ? `<span class="cover-tag">Cover</span>` : ""}
        ${im.file ? `<span class="new-tag">New</span>` : ""}
        <div class="acts">
          ${i !== 0 ? `<button type="button" data-act="cover" title="Make cover">★ Cover</button>` : ""}
          <button type="button" data-act="remove" title="Remove">✕</button>
        </div>
      </div>`).join("");
  }

  $("#thumbs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const i = +b.closest(".tile").dataset.i;
    if (b.dataset.act === "remove") {
      const [im] = editing.images.splice(i, 1);
      if (im.preview) URL.revokeObjectURL(im.preview);
    } else {
      editing.images.unshift(editing.images.splice(i, 1)[0]);
    }
    renderThumbs();
  });
  $("#thumbs").addEventListener("dragstart", (e) => {
    const t = e.target.closest(".tile"); if (!t) return;
    dragFrom = +t.dataset.i; t.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(dragFrom));
  });
  $("#thumbs").addEventListener("dragover", (e) => {
    const t = e.target.closest(".tile"); if (!t || dragFrom == null) return;
    e.preventDefault();
    document.querySelectorAll(".tile.drop-target").forEach((x) => x.classList.remove("drop-target"));
    t.classList.add("drop-target");
  });
  $("#thumbs").addEventListener("drop", (e) => {
    const t = e.target.closest(".tile"); if (!t || dragFrom == null) return;
    e.preventDefault();
    const to = +t.dataset.i;
    const [m] = editing.images.splice(dragFrom, 1);
    editing.images.splice(to, 0, m);
    dragFrom = null;
    renderThumbs();
  });
  $("#thumbs").addEventListener("dragend", () => { dragFrom = null; renderThumbs(); });

  // Resize big photos before upload (max 2000px, JPEG 85%)
  async function compress(file, max = 2000, quality = 0.85) {
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      if (scale === 1 && file.size < 900 * 1024) return file;
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * scale);
      c.height = Math.round(bmp.height * scale);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", quality));
      return blob && blob.size < file.size ? blob : file;
    } catch { return file; }
  }

  const pathFromUrl = (url) => {
    const marker = `/object/public/${BUCKET}/`;
    const i = url.indexOf(marker);
    return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  };

  /* ---- Save ---- */
  let saving = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (saving) return;
    saving = true;
    const btn = $("#save");
    btn.disabled = true;
    const label = btn.textContent;

    try {
      const urls = [];
      const newOnes = editing.images.filter((im) => im.file).length;
      let done = 0;
      for (const im of editing.images) {
        if (im.url) { urls.push(im.url); continue; }
        btn.textContent = `Uploading ${++done}/${newOnes}…`;
        const blob = await compress(im.file);
        const ext = blob.type === "image/jpeg" ? "jpg" : (im.file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${editing.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || im.file.type, cacheControl: "31536000" });
        if (error) throw error;
        const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        im.url = url; delete im.file; // so a retry doesn't re-upload
        urls.push(url);
      }

      btn.textContent = "Saving…";
      const v = (n) => form[n].value.trim() || null;
      const num = (n) => { const d = form[n].value.replace(/\D/g, ""); return d ? Number(d) : null; };
      const row = {
        id: editing.id,
        make: v("make"), model: v("model"), variant: v("variant"),
        year: num("year"), price: num("price"), mileage: num("mileage"),
        engine: v("engine"), transmission: v("transmission"), fuel: v("fuel"),
        body_type: v("body_type"), drive: v("drive"), color: v("color"),
        description: v("description"), status: form.status.value,
        published: form.published.checked, featured: form.featured.checked,
        images: urls, cover_image: urls[0] || null,
      };
      const { error } = await sb.from("cars").upsert(row);
      if (error) throw error;

      // clean up photos that were removed
      const removed = editing.original.filter((u) => !urls.includes(u)).map(pathFromUrl).filter(Boolean);
      if (removed.length) await sb.storage.from(BUCKET).remove(removed);

      toast(editing.isNew ? "Car added" : "Car updated");
      saving = false;
      closeEditor();
      loadCars();
    } catch (err) {
      console.error(err);
      toast(err.message || "Something went wrong", true);
    } finally {
      saving = false;
      btn.disabled = false;
      btn.textContent = label;
    }
  });

  /* ---- Delete ---- */
  $("#delete").addEventListener("click", async () => {
    const car = cars.find((c) => c.id === editing.id);
    if (!car || !confirm(`Delete ${car.year || ""} ${car.make} ${car.model} and all its photos? This can't be undone.`)) return;
    const { error } = await sb.from("cars").delete().eq("id", car.id);
    if (error) return toast(error.message, true);
    const { data: files } = await sb.storage.from(BUCKET).list(car.id);
    const paths = [...new Set([...(files || []).map((f) => `${car.id}/${f.name}`), ...orderedImages(car).map(pathFromUrl).filter(Boolean)])];
    if (paths.length) await sb.storage.from(BUCKET).remove(paths);
    toast("Car deleted");
    closeEditor();
    loadCars();
  });

  sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") showLogin(); });
  boot();
})();
