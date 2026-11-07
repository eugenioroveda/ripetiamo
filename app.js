"use strict";
// =====================================================================
// Ripetiamo · logica del sito (Supabase)
// I testi sono scritti come t("italiano", "english"): vedi i18n.js.
// =====================================================================
const CFG = window.RIPETIAMO_CONFIG;
const sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
  auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const EN = window.LANG === "en";
const LOC = EN ? "en-GB" : "it-IT";
const TERMS = t("termini.html", "terms.html"), PRIVACY = t("privacy.html", "privacy-en.html");

// ---------- utilità ---------------------------------------------------
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dec = x => EN ? String(x) : String(x).replace(".", ",");
const eur = n => EN ? "€" + Number(n).toFixed(2) : "€ " + Number(n).toFixed(2).replace(".", ",");
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const fmtKm = d => d < 1 ? t("meno di 1 km", "under 1 km") : dec(d.toFixed(d < 10 ? 1 : 0)) + " km";
const COLORS = [["#FFE3C8", "#8A3E07"], ["#E6DCF4", "#523873"], ["#D8EFE2", "#25694A"], ["#FDE0E3", "#8C2A3A"], ["#DCE9F6", "#2D4F78"]];
const col = n => COLORS[[...String(n)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const ini = n => String(n).split(/\s+/).map(x => x[0] || "").join("").slice(0, 2).toUpperCase();
const avatar = n => { const [b, f] = col(n); return `<div class="av" style="background:${b};color:${f}">${esc(ini(n))}</div>`; };
const TZ = "Europe/Rome";
const fmtWhen = d => new Intl.DateTimeFormat(LOC, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(d));
const fmtDay = d => new Intl.DateTimeFormat(LOC, { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(d);
const ago = d => { const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 60) return m <= 1 ? t("adesso", "just now") : m + t(" min fa", " min ago");
  if (m < 1440) { const h = Math.round(m / 60); return h + t(" ore fa", h === 1 ? " hour ago" : " hours ago"); }
  if (m < 2880) return t("ieri", "yesterday");
  return Math.round(m / 1440) + t(" giorni fa", " days ago"); };
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
             set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
// Valori salvati nel database in italiano, mostrati nella lingua scelta
const SUBJ_EN = { Matematica: "Maths", Fisica: "Physics", Latino: "Latin", Inglese: "English", Chimica: "Chemistry", Italiano: "Italian", Economia: "Economics", Greco: "Greek", Storia: "History", Filosofia: "Philosophy", Biologia: "Biology", Francese: "French", Spagnolo: "Spanish", Tedesco: "German" };
const subj = s => (EN && SUBJ_EN[s]) || s;
const MODE = m => EN ? ({ "Di persona": "In person", "Online": "Online" }[m] || m) : m;
const STATUS = s => EN ? ({ richiesta: "pending", confermata: "confirmed", rifiutata: "declined", annullata: "cancelled" }[s] || s) : s;
// Messaggi d'errore che arrivano dal database (scritti in italiano)
const DB_EN = [
  [/almeno 18 anni/, "You must be at least 18 to offer tutoring."], [/Annuncio non disponibile/, "This listing is no longer available."],
  [/con te stesso/, "You can't book a lesson with yourself."], [/orario futuro/, "Choose a time in the future."],
  [/Orario non disponibile/, "That time is not available."], [/si sovrappone/, "That time overlaps another lesson with this tutor."],
  [/solo annullare/, "You can only cancel the booking."], [/troppi messaggi/, "You've sent too many messages. Try again later."],
  [/14 anni/, "Under 14, a parent must create the account."], [/consenso di un genitore/, "Parental consent is required."],
  [/Non sei collegato/, "You're not signed in."]];

function toast(m) { const el = $("#toast"); el.textContent = m; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => el.hidden = true, 3500); }
function dbErr(e) {
  const generic = t("Qualcosa non ha funzionato, riprova.", "Something went wrong. Please try again.");
  if (!e) return generic;
  if (e.code === "23505") return t("Quell'orario è appena stato prenotato da qualcun altro.", "Someone has just booked that time.");
  if (e.code === "42501") return t("Non hai il permesso di farlo.", "You don't have permission to do that.");
  if (e.code === "23514") return t("Controlla i dati inseriti: qualche campo è troppo corto o troppo lungo.", "Check what you entered: a field is too short or too long.");
  if (/fetch|network/i.test(e.message || "")) return t("Connessione assente. Controlla internet e riprova.", "No connection. Check your internet and try again.");
  if (EN && e.message) { const m = DB_EN.find(([re]) => re.test(e.message)); if (m) return m[1]; }
  return e.message || generic;
}
function openSheet(html) {
  const sh = $("#sheet"); sh.innerHTML = html; $("#scrim").hidden = false; sh.scrollTop = 0;
  // su telefono non mettiamo il cursore in un campo, altrimenti si apre subito la tastiera
  if (matchMedia("(max-width:720px)").matches) { sh.tabIndex = -1; sh.focus({ preventScroll: true }); return; }
  const f = sh.querySelector("textarea,input,select,button.btn"); f && f.focus();
}
function closeSheet() { $("#scrim").hidden = true; $("#sheet").innerHTML = ""; }
$("#scrim").addEventListener("click", e => { if (e.target.id === "scrim") closeSheet(); });
addEventListener("keydown", e => { if (e.key === "Escape" && !$("#scrim").hidden) closeSheet(); });
if (CFG.CONTACT_EMAIL) $("#contact").textContent = CFG.CONTACT_EMAIL;
const CANCEL = t("Annulla", "Cancel");

// ---------- luoghi ----------------------------------------------------
// Elenco rapido dei posti più comuni; tutto il resto lo cerca OpenStreetMap.
const LOCAL = [
  ["Milano", "Milano", 45.464, 9.190], ["Città Studi", "Milano", 45.478, 9.227], ["Navigli", "Milano", 45.452, 9.176], ["Porta Romana", "Milano", 45.451, 9.203],
  ["Isola", "Milano", 45.488, 9.189], ["Bicocca", "Milano", 45.513, 9.211], ["Lambrate", "Milano", 45.484, 9.238], ["San Siro", "Milano", 45.478, 9.124],
  ["Roma", "Roma", 41.903, 12.496], ["San Lorenzo", "Roma", 41.897, 12.517], ["Trastevere", "Roma", 41.889, 12.469], ["Ostiense", "Roma", 41.871, 12.480],
  ["Torino", "Torino", 45.070, 7.687], ["Bologna", "Bologna", 44.495, 11.343], ["Napoli", "Napoli", 40.852, 14.268], ["Firenze", "Firenze", 43.770, 11.256],
  ["Padova", "Padova", 45.406, 11.877], ["Genova", "Genova", 44.406, 8.946], ["Pavia", "Pavia", 45.185, 9.155], ["Bergamo", "Bergamo", 45.698, 9.677], ["Monza", "Monza", 45.584, 9.274]
].map(([n, c, lat, lon]) => ({ label: n === c ? n : `${n}, ${c}`, city: c, lat, lon, key: norm(n) }));
const ALIAS = { milan: "milano", rome: "roma", turin: "torino", naples: "napoli", florence: "firenze", padua: "padova", genoa: "genova" };
const geoCache = ls.get("rip-geo", {});

async function geocode(txt) {
  let t0 = norm(txt); if (t0.length < 2) return null;
  let first = t0.split(",")[0].trim(); if (ALIAS[first]) { first = ALIAS[first]; t0 = first; }
  const loc = LOCAL.find(p => norm(p.label) === t0) || LOCAL.find(p => p.key === first);
  if (loc) return loc;
  if (t0 in geoCache) return geoCache[t0];
  try {
    // i nomi dei luoghi si salvano sempre in italiano, così tutti vedono la stessa zona
    const r = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=it&limit=1&addressdetails=1&accept-language=it&q=" + encodeURIComponent(txt));
    if (!r.ok) return null;
    const x = (await r.json())[0];
    let p = null;
    if (x) {
      const a = x.address || {};
      const city = a.city || a.town || a.village || a.municipality || a.county || x.name || "";
      const zone = a.suburb || a.quarter || a.neighbourhood || a.city_district || "";
      // si salva solo zona e città, con coordinate arrotondate a ~100 m
      p = { label: (zone && zone !== city ? zone + ", " : "") + city, city, lat: +(+x.lat).toFixed(3), lon: +(+x.lon).toFixed(3) };
    }
    geoCache[t0] = p; ls.set("rip-geo", geoCache);
    return p;
  } catch (e) { return null; }
}
function locField(input, out, onOk) {
  let seq = 0;
  const check = async () => {
    const v = input.value.trim(), my = ++seq;
    if (!v) { out.className = "loc"; out.textContent = ""; input._place = null; return null; }
    out.className = "loc"; out.textContent = t("Cerco…", "Searching…");
    const p = await geocode(v);
    if (my !== seq) return input._place;
    input._place = p;
    if (p) { out.className = "loc ok"; out.textContent = "✓ " + p.label; input.setAttribute("aria-invalid", "false"); onOk && onOk(p); }
    else { out.className = "loc no"; out.textContent = t("Non trovo questo posto. Prova con la città o il quartiere.", "Can't find that place. Try the city or neighbourhood."); input.setAttribute("aria-invalid", "true"); }
    return p;
  };
  input.addEventListener("change", check);
  input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); check(); } });
  input._check = check;
  return check;
}

// ---------- sessione e profilo ----------------------------------------
let user = null, profile = null;
const age = d => { const b = new Date(d), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
const isAdult = () => profile && age(profile.birth_date) >= 18;

async function loadProfile() {
  if (!user) { profile = null; return; }
  const { data } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  profile = data || null;
  if (profile && profile.lang !== window.LANG) { profile.lang = window.LANG; sb.from("profiles").update({ lang: window.LANG }).eq("id", user.id).then(() => {}); }
}
// Le pagine che richiedono l'accesso mandano qui; dopo il login si torna dov'eri.
function needLogin(next) {
  if (user && profile) return false;
  ls.set("rip-next", next || location.hash.slice(1) || "spazio");
  if (location.hash !== "#accesso") location.hash = "accesso"; else renderAuth();
  return true;
}
const rateMsg = m => /rate|limit|security purposes/i.test(m);
const sendCode = email => sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });

