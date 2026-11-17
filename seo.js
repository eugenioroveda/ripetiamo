"use strict";
// Ripetiamo · pagine statiche (città/materia, università/esame, profili tutor):
// aggiorna gli annunci dal vivo, mostra lo sponsor locale e conta la visita (solo totali, senza cookie).
(function () {
  if (!window.supabase || !window.RIPETIAMO_CONFIG) return;
  const C = window.RIPETIAMO_CONFIG;
  const sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, { auth: { persistSession: false } });

  try { const h = document.referrer ? new URL(document.referrer).hostname : "";
    sb.rpc("track_view", { p_path: location.pathname, p_ref: h && h !== location.hostname ? h : "" }).then(() => {}, () => {}); } catch (e) {}
  try { const r = new URL(location.href).searchParams.get("ref");
    if (r && /^[a-z0-9-]{3,80}$/.test(r)) localStorage.setItem("rip-ref", JSON.stringify(r)); } catch (e) {}

  const box = document.getElementById("live"), grid = document.getElementById("liveGrid");
  if (!box || !grid) return;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const subj = box.dataset.subject || "", city = box.dataset.city || "", exam = (box.dataset.exam || "").toLowerCase(), uni = box.dataset.uni || "";
  const LV = { medie: "Medie", superiori: "Superiori", universita: "Università" };
  const km = d => d < 1 ? "meno di 1 km" : String(d.toFixed(d < 10 ? 1 : 0)).replace(".", ",") + " km";
  const COLORS = [["#FFE3C8", "#8A3E07"], ["#E6DCF4", "#523873"], ["#D8EFE2", "#25694A"], ["#FDE0E3", "#8C2A3A"], ["#DCE9F6", "#2D4F78"]];
  const av = n => { const [b, f] = COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
    return `<div class="av" style="background:${b};color:${f}" aria-hidden="true">${esc(n.split(/\s+/).map(x => x[0] || "").join("").slice(0, 2).toUpperCase())}</div>`; };

  const hasGeo = box.dataset.lat !== undefined, lat = +box.dataset.lat, lon = +box.dataset.lon;
  const track = (id, kind) => { try { const k = "rip-sp-" + new Date().toISOString().slice(0, 10), seen = JSON.parse(localStorage.getItem(k) || "{}");
    if (seen[id + kind]) return; seen[id + kind] = 1; localStorage.setItem(k, JSON.stringify(seen)); } catch (e) {}
    sb.rpc("sponsor_track", { p_id: id, p_kind: kind }).then(() => {}, () => {}); };
  const sponsorP = hasGeo ? sb.rpc("sponsors_near", { p_lat: lat, p_lon: lon }).then(r => (r.data || [])[0], () => null) : Promise.resolve(null);
  const addSponsor = async () => { const s = await sponsorP; if (!s) return;
    const el = document.createElement("aside"); el.className = "card ad sponsor"; el.setAttribute("aria-label", "Sponsorizzato");
    el.innerHTML = `<span class="lbl">Sponsorizzato · ${esc(s.name)}</span>${s.image_url ? `<img class="sp-img" src="${esc(s.image_url)}" alt="" loading="lazy">` : ""}
      <h3>${esc(s.headline)}</h3>${s.body ? `<p>${esc(s.body)}</p>` : ""}${s.tagline ? `<p class="sp-tag">${esc(s.tagline)}</p>` : ""}
      <a class="btn" href="${esc(s.link_url)}" target="_blank" rel="sponsored noopener">${esc(s.cta || "Scopri")} ↗</a>`;
    const kids = grid.children; grid.insertBefore(el, kids.length > 2 ? kids[2] : null);
    el.querySelector("a.btn").addEventListener("click", () => track(s.id, "click"));
    if ("IntersectionObserver" in window) { const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { o.disconnect(); track(s.id, "view"); } }, { threshold: 0.5 }); o.observe(el); }
    else track(s.id, "view"); };

  const card = p => {
    const href = p.slug ? "/t/" + encodeURIComponent(p.slug) + "/" : "/#annunci";
    const lv = (p.levels || []).map(l => `<span class="lvl">${esc(LV[l] || l)}</span>`).join("");
    return `<article class="card">
      <div class="top"><span class="kind offro">Offre ripetizioni</span>${p.free_today ? `<span class="free">Libero oggi</span>` : ""}<span class="dist">${hasGeo ? (p.near ? km(p.distance_km) : "Online") : ""}</span></div>
      <div class="who">${av(p.name)}<div><b><a class="plink" href="${href}">${esc(p.name)}</a></b><small>${esc(p.school)}</small>${p.verified_school ? `<span class="vbadge">✓ ${esc(p.verified_school)}</span>` : ""}</div></div>
      <div class="tags">${p.subjects.map(s => `<span class="tag">${esc(s)}</span>`).join("")}${lv}</div>
      ${(p.exams || []).length ? `<p class="exams"><b>Esami:</b> ${esc(p.exams.join(", "))}</p>` : ""}
      <p>${esc(p.body)}</p>
      <p><span aria-hidden="true">📍 </span>${esc(p.place_label)}${p.online ? " · anche online" : ""}${p.reviews_count ? ` · <span class="stars">★ ${String(p.rating).replace(".", ",")}</span> (${p.reviews_count})` : ""}</p>
      <div class="foot"><span class="price">€${p.price} <small>/ora</small></span><a class="btn" href="${href}" style="text-decoration:none">Vedi e prenota</a></div>
    </article>`;
  };

  const args = hasGeo ? { p_lat: lat, p_lon: lon, p_radius_km: 25, p_include_online: true, p_kind: "offro" }
                      : { p_lat: 45.464, p_lon: 9.19, p_radius_km: 0, p_include_online: true, p_kind: "offro" };
  sb.rpc("posts_near", args)
    .then(({ data, error }) => {
      if (error) throw error;
      const list = (data || []).filter(p => (!subj || p.subjects.includes(subj))
        && (!exam || (p.exams || []).some(e => e.toLowerCase() === exam))
        && (!uni || p.university === uni || p.verified_school === uni)).slice(0, 12);
      if (!list.length) {
        if (!grid.querySelector("article")) grid.innerHTML = `<div class="empty">Ancora nessun annuncio${subj ? " di " + esc(subj.toLowerCase()) : ""}${exam ? " per " + esc(box.dataset.exam) : ""}${city ? " a " + esc(city) : ""}. Vai forte${subj ? " in " + esc(subj.toLowerCase()) : ""}? <a href="/#pubblica">Pubblica il primo annuncio</a>: chi cerca qui lo vedrà subito.</div>`;
        addSponsor(); return;
      }
      grid.innerHTML = list.map(card).join("");
      addSponsor();
    })
    .catch(() => { if (!grid.querySelector("article")) grid.innerHTML = `<div class="empty">Non riesco a caricare gli annunci adesso. <a href="/#annunci">Vai alla bacheca</a>.</div>`; });
})();
