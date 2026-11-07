"use strict";
// Ripetiamo · annunci dal vivo nelle pagine "Ripetizioni di <materia> a <città>"
(function () {
  const box = document.getElementById("live"), grid = document.getElementById("liveGrid");
  if (!box || !grid || !window.supabase || !window.RIPETIAMO_CONFIG) return;
  const C = window.RIPETIAMO_CONFIG;
  const sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, { auth: { persistSession: false } });
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const subj = box.dataset.subject, city = box.dataset.city;
  const km = d => d < 1 ? "meno di 1 km" : String(d.toFixed(d < 10 ? 1 : 0)).replace(".", ",") + " km";
  const COLORS = [["#FFE3C8", "#8A3E07"], ["#E6DCF4", "#523873"], ["#D8EFE2", "#25694A"], ["#FDE0E3", "#8C2A3A"], ["#DCE9F6", "#2D4F78"]];
  const av = n => { const [b, f] = COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
    return `<div class="av" style="background:${b};color:${f}">${esc(n.split(/\s+/).map(x => x[0] || "").join("").slice(0, 2).toUpperCase())}</div>`; };

  // Sponsor locale vicino al centro della città (conteggio anonimo, una volta al giorno per browser)
  const track = (id, kind) => { try { const k = "rip-sp-" + new Date().toISOString().slice(0, 10), seen = JSON.parse(localStorage.getItem(k) || "{}");
    if (seen[id + kind]) return; seen[id + kind] = 1; localStorage.setItem(k, JSON.stringify(seen)); } catch (e) {}
    sb.rpc("sponsor_track", { p_id: id, p_kind: kind }).then(() => {}, () => {}); };
  const sponsorP = sb.rpc("sponsors_near", { p_lat: +box.dataset.lat, p_lon: +box.dataset.lon }).then(r => (r.data || [])[0], () => null);
  const addSponsor = async () => { const s = await sponsorP; if (!s) return;
    const el = document.createElement("aside"); el.className = "card ad sponsor"; el.setAttribute("aria-label", "Sponsorizzato");
    el.innerHTML = `<span class="lbl">Sponsorizzato · ${esc(s.name)}</span>${s.image_url ? `<img class="sp-img" src="${esc(s.image_url)}" alt="" loading="lazy">` : ""}
      <h3>${esc(s.headline)}</h3>${s.body ? `<p>${esc(s.body)}</p>` : ""}${s.tagline ? `<p class="sp-tag">${esc(s.tagline)}</p>` : ""}
      <a class="btn" href="${esc(s.link_url)}" target="_blank" rel="sponsored noopener">${esc(s.cta || "Scopri")} ↗</a>`;
    const kids = grid.children; grid.insertBefore(el, kids.length > 2 ? kids[2] : null);
    el.querySelector("a.btn").addEventListener("click", () => track(s.id, "click"));
    if ("IntersectionObserver" in window) { const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { o.disconnect(); track(s.id, "view"); } }, { threshold: 0.5 }); o.observe(el); }
    else track(s.id, "view"); };

  sb.rpc("posts_near", { p_lat: +box.dataset.lat, p_lon: +box.dataset.lon, p_radius_km: 25, p_include_online: true, p_kind: "offro" })
    .then(({ data, error }) => {
      if (error) throw error;
      const list = (data || []).filter(p => p.subjects.includes(subj)).slice(0, 12);
      if (!list.length) {
        grid.innerHTML = `<div class="empty">Ancora nessun annuncio di ${esc(subj.toLowerCase())} a ${esc(city)}. Vai forte in ${esc(subj.toLowerCase())}? <a href="/#pubblica">Pubblica il primo annuncio</a>: chi cerca qui lo vedrà subito.</div>`;
        addSponsor(); return;
      }
      grid.innerHTML = list.map(p => {
        const href = p.slug ? "/#t/" + encodeURIComponent(p.slug) : "/#annunci";
        return `<article class="card">
          <div class="top"><span class="kind offro">Offre ripetizioni</span><span class="dist">${p.near ? km(p.distance_km) : "Online"}</span></div>
          <div class="who">${av(p.name)}<div><b><a class="plink" href="${href}">${esc(p.name)}</a></b><small>${esc(p.school)}</small>${p.verified_school ? `<span class="vbadge">✓ ${esc(p.verified_school)}</span>` : ""}</div></div>
          <div class="tags">${p.subjects.map(s => `<span class="tag">${esc(s)}</span>`).join("")}</div>
          <p>${esc(p.body)}</p>
          <p>📍 ${esc(p.place_label)}${p.online ? " · anche online" : ""}${p.reviews_count ? ` · <span class="stars">★ ${String(p.rating).replace(".", ",")}</span> (${p.reviews_count})` : ""}</p>
          <div class="foot"><span class="price">€${p.price} <small>/ora</small></span><a class="btn" href="${href}" style="text-decoration:none">Vedi e prenota</a></div>
        </article>`;
      }).join("");
      addSponsor();
    })
    .catch(() => { grid.innerHTML = `<div class="empty">Non riesco a caricare gli annunci adesso. <a href="/#annunci">Vai alla bacheca</a>.</div>`; });
})();