// Secondo passo dell'accesso: il codice ricevuto via email, digitabile da qualsiasi dispositivo
function renderCode(email) {
  const box = $("#authBox");
  box.innerHTML = `
    <h2>${t("Controlla la posta", "Check your inbox")}</h2>
    <p>${t("Abbiamo mandato un codice a", "We've sent a code to")} <b>${esc(email)}</b>. ${t("Scrivilo qui sotto. Se non lo trovi, guarda nello spam.", "Enter it below. If you can't find it, check your spam folder.")}</p>
    <form id="codeForm" class="auth" style="border:none;padding:0">
      <label>${t("Codice", "Code")}<input id="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456" style="font-size:24px;letter-spacing:.3em;text-align:center"></label>
      <button class="btn">${t("Entra", "Sign in")}</button>
    </form>
    <p class="small"><button class="linkbtn" id="resend" type="button">${t("Mandami un nuovo codice", "Send me a new code")}</button> · <button class="linkbtn" id="again" type="button">${t("Usa un'altra email", "Use another email")}</button></p>`;
  const inp = $("#otp"); inp.focus();
  inp.addEventListener("input", () => { inp.value = inp.value.replace(/\D/g, ""); });
  $("#codeForm").onsubmit = async e => {
    e.preventDefault();
    const token = inp.value.trim();
    if (token.length < 6) return toast(t("Il codice ha almeno 6 cifre", "The code has at least 6 digits"));
    const btn = e.target.querySelector("button"); btn.disabled = true; btn.textContent = t("Controllo…", "Checking…");
    const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
    btn.disabled = false; btn.textContent = t("Entra", "Sign in");
    if (error) return toast(/expired|invalid/i.test(error.message) ? t("Codice sbagliato o scaduto. Controlla l'ultima email o chiedine uno nuovo.", "Wrong or expired code. Check the latest email or ask for a new one.") : dbErr(error));
    toast(t("Sei dentro!", "You're in!"));   // il resto lo gestisce onAuthStateChange
  };
  $("#resend").onclick = async () => {
    const { error } = await sendCode(email);
    toast(error ? (rateMsg(error.message) ? t("Aspetta un minuto prima di chiedere un altro codice.", "Wait a minute before asking for another code.") : dbErr(error)) : t("Nuovo codice inviato", "New code sent"));
  };
  $("#again").onclick = renderAuth;
}

function renderAuth() {
  const box = $("#authBox");
  if (!user) {
    box.innerHTML = `
      <h2>${t("Entra in Ripetiamo", "Sign in to Ripetiamo")}</h2>
      <p>${t("Ti mandiamo un codice via email: niente password da ricordare. Puoi leggerlo anche dal telefono.", "We'll email you a code: no password to remember. You can read it on your phone too.")}</p>
      <form id="loginForm" class="auth" style="border:none;padding:0">
        <label>${t("La tua email", "Your email")}<input id="email" type="email" autocomplete="email" required placeholder="${t("nome@esempio.it", "name@example.com")}"></label>
        <button class="btn">${t("Mandami il codice", "Send me the code")}</button>
      </form>
      <p class="small">${t(`Continuando accetti i <a href="${TERMS}">Termini e condizioni</a> e l'<a href="${PRIVACY}">Informativa privacy</a>.`, `By continuing you accept the <a href="${TERMS}">Terms and conditions</a> and the <a href="${PRIVACY}">Privacy notice</a>.`)}</p>`;
    $("#loginForm").onsubmit = async e => {
      e.preventDefault();
      const email = $("#email").value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) return toast(t("Scrivi un indirizzo email valido", "Enter a valid email address"));
      const btn = e.target.querySelector("button"), lbl = btn.textContent; btn.disabled = true; btn.textContent = t("Invio…", "Sending…");
      const { error } = await sendCode(email);
      btn.disabled = false; btn.textContent = lbl;
      if (error) return toast(rateMsg(error.message) ? t("Troppi tentativi. Aspetta un minuto e riprova.", "Too many attempts. Wait a minute and try again.") : dbErr(error));
      renderCode(email);
    };
    return;
  }
  if (!profile) {
    const max = new Date(); max.setFullYear(max.getFullYear() - 14);
    box.innerHTML = `
      <h2>${t("Ultimo passo", "One last step")}</h2>
      <p>${t("Come ti chiami e quando sei nato? Ci serve per le regole di sicurezza: per offrire lezioni bisogna essere maggiorenni.", "What's your name and date of birth? We need it for our safety rules: you must be 18 or over to offer lessons.")}</p>
      <form id="profForm" class="auth" style="border:none;padding:0">
        <label>${t("Nome da mostrare (es. Giulia R.)", "Display name (e.g. Giulia R.)")}<input id="pName" maxlength="40" required></label>
        <label>${t("Data di nascita", "Date of birth")}<input id="pBirth" type="date" max="${max.toISOString().slice(0, 10)}" min="1930-01-01" required></label>
        <label class="agree" id="pConsentRow" hidden><input type="checkbox" id="pConsent"><span>${t("Ho meno di 18 anni e un mio genitore sa che uso Ripetiamo ed è d'accordo.", "I'm under 18 and a parent knows I use Ripetiamo and agrees.")}</span></label>
        <label class="agree"><input type="checkbox" id="pTerms"><span>${t(`Accetto i <a href="${TERMS}" target="_blank">Termini e condizioni</a> e ho letto l'<a href="${PRIVACY}" target="_blank">Informativa privacy</a>.`, `I accept the <a href="${TERMS}" target="_blank">Terms and conditions</a> and have read the <a href="${PRIVACY}" target="_blank">Privacy notice</a>.`)}</span></label>
        <button class="btn">${t("Crea il profilo", "Create profile")}</button>
        <p class="small">${t("Hai meno di 14 anni? Chiedi a un genitore di creare l'account per te.", "Under 14? Ask a parent to create the account for you.")}</p>
      </form>`;
    $("#pBirth").onchange = () => { const v = $("#pBirth").value; $("#pConsentRow").hidden = !v || age(v) >= 18; };
    $("#profForm").onsubmit = async e => {
      e.preventDefault();
      const b = $("#pBirth").value, n = $("#pName").value.trim();
      if (n.length < 2) return toast(t("Scrivi un nome di almeno 2 lettere", "Enter a name of at least 2 letters"));
      if (!b) return toast(t("Inserisci la data di nascita", "Enter your date of birth"));
      if (age(b) < 14) return toast(t("Sotto i 14 anni l'account deve aprirlo un genitore", "Under 14, a parent must create the account"));
      if (age(b) < 18 && !$("#pConsent").checked) return toast(t("Serve il consenso di un genitore", "Parental consent is required"));
      if (!$("#pTerms").checked) return toast(t("Per continuare accetta i termini", "Accept the terms to continue"));
      const { data, error } = await sb.from("profiles").insert({ id: user.id, display_name: n, birth_date: b, parent_consent: age(b) < 18 }).select().single();
      if (error) return toast(dbErr(error));
      profile = data; toast(t("Benvenuto su Ripetiamo, ", "Welcome to Ripetiamo, ") + n.split(" ")[0] + "!");
      goNext();
    };
    return;
  }
  goNext();
}
function goNext() { const n = ls.get("rip-next", "spazio"); ls.set("rip-next", null); location.hash = n && n !== "accesso" ? n : "spazio"; }

// ---------- routing ---------------------------------------------------
const VIEWS = ["annunci", "accesso", "pubblica", "messaggi", "spazio", "tutor"];
let current = null;
function route() {
  const h = location.hash.slice(1);
  let v = h.startsWith("t/") ? "tutor" : h; if (!VIEWS.includes(v) || (v === "tutor" && !h.startsWith("t/"))) v = "annunci";
  if (["pubblica", "messaggi", "spazio"].includes(v) && needLogin(v)) return;
  current = v;
  VIEWS.forEach(x => $("#v-" + x).hidden = x !== v);
  $$("nav a").forEach(a => a.hash === "#" + v ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  window.scrollTo(0, 0);
  if (v === "accesso") renderAuth();
  if (v === "pubblica") preparePublish();
  if (v === "messaggi") { if (!openPending && isMobile()) openWith = null; openPending = false; loadMessages(); }
  if (v === "spazio") loadSpazio();
  if (v === "tutor") loadTutor(decodeURIComponent(h.slice(2)));
}
addEventListener("hashchange", route);

// ---------- bacheca ---------------------------------------------------
const MY_POS = t("La tua posizione", "Your location");
let me = ls.get("rip-where", null) || { label: "Milano", city: "Milano", lat: 45.464, lon: 9.19 };
if (me.mine) me.label = MY_POS;
let tab = "tutti", activeSub = "*", lastPosts = [];
$("#where").value = me.label;
$("#radius").value = String(ls.get("rip-radius", 10));
const BASE_SUBJECTS = ["Matematica", "Fisica", "Latino", "Inglese", "Chimica", "Italiano", "Economia"];

// Spazi pubblicitari: prima gli sponsor locali della zona cercata, poi AdSense (se attivo), altrimenti l'invito a sponsorizzare.
let sponsors = [], adN = 0;
async function loadSponsors() {
  try { const { data } = await sb.rpc("sponsors_near", { p_lat: me.lat, p_lon: me.lon }); sponsors = data || []; }
  catch (e) { sponsors = []; }
}
function sponsorCard(s) {
  const tr = EN && s.headline_en, head = tr ? s.headline_en : s.headline, body = tr ? s.body_en : s.body, cta = EN ? (s.cta_en || "Learn more") : (s.cta || "Scopri");
  return `<aside class="card ad sponsor" aria-label="${t("Sponsorizzato", "Sponsored")}" data-sp="${s.id}"><span class="lbl">${t("Sponsorizzato", "Sponsored")} · ${esc(s.name)}</span>
    ${s.image_url ? `<img class="sp-img" src="${esc(s.image_url)}" alt="" loading="lazy">` : ""}
    <h3>${esc(head)}</h3>${body ? `<p>${esc(body)}</p>` : ""}${s.tagline ? `<p class="sp-tag">${esc(s.tagline)}</p>` : ""}
    <a class="btn" href="${esc(s.link_url)}" target="_blank" rel="sponsored noopener" data-spclick="${s.id}">${esc(cta)} ↗</a></aside>`;
}
function adCard() {
  const n = adN++;
  if (sponsors.length && (n < sponsors.length || !(CFG.ADSENSE_CLIENT && CFG.ADSENSE_SLOT))) return sponsorCard(sponsors[n % sponsors.length]);
  if (CFG.ADSENSE_CLIENT && CFG.ADSENSE_SLOT) {
    return `<aside class="card ad" aria-label="${t("Pubblicità", "Advertisement")}"><span class="lbl">${t("Pubblicità", "Advertisement")}</span>
      <ins class="adsbygoogle" style="display:block" data-ad-client="${esc(CFG.ADSENSE_CLIENT)}" data-ad-slot="${esc(CFG.ADSENSE_SLOT)}" data-ad-format="auto" data-full-width-responsive="true"></ins></aside>`;
  }
  const where = me.city || me.label;
  return `<aside class="card ad" aria-label="${t("Spazio pubblicitario", "Ad space")}"><span class="lbl">${t("Spazio pubblicitario", "Ad space")} · ${esc(where)}</span>
    <h3>${t("Hai un'attività vicino a una scuola?", "Run a business near a school?")}</h3><p>${t("Librerie, cartolerie, aule studio: fatti vedere dagli studenti della tua zona.", "Bookshops, stationers, study rooms: get seen by students in your area.")}${CFG.CONTACT_EMAIL ? t(" Scrivi a ", " Write to ") + `<a href="mailto:${esc(CFG.CONTACT_EMAIL)}?subject=Sponsor%20${encodeURIComponent(where)}">${esc(CFG.CONTACT_EMAIL)}</a>.` : ""}</p></aside>`;
}
// Conteggio anonimo: al massimo una visualizzazione e un clic per sponsor al giorno da questo browser.
function spTrack(id, kind) {
  const k = "rip-sp-" + new Date().toISOString().slice(0, 10), seen = ls.get(k, {});
  if (seen[id + kind]) return; seen[id + kind] = 1;
  try { Object.keys(localStorage).filter(x => x.startsWith("rip-sp-") && x !== k).forEach(x => localStorage.removeItem(x)); } catch (e) {}
  ls.set(k, seen); sb.rpc("sponsor_track", { p_id: +id, p_kind: kind }).then(() => {}, () => {});
}
const spObs = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { spObs.unobserve(e.target); spTrack(e.target.dataset.sp, "view"); } }), { threshold: 0.5 }) : null;
function bindAds(root) {
  root.querySelectorAll("[data-sp]").forEach(el => spObs ? spObs.observe(el) : spTrack(el.dataset.sp, "view"));
  root.querySelectorAll("[data-spclick]").forEach(a => a.addEventListener("click", () => spTrack(a.dataset.spclick, "click")));
}
function fillAds() { if (!(CFG.ADSENSE_CLIENT && CFG.ADSENSE_SLOT)) return;
  $$("ins.adsbygoogle:not([data-adsbygoogle-status])").forEach(() => { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {} }); }

function renderChips() {
  const subs = [...new Set([...BASE_SUBJECTS, ...lastPosts.flatMap(p => p.subjects)])];
  const box = $("#subjects"); box.querySelectorAll(".chip").forEach(c => c.remove());
  ["*", ...subs].forEach(s => { const b = document.createElement("button"); b.type = "button"; b.className = "chip" + (s === activeSub ? " on" : "");
    b.textContent = s === "*" ? t("Tutte", "All") : subj(s);
    b.onclick = () => { activeSub = s; renderChips(); renderPosts(); }; box.appendChild(b); });
}
let postsSeq = 0;
async function loadPosts() {
  const my = ++postsSeq;
  const R = +$("#radius").value;
  const [{ data, error }] = await Promise.all([
    sb.rpc("posts_near", { p_lat: me.lat, p_lon: me.lon, p_radius_km: R, p_include_online: $("#showOnline").checked, p_kind: tab === "tutti" ? null : tab }),
    loadSponsors()]);
  if (my !== postsSeq) return;
  if (error) { $("#posts").innerHTML = `<div class="empty">${t("Non riesco a caricare gli annunci.", "Can't load listings.")} ${esc(dbErr(error))}</div>`; return; }
  lastPosts = data || []; renderChips(); renderPosts();
}
// Una scheda annuncio (bacheca e profilo pubblico usano la stessa)
const POSTS = new Map();
const stars = n => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
const vBadge = sch => sch ? `<span class="vbadge" title="${t("Studente verificato con l'email universitaria", "Student verified with a university email")}">✓ ${esc(sch)}</span>` : "";
function postCard(p) {
  POSTS.set(String(p.id), p);
  const mine = user && p.author === user.id;
  const city = (p.place_label || "").split(",").pop().trim();
  const hasDist = typeof p.distance_km === "number";
  const name = p.slug ? `<a class="plink" href="#t/${encodeURIComponent(p.slug)}">${esc(p.name)}</a>` : esc(p.name);
  const rating = p.reviews_count > 0 ? ` · <span class="stars" title="${p.rating}/5">★ ${dec(p.rating)}</span> (${p.reviews_count})` : "";
  const place = !hasDist || p.near
    ? "📍 " + esc(p.place_label) + (p.online ? t(" · anche online", " · also online") : "")
    : "🌐 " + t("Solo online · da ", "Online only · from ") + esc(city);
  return `<article class="card">
    <div class="top"><span class="kind ${p.kind}">${p.kind === "offro" ? t("Offre ripetizioni", "Offers tutoring") : t("Cerca ripetizioni", "Looking for tutoring")}</span>${hasDist ? `<span class="dist">${p.near ? fmtKm(p.distance_km) : "Online"}</span>` : ""}</div>
    <div class="who">${avatar(p.name)}<div><b>${name}</b><small>${esc(p.school)}</small>${vBadge(p.verified_school)}</div></div>
    <div class="tags">${p.subjects.map(x => `<span class="tag">${esc(subj(x))}</span>`).join("")}</div>
    <p>${esc(p.body)}</p>
    <p>${place} · ${ago(p.created_at)}${rating}</p>
    <div class="foot">
      <span class="price">${p.kind === "cerco" ? `<small>${t("fino a", "up to")}</small> ` : ""}€${p.price} <small>/${t("ora", "hour")}</small></span>
      ${mine ? `<a class="mine" href="#spazio">${t("Il tuo annuncio", "Your listing")}</a>` :
        p.kind === "offro" ? `<span class="row"><button class="btn ghost" data-write="${p.id}" type="button">${t("Scrivi", "Message")}</button><button class="btn" data-book="${p.id}" type="button">${t("Prenota", "Book")}</button></span>`
                           : `<button class="btn plum" data-write="${p.id}" type="button">${t("Mi propongo", "Offer to help")}</button>`}
    </div>
    ${mine ? "" : `<button class="report" data-report="${p.id}" type="button">${t("Segnala", "Report")}</button>`}
  </article>`;
}
function bindCards(root) {
  const byId = id => POSTS.get(String(id));
  root.querySelectorAll("[data-book]").forEach(b => b.onclick = () => book(byId(b.dataset.book)));
  root.querySelectorAll("[data-write]").forEach(b => b.onclick = () => writeTo(byId(b.dataset.write)));
  root.querySelectorAll("[data-report]").forEach(b => b.onclick = () => report(byId(b.dataset.report)));
}

function renderPosts() {
  const R = +$("#radius").value, q = norm($("#q").value);
  const list = lastPosts.filter(p => (activeSub === "*" || p.subjects.includes(activeSub)) && (!q || norm(p.name + " " + p.subjects.join(" ") + " " + p.subjects.map(subj).join(" ") + " " + p.body).includes(q)));
  const nNear = list.filter(p => p.near).length;
  const area = R ? t("entro ", "within ") + R + " km" : t("in tutta Italia", "across Italy");
  $("#count").textContent = EN
    ? `${nNear} ${nNear === 1 ? "listing" : "listings"} ${area} of ${me.label}` + (list.length > nNear ? ` · ${list.length - nNear} online from further away` : "")
    : `${nNear} ${nNear === 1 ? "annuncio" : "annunci"} ${area} da ${me.label}` + (list.length > nNear ? ` · ${list.length - nNear} online da più lontano` : "");
  let html = ""; adN = 0;
  list.forEach((p, i) => { if (i === Math.min(3, list.length - 1) || (i > 3 && (i - 3) % 10 === 0)) html += adCard(); html += postCard(p); });
  $("#posts").innerHTML = list.length ? html : `<div class="empty">${EN
    ? `No listings yet ${R ? "within " + R + " km of" : "near"} ${esc(me.label)} with these filters. Try a wider distance, or <a href="#pubblica">post the first listing yourself</a>: people searching in your area will see it straight away.`
    : `Ancora nessun annuncio ${R ? "entro " + R + " km" : ""} da ${esc(me.label)} con questi filtri. Prova ad allargare la distanza, oppure <a href="#pubblica">pubblica tu il primo annuncio</a>: chi cerca nella tua zona lo vedrà subito.`}</div>` + adCard();
  bindCards($("#posts"));
  bindAds($("#posts"));
  fillAds();
}
locField($("#where"), $("#whereLoc"), p => { me = p; ls.set("rip-where", p); loadPosts(); });
$("#whereForm").onsubmit = e => e.preventDefault();
$("#radius").onchange = () => { ls.set("rip-radius", +$("#radius").value); loadPosts(); };
$("#showOnline").onchange = loadPosts;
$("#q").oninput = renderPosts;
$("#geoBtn").onclick = () => {
  if (!navigator.geolocation) return toast(t("Il tuo browser non condivide la posizione", "Your browser doesn't share location"));
  navigator.geolocation.getCurrentPosition(pos => {
    me = { label: MY_POS, mine: true, city: "", lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3) };
    $("#where").value = me.label; $("#whereLoc").className = "loc ok"; $("#whereLoc").textContent = t("✓ Posizione attuale (approssimata)", "✓ Current location (approximate)");
    ls.set("rip-where", me); loadPosts();
  }, () => toast(t("Non riesco a leggere la posizione. Scrivi la tua città.", "Can't read your location. Type your city instead.")), { timeout: 10000, maximumAge: 600000 });
};
function setTab(x) { tab = x; $$(".tab").forEach(b => b.classList.toggle("on", b.dataset.t === x));
  $$(".choice button").forEach(b => b.classList.toggle("on", b.dataset.tab === x)); loadPosts(); }
$$(".tab").forEach(b => b.onclick = () => setTab(b.dataset.t));
$$(".choice button").forEach(b => b.onclick = () => { setTab(b.dataset.tab); $("#whereForm").scrollIntoView({ behavior: "smooth", block: "start" }); });

// ---------- prenotazione (pagamento di persona) ------------------------
async function book(p) {
  if (!p) return;
  if (needLogin("annunci")) return;
  openSheet(`<p class="loading">${t("Carico gli orari liberi…", "Loading free times…")}</p>`);
  const [av, busy] = await Promise.all([
    sb.from("availability").select("weekday,hour").eq("tutor", p.author),
    sb.rpc("busy_slots", { p_tutor: p.author })
  ]);
  if (av.error || busy.error) { closeSheet(); return toast(dbErr(av.error || busy.error)); }
  const taken = new Set((busy.data || []).map(x => new Date(typeof x === "string" ? x : x.busy_slots).getTime()));
  const free = new Set((av.data || []).map(a => a.weekday + "-" + a.hour));
  // Prossimi 14 giorni, almeno 2 ore da adesso. (Orari nel fuso del browser.)
  const days = [], soon = Date.now() + 2 * 3600e3;
  for (let i = 0; i < 14; i++) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i);
    const wd = d.getDay() || 7, slots = [];
    for (let h = 7; h <= 22; h++) { if (!free.has(wd + "-" + h)) continue;
      const s = new Date(d); s.setHours(h); if (s.getTime() < soon || taken.has(s.getTime())) continue; slots.push(s); }
    if (slots.length) days.push({ d, slots });
  }
  const first = esc(p.name.split(" ")[0]);
  if (!days.length) {
    openSheet(`<h2 id="sh-title">${t("Nessun orario libero", "No free times")}</h2><p>${t(`${first} non ha ancora indicato orari disponibili nelle prossime due settimane. Scrivigli per mettervi d'accordo.`, `${first} hasn't set any available times in the next two weeks. Send a message to arrange one.`)}</p>
      <div class="row"><button class="btn ghost" id="cx" type="button">${t("Chiudi", "Close")}</button><button class="btn" id="wr" type="button">${t("Scrivi a ", "Message ")}${first}</button></div>`);
    $("#cx").onclick = closeSheet; $("#wr").onclick = () => writeTo(p);
    return;
  }
  let pick = days[0].slots[0];
  const wdf = new Intl.DateTimeFormat(LOC, { weekday: "short" }), mf = new Intl.DateTimeFormat(LOC, { month: "short" });
  openSheet(`
    <div class="who">${avatar(p.name)}<div><h2 id="sh-title">${t("Lezione con ", "Lesson with ")}${first}</h2><small class="note">${esc(p.subjects.map(subj).join(", "))} · €${p.price}/${t("ora", "hour")}</small></div></div>
    <div><label>${t("Scegli giorno e ora", "Choose day and time")}</label>
      <div class="daypick" id="daypick">${days.map(({ d }, i) => `<button type="button" data-di="${i}" class="${i ? "" : "on"}" aria-label="${fmtDay(d)}"><small>${wdf.format(d)}</small><b>${d.getDate()}</b><small>${mf.format(d)}</small></button>`).join("")}</div>
      <div class="times" id="times"></div></div>
    <label>${t("Durata", "Length")}<select id="dur"><option value="1">${t("1 ora", "1 hour")}</option><option value="1.5">${t("1 ora e mezza", "1½ hours")}</option><option value="2">${t("2 ore", "2 hours")}</option></select></label>
    ${p.online ? `<label>${t("Dove", "Where")}<select id="mode"><option value="Di persona">${MODE("Di persona")}</option><option value="Online">Online</option></select></label>` : ""}
    <div class="total" id="tot"></div>
    <p class="note">${t(`${first} riceve la richiesta e la conferma. Paghi direttamente a fine lezione, come vi accordate (contanti, Satispay, bonifico). Ripetiamo non incassa nulla.`, `${first} receives the request and confirms it. You pay directly at the end of the lesson, however you agree (cash, payment app, bank transfer). Ripetiamo takes nothing.`)}</p>
    <div class="sheet-actions">
      <label class="agree"><input type="checkbox" id="bk-ok"><span>${t(`Ho letto i <a href="${TERMS}" target="_blank">Termini e condizioni</a> e so che la lezione è un accordo tra me e ${first}.`, `I've read the <a href="${TERMS}" target="_blank">Terms and conditions</a> and understand the lesson is an agreement between me and ${first}.`)}</span></label>
      <div class="row"><button class="btn ghost" id="cx" type="button">${CANCEL}</button><button class="btn" id="ok" type="button">${t("Invia richiesta", "Send request")}</button></div>
    </div>`);
  const showDay = i => {
    $$("#daypick button").forEach(b => b.classList.toggle("on", +b.dataset.di === i));
    $("#times").innerHTML = days[i].slots.map(s => `<button type="button" data-t="${s.getTime()}">${String(s.getHours()).padStart(2, "0")}:00</button>`).join("");
    const tb = $$("#times button");
    const keep = tb.find(b => +b.dataset.t === pick.getTime()) || tb[0];
    keep.classList.add("on"); pick = new Date(+keep.dataset.t);
    tb.forEach(b => b.onclick = () => { tb.forEach(x => x.classList.remove("on")); b.classList.add("on"); pick = new Date(+b.dataset.t); });
  };
  $$("#daypick button").forEach(b => b.onclick = () => showDay(+b.dataset.di));
  showDay(0);
  const upd = () => { const h = +$("#dur").value; $("#tot").innerHTML = `<div><span>${dec(h)} h × €${p.price}</span><span>${eur(p.price * h)}</span></div><div class="big"><span>${t("Da dare a fine lezione", "To pay at the end of the lesson")}</span><span>${eur(Math.round(p.price * h))}</span></div>`; };
  $("#dur").onchange = upd; upd();
  $("#cx").onclick = closeSheet;
  $("#ok").onclick = async () => {
    if (!$("#bk-ok").checked) return toast(t("Per prenotare spunta l'accettazione dei termini", "Tick the box to accept the terms"));
    $("#ok").disabled = true;
    const { error } = await sb.from("bookings").insert({ post_id: p.id, starts_at: pick.toISOString(), hours: +$("#dur").value, mode: $("#mode") ? $("#mode").value : "Di persona" });
    $("#ok").disabled = false;
    if (error) return toast(dbErr(error));
    closeSheet(); toast(t(`Richiesta inviata per ${fmtWhen(pick)}. Ti avvisiamo quando ${p.name.split(" ")[0]} conferma.`, `Request sent for ${fmtWhen(pick)}. You'll see it here when ${p.name.split(" ")[0]} confirms.`));
  };
}

// ---------- messaggi --------------------------------------------------
let msgs = [], openWith = null, msgTimer = null, openPending = false;
const isMobile = () => matchMedia("(max-width:720px)").matches;
function writeTo(p) {
  if (!p) return;
  if (needLogin("annunci")) return;
  const first = p.name.split(" ")[0], s0 = subj(p.subjects[0]);
  const hint = p.kind === "cerco"
    ? t(`Ciao ${first}, ho visto il tuo annuncio di ${s0}. Potrei aiutarti: `, `Hi ${first}, I saw your ${s0} listing. I could help you: `)
    : t(`Ciao ${first}, ho visto il tuo annuncio di ${s0}. `, `Hi ${first}, I saw your ${s0} listing. `);
  openSheet(`<h2 id="sh-title">${p.kind === "cerco" ? t("Proponiti a ", "Offer to help ") : t("Scrivi a ", "Message ")}${esc(first)}</h2>
    <label>${t("Messaggio", "Message")}<textarea id="nm" maxlength="2000">${esc(hint)}</textarea></label>
    <p class="note">${t("Non condividere indirizzo di casa o dati personali finché non vi conoscete. Per i minorenni: avvisa sempre un genitore.", "Don't share your home address or personal details until you know each other. Under 18? Always tell a parent.")}</p>
    <div class="row"><button class="btn ghost" id="cx" type="button">${CANCEL}</button><button class="btn" id="ok" type="button">${t("Invia", "Send")}</button></div>`);
  $("#cx").onclick = closeSheet;
  $("#ok").onclick = async () => {
    const body = $("#nm").value.trim(); if (!body) return toast(t("Scrivi un messaggio", "Write a message"));
    $("#ok").disabled = true;
    const { error } = await sb.from("messages").insert({ recipient: p.author, post_id: p.id, body });
    $("#ok").disabled = false;
    if (error) return toast(dbErr(error));
    closeSheet(); openWith = p.author; openPending = true; location.hash = "messaggi"; toast(t("Messaggio inviato", "Message sent"));
  };
}
async function loadMessages(silent) {
  if (!user) return;
  const { data, error } = await sb.from("messages").select("*").order("created_at", { ascending: true }).limit(1000);
  if (error) { if (!silent) toast(dbErr(error)); return; }
  msgs = data || []; updateBadge();
  if (current === "messaggi") renderThreads();
}
function threads() {
  const m0 = new Map();
  msgs.forEach(m => { const other = m.sender === user.id ? m.recipient : m.sender;
    const th = m0.get(other) || { other, name: "", last: null, unread: 0, post: null };
    const nm = m.sender === user.id ? m.recipient_name : m.sender_name; if (nm) th.name = nm;
    th.last = m; th.post = m.post_id || th.post; if (m.recipient === user.id && !m.read) th.unread++; m0.set(other, th); });
  return [...m0.values()].sort((a, b) => new Date(b.last.created_at) - new Date(a.last.created_at));
}
const USER = t("Utente", "User");
// su telefono si vede o la lista delle chat o una conversazione a schermo pieno
function setChatOpen() { const open = !!openWith && isMobile(); $(".chat").classList.toggle("open", open); $("#v-messaggi").classList.toggle("chatting", open); }
function renderThreads() {
  const ts = threads();
  setChatOpen();
  if (!ts.length) { $("#threads").innerHTML = `<div class="empty">${t('Nessun messaggio. Scrivi a qualcuno dalla <a href="#annunci">bacheca</a>.', 'No messages yet. Write to someone from the <a href="#annunci">listings</a>.')}</div>`; $("#convo").hidden = true; return; }
  if (!openWith || !ts.find(x => x.other === openWith)) openWith = isMobile() ? null : ts[0].other;
  $("#threads").innerHTML = ts.map(x => `<button class="thread${x.other === openWith ? " on" : ""}" data-o="${x.other}" type="button"><b>${esc(x.name || USER)}${x.unread ? `<span class="dot" aria-label="${t("non letto", "unread")}"></span>` : ""}</b><small>${esc(x.last.body)}</small></button>`).join("");
  $$(".thread").forEach(b => b.onclick = () => { openWith = b.dataset.o; renderThreads(); if (isMobile()) window.scrollTo(0, 0); else $("#convo").scrollIntoView({ behavior: "smooth", block: "nearest" }); });
  setChatOpen();
  renderConvo();
}
async function renderConvo() {
  const th = threads().find(x => x.other === openWith);
  if (!th) { $("#convo").hidden = true; return; }
  $("#convo").hidden = false;
  $("#convoH").innerHTML = `<button class="linkbtn back" id="backBtn" type="button" aria-label="${t("Torna ai messaggi", "Back to messages")}">←</button>${esc(th.name || USER)} <button class="report" id="repUser" type="button" style="float:right">${t("Segnala", "Report")}</button>`;
  $("#repUser").onclick = () => report({ id: th.post, name: th.name });
  $("#backBtn").onclick = () => { openWith = null; renderThreads(); };
  const box = $("#msgs");
  box.innerHTML = msgs.filter(m => m.sender === th.other || m.recipient === th.other).map(m =>
    `<div class="msg ${m.sender === user.id ? "out" : "in"}">${esc(m.body)}<time>${fmtWhen(m.created_at)}</time></div>`).join("");
  box.scrollTop = box.scrollHeight;
  if (th.unread) {
    await sb.from("messages").update({ read: true }).eq("sender", th.other).eq("recipient", user.id).eq("read", false);
    msgs.forEach(m => { if (m.sender === th.other && m.recipient === user.id) m.read = true; }); updateBadge();
    $$(".thread.on .dot").forEach(d => d.remove());
  }
}
$("#compose").onsubmit = async e => {
  e.preventDefault();
  const body = $("#msgText").value.trim(); if (!body || !openWith) return;
  const th = threads().find(x => x.other === openWith);
  const { error } = await sb.from("messages").insert({ recipient: openWith, post_id: th && th.post, body });
  if (error) return toast(dbErr(error));
  $("#msgText").value = ""; loadMessages();
};
$("#msgText").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#compose").requestSubmit(); } });
function updateBadge() {
  const n = user ? msgs.filter(m => m.recipient === user.id && !m.read).length : 0;
  const b = $("#unread"); b.hidden = !n; b.textContent = n > 9 ? "9+" : n;
}
function startPolling() { clearInterval(msgTimer); if (user) msgTimer = setInterval(() => loadMessages(true), current === "messaggi" ? 15000 : 60000); }

// ---------- segnalazioni ----------------------------------------------
function report(p) {
  if (!p) return;
  if (needLogin("annunci")) return;
  const reasons = EN
    ? ["Offensive or inappropriate content", "Inappropriate behaviour during a lesson", "Fake listing or spam", "It makes me uncomfortable or worried", "Other"]
    : ["Contenuto offensivo o inappropriato", "Comportamento scorretto durante una lezione", "Annuncio falso o spam", "Mi mette a disagio o mi preoccupa", "Altro"];
  openSheet(`<h2 id="sh-title">${t("Segnala ", "Report ")}${esc(p.name || "")}</h2>
    <label>${t("Motivo", "Reason")}<select id="rr">${reasons.map(r => `<option>${r}</option>`).join("")}</select></label>
    <label>${t("Raccontaci cosa è successo", "Tell us what happened")}<textarea id="rt" maxlength="1000"></textarea></label>
    <p class="note">${t("Leggiamo ogni segnalazione. Se c'è un pericolo immediato, chiama il 112.", "We read every report. If there's immediate danger, call 112.")}</p>
    <div class="row"><button class="btn ghost" id="cx" type="button">${CANCEL}</button><button class="btn" id="ok" type="button">${t("Invia segnalazione", "Send report")}</button></div>`);
  $("#cx").onclick = closeSheet;
  $("#ok").onclick = async () => {
    const reason = (EN ? "[EN] " : "") + $("#rr").value + ($("#rt").value.trim() ? ": " + $("#rt").value.trim() : "");
    const { error } = await sb.from("reports").insert({ post_id: p.id || null, reason });
    if (error) return toast(dbErr(error));
    closeSheet(); toast(t("Segnalazione inviata. Grazie.", "Report sent. Thank you."));
  };
}

// ---------- pubblica ---------------------------------------------------
let kind = "offro";
const COPY = EN ? {
  offro: { school: "School or university", price: "Hourly rate (€)", on: "I also teach online", bio: "About you",
    ok: `I'm 18 or over, I accept the <a href="${TERMS}" target="_blank">Terms and conditions</a> and I understand that I, not Ripetiamo, offer the lessons.` },
  cerco: { school: "Year or course", price: "Maximum budget per hour (€)", on: "Online is fine too", bio: "What you need",
    ok: `I accept the <a href="${TERMS}" target="_blank">Terms and conditions</a>.` } } : {
  offro: { school: "Scuola o università", price: "Prezzo orario (€)", on: "Faccio lezione anche online", bio: "Presentati",
    ok: `Ho almeno 18 anni, accetto i <a href="${TERMS}" target="_blank">Termini e condizioni</a> e so che sono io, non Ripetiamo, a offrire le lezioni.` },
  cerco: { school: "Classe o corso", price: "Budget massimo all'ora (€)", on: "Va bene anche online", bio: "Cosa ti serve",
    ok: `Accetto i <a href="${TERMS}" target="_blank">Termini e condizioni</a>.` } };
function setKind(k) { kind = k; const c = COPY[k];
  $$(".seg button").forEach(b => { b.classList.toggle("on", b.dataset.k === k); b.setAttribute("aria-pressed", b.dataset.k === k); });
  $("#pf-schoolL").textContent = c.school; $("#pf-priceL").textContent = c.price; $("#pf-onL").textContent = c.on; $("#pf-bioL").textContent = c.bio; $("#pf-okL").innerHTML = c.ok; $("#pf-ok").checked = false; }
$$(".seg button").forEach(b => b.onclick = () => {
  if (b.dataset.k === "offro" && profile && !isAdult()) return toast(t("Per offrire ripetizioni devi avere almeno 18 anni. Puoi pubblicare un annuncio per cercarle.", "You must be 18 or over to offer tutoring. You can post a listing to look for it."));
  setKind(b.dataset.k); });
const checkPfWhere = locField($("#pf-where"), $("#pfLoc"));
function preparePublish() {
  if (profile && !$("#pf-name").value) $("#pf-name").value = profile.display_name;
  if (profile && !isAdult() && kind === "offro") setKind("cerco");
  if (!$("#pf-where").value && !me.mine) { $("#pf-where").value = me.label; checkPfWhere(); }
}
// le materie scritte in inglese si salvano in italiano, così i filtri funzionano per tutti
const SUBJ_IT = Object.fromEntries(Object.entries(SUBJ_EN).map(([it, en]) => [en.toLowerCase(), it]));
$("#pubForm").onsubmit = async e => {
  e.preventDefault();
  if (needLogin("pubblica")) return;
  const pl = $("#pf-where")._place || await checkPfWhere();
  if (!pl) { $("#pf-where").focus(); return toast(t("Scrivi una zona che riconosciamo: città o quartiere", "Enter an area we recognise: city or neighbourhood")); }
  const subjects = [...new Set($("#pf-sub").value.split(",").map(s => s.trim()).filter(Boolean)
    .map(s => SUBJ_IT[s.toLowerCase()] || (s[0].toUpperCase() + s.slice(1))))].slice(0, 6);
  const body = $("#pf-bio").value.trim(), name = $("#pf-name").value.trim(), price = Math.round(+$("#pf-price").value);
  if (name.length < 2) return toast(t("Scrivi il nome da mostrare", "Enter a display name"));
  if (!subjects.length) return toast(t("Scrivi almeno una materia", "Enter at least one subject"));
  if (!(price >= 5 && price <= 200)) return toast(t("Il prezzo deve essere tra 5 e 200 € l'ora", "The price must be between €5 and €200 an hour"));
  if (body.length < 10) return toast(t("Scrivi almeno una frase su di te o su cosa ti serve", "Write at least one sentence about you or what you need"));
  if (!$("#pf-ok").checked) return toast(t("Per pubblicare spunta l'accettazione dei termini", "Tick the box to accept the terms"));
  const btn = $("#pf-send"); btn.disabled = true;
  const { error } = await sb.from("posts").insert({ kind, name, school: $("#pf-school").value.trim(), subjects, price, body, place_label: pl.label, lat: pl.lat, lon: pl.lon, online: $("#pf-on").checked });
  btn.disabled = false;
  if (error) return toast(dbErr(error));
  $("#pf-bio").value = ""; $("#pf-sub").value = ""; $("#pf-ok").checked = false;
  toast(kind === "offro" ? t("Annuncio pubblicato. Ricordati di indicare quando sei disponibile.", "Listing posted. Remember to set when you're available.") : t("Annuncio pubblicato.", "Listing posted."));
  location.hash = kind === "offro" ? "spazio" : "annunci";
  if (kind !== "offro") loadPosts();
};

// ---------- il mio spazio ---------------------------------------------
let bookings = [], myAvail = new Set(), weekOff = 0, reviewed = new Set();
const DAYN = EN ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const HRS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
async function loadSpazio() {
  if (!user || !profile) return;
  $("#hiName").textContent = t("Ciao ", "Hi ") + profile.display_name.split(" ")[0] + " 👋";
  $("#acctInfo").textContent = (user.email || "") + t(" · iscritto dal ", " · member since ") + new Date(profile.created_at).toLocaleDateString(LOC);
  $("#ics").value = CFG.CALENDAR_URL + "?token=" + profile.calendar_token;
  const [b, a, p, rv] = await Promise.all([
    sb.from("bookings").select("*").order("starts_at", { ascending: true }).limit(500),
    sb.from("availability").select("weekday,hour").eq("tutor", user.id),
    sb.from("posts").select("*").eq("author", user.id).order("created_at", { ascending: false }),
    sb.from("reviews").select("booking_id").eq("student", user.id)
  ]);
  if (b.error || a.error || p.error) return toast(dbErr(b.error || a.error || p.error));
  bookings = b.data || []; myAvail = new Set((a.data || []).map(x => x.weekday + "-" + x.hour));
  reviewed = new Set((rv.data || []).map(x => x.booking_id));
  setupSharePanel(p.data || []);
  renderSpazio(p.data || []);
}
function bkItem(x, role) {
  const other = role === "tutor" ? x.student_name : x.tutor_name, past = new Date(x.starts_at) < new Date();
  const acts = [];
  if (role === "tutor" && x.status === "richiesta" && !past) acts.push(`<button class="btn" data-bk="${x.id}" data-do="confermata" type="button">${t("Conferma", "Confirm")}</button>`, `<button class="btn ghost" data-bk="${x.id}" data-do="rifiutata" type="button">${t("Rifiuta", "Decline")}</button>`);
  if (role === "tutor" && x.status === "confermata" && !x.paid) acts.push(`<button class="btn" data-bk="${x.id}" data-do="paid" type="button">${t("Segna incassato", "Mark as paid")}</button>`);
  if (["richiesta", "confermata"].includes(x.status) && !past) acts.push(`<button class="btn ghost" data-bk="${x.id}" data-do="annullata" type="button">${CANCEL}</button>`);
  if (role === "student" && x.status === "confermata" && past) acts.unshift(reviewed.has(x.id)
    ? `<span class="pill ok">${t("Recensita ✓", "Reviewed ✓")}</span>`
    : `<button class="btn" data-rev="${x.id}" type="button">${t("★ Lascia una recensione", "★ Leave a review")}</button>`);
  acts.push(`<button class="btn ghost" data-chat="${role === "tutor" ? x.student : x.tutor}" type="button">${t("Scrivi", "Message")}</button>`);
  return `<div class="item"><div class="txt"><b>${esc(subj(x.subject))} ${t("con", "with")} ${esc(other)}</b><small>${fmtWhen(x.starts_at)} · ${dec(x.hours)} h · ${esc(MODE(x.mode))} · ${eur(x.price)}${x.paid ? t(" · incassato", " · paid") : ""}</small></div>
    <span class="status ${x.status}">${STATUS(x.status)}</span><div class="acts">${acts.join("")}</div></div>`;
}
function renderSpazio(myPosts) {
  const now = new Date(), uid = user.id;
  const asTutor = bookings.filter(x => x.tutor === uid), asStudent = bookings.filter(x => x.student === uid);
  const pending = asTutor.filter(x => x.status === "richiesta" && new Date(x.starts_at) > now);
  const tutorList = asTutor.filter(x => x.status === "confermata" && (new Date(x.starts_at) > now || !x.paid));
  const studList = asStudent.filter(x => (x.status === "richiesta" && new Date(x.starts_at) > now) || (x.status === "confermata" && new Date(x.starts_at) > new Date(now - 60 * 864e5)))
    .sort((a, b) => (new Date(a.starts_at) < now) - (new Date(b.starts_at) < now) || new Date(a.starts_at) - new Date(b.starts_at));
  const empty = m => `<p class="note">${m}</p>`;
  $("#bkPending").innerHTML = pending.map(x => bkItem(x, "tutor")).join("") || empty(t("Nessuna richiesta in attesa.", "No pending requests."));
  $("#bkTutor").innerHTML = tutorList.map(x => bkItem(x, "tutor")).join("") || empty(t("Nessuna lezione confermata.", "No confirmed lessons."));
  $("#bkStudent").innerHTML = studList.map(x => bkItem(x, "student")).join("") || empty(t('Non hai prenotato lezioni. <a href="#annunci">Cerca un tutor</a>.', 'You haven\'t booked any lessons. <a href="#annunci">Find a tutor</a>.'));
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const toCash = asTutor.filter(x => x.status === "confermata" && !x.paid && new Date(x.starts_at) < now).reduce((s, x) => s + x.price, 0);
  const monthLessons = asTutor.filter(x => x.status === "confermata" && new Date(x.starts_at) >= mStart);
  $("#kpis").innerHTML = `<div class="kpi"><small>${t("Richieste", "Requests")}</small><b>${pending.length}</b><span>${t("da confermare", "to confirm")}</span></div>
    <div class="kpi"><small>${t("Questo mese", "This month")}</small><b>${monthLessons.length}</b><span>${t("lezioni", "lessons")} · ${eur(monthLessons.reduce((s, x) => s + x.price, 0))}</span></div>
    <div class="kpi"><small>${t("Da incassare", "To collect")}</small><b>${eur(toCash)}</b><span>${t("lezioni già fatte", "lessons already given")}</span></div>`;
  renderWeek(); renderAvail();
  const hasOffer = myPosts.some(p => p.kind === "offro");
  $("#myPosts").innerHTML = myPosts.map(p => `<div class="item"><div class="txt"><b>${p.kind === "offro" ? t("Offro", "Offering") : t("Cerco", "Looking for")}: ${esc(p.subjects.map(subj).join(", "))}</b><small>${esc(p.place_label)} · €${p.price}/${t("ora", "hour")} · ${p.active ? t("visibile", "visible") : t("in pausa", "paused")}</small></div>
    <div class="acts"><button class="btn ghost" data-pp="${p.id}" data-act="${p.active ? "pause" : "on"}" type="button">${p.active ? t("Metti in pausa", "Pause") : t("Riattiva", "Reactivate")}</button><button class="btn ghost danger" data-pdel="${p.id}" type="button">${t("Elimina", "Delete")}</button></div></div>`).join("")
    || empty(t('Non hai annunci. <a href="#pubblica">Pubblicane uno</a>.', 'You have no listings. <a href="#pubblica">Post one</a>.'));
  if (hasOffer && !myAvail.size) $("#bkPending").insertAdjacentHTML("afterbegin", `<div class="banner">${t("Non hai ancora indicato quando sei disponibile: finché non lo fai, nessuno può prenotare. Usa la tabella «Quando sei disponibile».", "You haven't set when you're available yet: until you do, nobody can book you. Use the “When you're available” table.")}</div>`);
  bindSpazio();
}
function bindSpazio() {
  $$("[data-bk]").forEach(b => b.onclick = async () => {
    const id = +b.dataset.bk, d = b.dataset.do, patch = d === "paid" ? { paid: true } : { status: d };
    b.disabled = true;
    const { error } = await sb.from("bookings").update(patch).eq("id", id);
    if (error) { b.disabled = false; return toast(dbErr(error)); }
    toast((EN ? { confermata: "Lesson confirmed", rifiutata: "Request declined", annullata: "Lesson cancelled", paid: "Marked as paid" }
              : { confermata: "Lezione confermata", rifiutata: "Richiesta rifiutata", annullata: "Lezione annullata", paid: "Segnata come incassata" })[d]);
    loadSpazio();
  });
  $$("[data-rev]").forEach(b => b.onclick = () => reviewSheet(bookings.find(x => String(x.id) === b.dataset.rev)));
  $$("[data-chat]").forEach(b => b.onclick = () => { openWith = b.dataset.chat; openPending = true; location.hash = "messaggi"; });
  $$("[data-pp]").forEach(b => b.onclick = async () => {
    const { error } = await sb.from("posts").update({ active: b.dataset.act === "on" }).eq("id", +b.dataset.pp);
    if (error) return toast(dbErr(error)); loadSpazio(); loadPosts();
  });
  $$("[data-pdel]").forEach(b => b.onclick = async () => {
    if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = t("Conferma eliminazione", "Confirm delete"); return; }
    const { error } = await sb.from("posts").delete().eq("id", +b.dataset.pdel);
    if (error) return toast(dbErr(error)); toast(t("Annuncio eliminato", "Listing deleted")); loadSpazio(); loadPosts();
  });
}
function weekStart() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + weekOff * 7); return d; }
function renderWeek() {
  const ws = weekStart(), we = new Date(ws); we.setDate(we.getDate() + 6);
  const f = new Intl.DateTimeFormat(LOC, { day: "numeric", month: "short" });
  $("#weekLabel").textContent = `${t("Settimana", "Week of")} ${f.format(ws)} – ${f.format(we)}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const live = bookings.filter(x => ["richiesta", "confermata"].includes(x.status));
  let h = `<div></div>` + DAYN.map((n, i) => { const d = new Date(ws); d.setDate(d.getDate() + i); return `<div class="dh${d.getTime() === today.getTime() ? " today" : ""}">${n} ${d.getDate()}</div>`; }).join("");
  HRS.forEach(hr => { h += `<div class="hr">${hr}:00</div>`;
    for (let i = 0; i < 7; i++) {
      const s = new Date(ws); s.setDate(s.getDate() + i); s.setHours(hr);
      const x = live.find(b => new Date(b.starts_at).getTime() === s.getTime());
      const lbl = x ? (x.tutor === user.id ? x.student_name : t("con ", "with ") + x.tutor_name) : "";
      h += `<div class="slot${!x && myAvail.has((i + 1) + "-" + hr) ? " free" : ""}">${x ? `<div class="ev${x.status === "richiesta" ? " req" : ""}" title="${esc(subj(x.subject) + " · " + lbl)}"><b>${esc(lbl)}</b>${esc(subj(x.subject))}</div>` : ""}</div>`;
    } });
  $("#week").innerHTML = h;
}
$("#wkPrev").onclick = () => { weekOff--; renderWeek(); };
$("#wkNext").onclick = () => { weekOff++; renderWeek(); };
function renderAvail() {
  let h = `<div></div>` + DAYN.map(n => `<div class="d">${n}</div>`).join("");
  HRS.forEach(hr => { h += `<div class="h">${hr}</div>` + DAYN.map((_, i) => { const k = (i + 1) + "-" + hr;
    return `<button type="button" data-av="${k}" class="${myAvail.has(k) ? "on" : ""}" aria-pressed="${myAvail.has(k)}" aria-label="${DAYN[i]} ${t("ore", "at")} ${hr}"></button>`; }).join(""); });
  $("#avail").innerHTML = h;
  $$("[data-av]").forEach(b => b.onclick = async () => {
    if (!isAdult()) return toast(t("Le disponibilità servono a chi offre lezioni (solo maggiorenni).", "Availability is for people offering lessons (18+ only)."));
    const [wd, hr] = b.dataset.av.split("-").map(Number), on = myAvail.has(b.dataset.av);
    b.classList.toggle("on", !on); b.setAttribute("aria-pressed", !on);
    const { error } = on ? await sb.from("availability").delete().match({ tutor: user.id, weekday: wd, hour: hr })
                         : await sb.from("availability").insert({ weekday: wd, hour: hr });
    if (error) { b.classList.toggle("on", on); return toast(dbErr(error)); }
    on ? myAvail.delete(b.dataset.av) : myAvail.add(b.dataset.av); renderWeek();
  });
}
$("#copyIcs").onclick = () => { const i = $("#ics"), fb = () => { i.select(); toast(t("Link selezionato: copialo", "Link selected: copy it")); };
  try { navigator.clipboard.writeText(i.value).then(() => toast(t("Link copiato", "Link copied")), fb); } catch (e) { fb(); } };
const HOW = EN ? {
  google: "On a computer, open Google Calendar → “Other calendars” → “+” → “From URL”, paste the link and confirm. New lessons can take a few hours to appear.",
  apple: "On iPhone: Settings → Calendar → Accounts → Add Account → Other → “Add Subscribed Calendar”, paste the link and save." } : {
  google: "Su computer apri Google Calendar → «Altri calendari» → «+» → «Da URL», incolla il link e conferma. Le nuove lezioni possono metterci qualche ora a comparire.",
  apple: "Su iPhone: Impostazioni → Calendario → Account → Aggiungi account → Altro → «Aggiungi calendario sottoscritto», incolla il link e salva." };
$$("[data-how]").forEach(b => b.onclick = () => { const h = $("#howto"); h.textContent = HOW[b.dataset.how]; h.hidden = false; });
$("#logout").onclick = async () => { await sb.auth.signOut(); toast(t("Sei uscito", "You've logged out")); location.hash = "annunci"; };
$("#delAcct").onclick = () => {
  const WORD = t("ELIMINA", "DELETE");
  openSheet(`<h2 id="sh-title">${t("Eliminare l'account?", "Delete your account?")}</h2><p>${t("Cancelliamo per sempre profilo, annunci, prenotazioni e messaggi. Non si può tornare indietro.", "We'll permanently delete your profile, listings, bookings and messages. This can't be undone.")}</p>
    <label>${t("Scrivi ELIMINA per confermare", "Type DELETE to confirm")}<input id="delTxt" autocomplete="off"></label>
    <div class="row"><button class="btn ghost" id="cx" type="button">${CANCEL}</button><button class="btn danger" id="ok" type="button">${t("Elimina per sempre", "Delete forever")}</button></div>`);
  $("#cx").onclick = closeSheet;
  $("#ok").onclick = async () => {
    if ($("#delTxt").value.trim().toUpperCase() !== WORD) return toast(t("Scrivi ELIMINA per confermare", "Type DELETE to confirm"));
    const { error } = await sb.rpc("delete_my_account");
    if (error) return toast(dbErr(error));
    await sb.auth.signOut(); closeSheet(); toast(t("Account eliminato", "Account deleted")); location.hash = "annunci";
  };
};

// ---------- recensioni ------------------------------------------------
function reviewSheet(x) {
  if (!x) return;
  let rating = 0;
  openSheet(`<h2 id="sh-title">${t("Com'è andata con ", "How was your lesson with ")}${esc(x.tutor_name)}?</h2>
    <p class="note">${esc(subj(x.subject))} · ${fmtWhen(x.starts_at)}</p>
    <div class="starpick" role="radiogroup" aria-label="${t("Voto", "Rating")}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-s="${n}" role="radio" aria-checked="false" aria-label="${n}/5">★</button>`).join("")}</div>
    <label>${t("Racconta in breve (facoltativo)", "Tell others briefly (optional)")}<textarea id="revTxt" maxlength="500" placeholder="${t("Es. Spiega con calma, mi ha aiutato a passare la verifica.", "E.g. Explains calmly, helped me pass my test.")}"></textarea></label>
    <p class="note">${t("La recensione è pubblica e mostra il tuo nome. Sii onesto e rispettoso.", "Your review is public and shows your name. Be honest and respectful.")}</p>
    <div class="row"><button class="btn ghost" id="cx" type="button">${CANCEL}</button><button class="btn" id="ok" type="button">${t("Pubblica recensione", "Post review")}</button></div>`);
  const sb2 = $$("#sheet .starpick button");
  sb2.forEach(b => b.onclick = () => { rating = +b.dataset.s; sb2.forEach(z => { const on = +z.dataset.s <= rating; z.classList.toggle("on", on); z.setAttribute("aria-checked", +z.dataset.s === rating); }); });
  $("#cx").onclick = closeSheet;
  $("#ok").onclick = async () => {
    if (!rating) return toast(t("Scegli da 1 a 5 stelle", "Pick 1 to 5 stars"));
    $("#ok").disabled = true;
    const { error } = await sb.from("reviews").insert({ booking_id: x.id, rating, body: $("#revTxt").value.trim() });
    $("#ok").disabled = false;
    if (error) return toast(error.code === "23505" ? t("Hai già recensito questa lezione.", "You've already reviewed this lesson.") : dbErr(error));
    closeSheet(); toast(t("Grazie! Recensione pubblicata.", "Thanks! Review posted.")); loadSpazio();
  };
}

// ---------- profilo pubblico del tutor ---------------------------------
// i link condivisi puntano sempre al dominio vero, anche se il sito è aperto dall'indirizzo provvisorio
const SITE_URL = /(^|\.)ripetiamo\.eu$/.test(location.hostname) ? location.origin : "https://ripetiamo.eu";
const profileUrl = slug => SITE_URL + "/#t/" + encodeURIComponent(slug);
async function loadTutor(slug) {
  const box = $("#tutorBox");
  box.innerHTML = `<p class="loading">${t("Carico il profilo…", "Loading profile…")}</p>`;
  const { data, error } = await sb.rpc("tutor_profile", { p_slug: slug });
  if (error) { box.innerHTML = `<div class="empty">${esc(dbErr(error))}</div>`; return; }
  if (!data) { box.innerHTML = `<div class="empty">${t('Profilo non trovato. Forse il link è sbagliato o il tutor ha chiuso l\'account. <a href="#annunci">Guarda gli annunci</a>.', 'Profile not found. The link may be wrong or the tutor closed their account. <a href="#annunci">See listings</a>.')}</div>`; return; }
  const P = data, first = esc(P.name.split(" ")[0]);
  const since = new Date(P.since).toLocaleDateString(LOC, { month: "long", year: "numeric" });
  const posts = P.posts.map(x => ({ ...x, slug: null, verified_school: null, reviews_count: 0 }));
  const facts = [
    P.reviews_count ? `<span><b>★ ${dec(P.rating)}</b> · ${P.reviews_count} ${P.reviews_count === 1 ? t("recensione", "review") : t("recensioni", "reviews")}</span>` : `<span>${t("Ancora nessuna recensione", "No reviews yet")}</span>`,
    `<span><b>${P.lessons}</b> ${P.lessons === 1 ? t("lezione fatta", "lesson given") : t("lezioni fatte", "lessons given")}</span>`,
    `<span>${t("Su Ripetiamo da ", "On Ripetiamo since ")}${esc(since)}</span>`];
  box.innerHTML = `
    <div class="tutor-head">
      ${avatar(P.name)}
      <div class="th-main"><h1>${esc(P.name)}</h1>${vBadge(P.school)}<div class="facts">${facts.join("")}</div></div>
      <div class="th-acts"><button class="btn ghost" id="tShare" type="button">${t("Condividi", "Share")}</button></div>
    </div>
    <h2 class="sec">${t("Annunci di ", "Listings by ")}${first}</h2>
    <div class="grid" id="tPosts">${posts.length ? posts.map(postCard).join("") : `<div class="empty">${t("Nessun annuncio attivo in questo momento.", "No active listings right now.")}</div>`}</div>
    <h2 class="sec">${t("Recensioni", "Reviews")}</h2>
    <div class="reviews">${P.reviews.length ? P.reviews.map(rv => `<div class="rev"><div class="rev-h"><span class="stars">${stars(rv.rating)}</span><b>${esc(rv.name)}</b><small>${new Date(rv.at).toLocaleDateString(LOC)}</small></div>${rv.body ? `<p>${esc(rv.body)}</p>` : ""}</div>`).join("")
      : `<p class="note">${t("Le recensioni le possono scrivere solo gli studenti che hanno fatto davvero una lezione.", "Only students who actually had a lesson can write a review.")}</p>`}</div>`;
  bindCards($("#tPosts"));
  $("#tShare").onclick = () => shareProfile(P);
}

// ---------- immagine per le storie (1080×1920) --------------------------
let qrLib = null;
function loadQR() {
  if (window.qrcode) return Promise.resolve();
  return qrLib || (qrLib = new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); }));
}
function wrapText(ctx, text, maxW) {
  const words = text.split(" "), lines = []; let line = "";
  for (const w of words) { const test = line ? line + " " + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line); return lines;
}
async function makeStory(P) {
  try { await Promise.all([document.fonts.load('800 100px "Gabarito"'), document.fonts.load('600 40px "Figtree"'), loadQR()]); } catch (e) {}
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  const D = '"Gabarito", "Trebuchet MS", sans-serif', B = '"Figtree", system-ui, sans-serif';
  const subs = [...new Set(P.posts.flatMap(p => p.subjects))].map(subj);
  const minP = P.posts.length ? Math.min(...P.posts.map(p => p.price)) : null;
  const city = P.posts[0] ? P.posts[0].place_label.split(",").pop().trim() : "";
  const online = P.posts.some(p => p.online);
  // sfondo
  x.fillStyle = "#FFF6EF"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#FFE3C8"; x.beginPath(); x.arc(W - 40, 260, 360, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#EDE4F6"; x.beginPath(); x.arc(-60, H - 380, 300, 0, Math.PI * 2); x.fill();
  // logo
  x.fillStyle = "#F2994A"; x.beginPath(); x.roundRect(90, 110, 84, 84, [42, 42, 42, 18]); x.fill();
  x.fillStyle = "#FFF6EF"; x.beginPath(); x.arc(132, 152, 20, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#2B2233"; x.font = `800 64px ${D}`; x.textBaseline = "middle"; x.fillText("Ripetiamo", 196, 154);
  x.textBaseline = "alphabetic";
  // blocco centrale: prima lo misuro, poi lo centro nello spazio libero tra logo e QR
  const subText = subs.join(" · ") || t("Ripetizioni", "Tutoring");
  let size = 150; x.font = `800 ${size}px ${D}`;
  let lines = wrapText(x, subText, W - 180);
  while (lines.length > 3 && size > 84) { size -= 12; x.font = `800 ${size}px ${D}`; lines = wrapText(x, subText, W - 180); }
  lines = lines.slice(0, 3);
  const details = [city && "📍 " + city + (online ? t(" · anche online", " · also online") : ""), minP && t("da ", "from ") + "€" + minP + t("/ora", "/hour")].filter(Boolean);
  const blockH = 60 + 20 + lines.length * size * 1.05 + 40 + details.length * 80 + (P.reviews_count ? 80 : 0) + 40 + 70 + (P.school ? 100 : 0);
  let y = 300 + Math.max(0, (1220 - 300 - blockH) / 2) + 60;
  x.fillStyle = "#7A6B70"; x.font = `600 58px ${B}`; x.fillText(t("Do ripetizioni di", "I teach"), 90, y);
  y += 20 + size; x.fillStyle = "#2B2233"; x.font = `800 ${size}px ${D}`;
  lines.forEach((l, i) => { x.fillText(l, 90, y); if (i < lines.length - 1) y += size * 1.05; });
  y += 40 + 52; x.font = `600 52px ${B}`; x.fillStyle = "#2B2233";
  details.forEach(dl => { x.fillText(dl, 90, y); y += 80; });
  if (P.reviews_count) { x.fillStyle = "#F2994A"; x.fillText("★ " + dec(P.rating) + "  (" + P.reviews_count + ")", 90, y); y += 80; }
  // nome e badge
  y += 40; x.fillStyle = "#2B2233"; x.font = `800 70px ${D}`; x.fillText(P.name, 90, y); y += 34;
  if (P.school) {
    x.font = `700 40px ${B}`; const tx = "✓ " + P.school, tw = x.measureText(tx).width;
    x.fillStyle = "#DDF2E5"; x.beginPath(); x.roundRect(90, y, tw + 52, 68, 34); x.fill();
    x.fillStyle = "#2F8F5B"; x.fillText(tx, 116, y + 48);
  }
  // riquadro con QR
  const bx = 90, by = 1290, bw = W - 180, bh = 500;
  x.fillStyle = "#FFFFFF"; x.beginPath(); x.roundRect(bx, by, bw, bh, 40); x.fill();
  const url = profileUrl(P.slug);
  if (window.qrcode) {
    const q = qrcode(0, "M"); q.addData(url); q.make();
    const n = q.getModuleCount(), qs = 380, cell = qs / n, qx = bx + 50, qy = by + 60;
    x.fillStyle = "#2B2233";
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(qx + k * cell, qy + r * cell, Math.ceil(cell), Math.ceil(cell));
  }
  x.fillStyle = "#2B2233"; x.font = `800 58px ${D}`;
  wrapText(x, t("Prenota una lezione", "Book a lesson"), bw - 520).forEach((l, i) => x.fillText(l, bx + 470, by + 150 + i * 66));
  x.fillStyle = "#7A6B70"; x.font = `600 38px ${B}`;
  wrapText(x, t("Inquadra il codice o cercami su", "Scan the code or find me on"), bw - 520).forEach((l, i) => x.fillText(l, bx + 470, by + 300 + i * 46));
  x.fillStyle = "#6B4E8A"; x.font = `800 42px ${B}`; x.fillText(SITE_URL.replace(/^https?:\/\//, ""), bx + 470, by + 420);
  x.fillStyle = "#7A6B70"; x.font = `700 40px ${D}`; x.textAlign = "center"; x.fillText("For students, by students.", W / 2, H - 70);
  return await new Promise(res => c.toBlob(res, "image/png"));
}
async function shareProfile(P) {
  const url = profileUrl(P.slug);
  openSheet(`<p class="loading">${t("Preparo l'immagine…", "Preparing the image…")}</p>`);
  let blob = null; try { blob = await makeStory(P); } catch (e) {}
  const text = t("Do ripetizioni su Ripetiamo, prenota qui:", "I give lessons on Ripetiamo, book here:");
  const img = blob ? URL.createObjectURL(blob) : "";
  openSheet(`<h2 id="sh-title">${t("Condividi il profilo", "Share your profile")}</h2>
    ${img ? `<img class="story-prev" src="${img}" alt="${t("Anteprima dell'immagine per le storie", "Story image preview")}">` : ""}
    <p class="note">${t("Su Instagram pubblica l'immagine nelle storie e aggiungi lo sticker «Link» con il tuo indirizzo. Su WhatsApp mandala con il link.", "On Instagram, post the image to your story and add the “Link” sticker with your address. On WhatsApp, send it with the link.")}</p>
    <div class="icsrow"><input readonly value="${esc(url)}" id="shUrl" aria-label="Link"><button class="btn ghost" id="shCopy" type="button">${t("Copia", "Copy")}</button></div>
    <div class="row sheet-actions">${img ? `<a class="btn ghost" href="${img}" download="ripetiamo-${esc(P.slug)}.png">${t("Scarica immagine", "Download image")}</a>` : ""}<button class="btn" id="shGo" type="button">${t("Condividi…", "Share…")}</button></div>`);
  $("#shCopy").onclick = () => { const i = $("#shUrl"); try { navigator.clipboard.writeText(url).then(() => toast(t("Link copiato", "Link copied")), () => { i.select(); }); } catch (e) { i.select(); } };
  $("#shGo").onclick = async () => {
    const file = blob ? new File([blob], `ripetiamo-${P.slug}.png`, { type: "image/png" }) : null;
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: text + " " + url });
      else if (navigator.share) await navigator.share({ title: "Ripetiamo", text, url });
      else { await navigator.clipboard.writeText(url); toast(t("Link copiato: incollalo dove vuoi", "Link copied: paste it anywhere")); }
    } catch (e) { if (e && e.name !== "AbortError") toast(t("Condivisione non riuscita: scarica l'immagine e copia il link.", "Sharing failed: download the image and copy the link.")); }
  };
}
function setupSharePanel(myPosts) {
  const panel = $("#sharePanel");
  const show = isAdult() && profile.slug;
  panel.hidden = !show; if (!show) return;
  const url = profileUrl(profile.slug);
  $("#profUrl").value = url; $("#viewProf").href = "#t/" + encodeURIComponent(profile.slug);
  $("#badgeNote").innerHTML = profile.verified_school
    ? `${vBadge(profile.verified_school)} ${t("Hai il badge Studente verificato.", "You have the Verified student badge.")}`
    : t("Il badge «Studente verificato» compare a chi si iscrive con l'email dell'università (per es. @studenti.unimi.it, @mail.polimi.it).", "The “Verified student” badge appears for people who sign up with their university email (e.g. @studenti.unimi.it, @mail.polimi.it).");
  $("#copyProf").onclick = () => { const i = $("#profUrl"); try { navigator.clipboard.writeText(url).then(() => toast(t("Link copiato", "Link copied")), () => i.select()); } catch (e) { i.select(); } };
  $("#shareStory").onclick = async () => {
    if (!myPosts.some(p => p.kind === "offro" && p.active)) return toast(t("Pubblica prima un annuncio in cui offri ripetizioni.", "First post a listing offering tutoring."));
    const { data } = await sb.rpc("tutor_profile", { p_slug: profile.slug });
    if (data) shareProfile(data);
  };
}

// ---------- avvio -----------------------------------------------------
sb.auth.onAuthStateChange((ev, session) => {
  const was = user && user.id; user = session ? session.user : null;
  if ((user && user.id) === was && ev !== "SIGNED_IN") return;
  setTimeout(async () => {   // fuori dal callback, come consiglia Supabase
    await loadProfile();
    if (location.search.includes("code=")) history.replaceState(null, "", location.pathname + location.hash);
    if (user && !profile) { location.hash === "#accesso" ? renderAuth() : (location.hash = "accesso"); }
    else if (user && profile && current === "accesso") goNext();
    else route();
    if (user) loadMessages(true); else { msgs = []; updateBadge(); }
    startPolling(); renderPosts();
  }, 0);
});
addEventListener("hashchange", startPolling);
setKind("offro");
$("#where")._place = me; $("#whereLoc").className = "loc ok"; $("#whereLoc").textContent = "✓ " + me.label;
loadPosts();
// la prima pagina si mostra quando sappiamo se l'utente è collegato
sb.auth.getSession().then(({ data }) => { if (!data.session) route(); }).catch(() => route());
