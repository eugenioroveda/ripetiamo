// Ripetiamo · generatore delle pagine statiche (nessuna dipendenza: `node scripts/build.mjs`).
// Legge gli annunci pubblici da Supabase e genera:
//   /ripetizioni/<materia>-<città>/   pagine città × materia, con gli annunci già nell'HTML (noindex se vuote)
//   /ripetizioni/                     indice
//   /t/<slug>/                        profilo pubblico di ogni tutor con annunci attivi
//   /universita/ e /universita/<ateneo>/<esame>/   pagine per esame universitario (solo dove ci sono tutor)
//   /sitemap.xml                      solo le pagine da indicizzare
// Gira in GitHub Actions (vedi .github/workflows/build.yml) e si può lanciare a mano.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = "https://ripetiamo.eu";
const cfg = fs.readFileSync(path.join(ROOT, "config.js"), "utf8");
const URL_ = cfg.match(/SUPABASE_URL:\s*"([^"]+)"/)[1], KEY = cfg.match(/SUPABASE_KEY:\s*"([^"]+)"/)[1];
const TODAY = new Date().toISOString().slice(0, 10);

const SUBJECTS = {
  matematica: ["Matematica", "dalle medie all'università: di solito si lavora su esercizi svolti insieme, equazioni, funzioni, preparazione a verifiche, alla seconda prova e agli esami di Analisi."],
  fisica: ["Fisica", "al liceo e nei primi anni di università: di solito si lavora su problemi di meccanica, elettromagnetismo e termodinamica, spiegati con esempi concreti."],
  latino: ["Latino", "al liceo classico e scientifico: di solito si lavora su traduzione delle versioni frase per frase, grammatica e analisi del testo."],
  inglese: ["Inglese", "a tutte le età: di solito si lavora su conversazione, grammatica, preparazione a certificazioni come FCE e IELTS."],
  chimica: ["Chimica", "al liceo e per i test d'ingresso: di solito si lavora su stechiometria, chimica organica ed esercizi per i test di Medicina."],
  italiano: ["Italiano", "alle medie e alle superiori: di solito si lavora su analisi del testo, temi, letteratura e preparazione alla prima prova."],
  economia: ["Economia", "agli istituti tecnici e all'università: di solito si lavora su economia aziendale, contabilità, statistica e matematica finanziaria."],
};
const CITIES = {
  milano: ["Milano", 45.464, 9.19, "Città Studi, Navigli, Porta Romana, Isola, Bicocca e Lambrate"],
  roma: ["Roma", 41.903, 12.496, "San Lorenzo, Trastevere, Ostiense, EUR, Monteverde e Prati"],
  torino: ["Torino", 45.07, 7.687, "San Salvario, Vanchiglia, Crocetta, Santa Rita e Centro"],
  bologna: ["Bologna", 44.495, 11.343, "Zona universitaria, Bolognina, Santo Stefano e Murri"],
  napoli: ["Napoli", 40.852, 14.268, "Vomero, Fuorigrotta, Chiaia e Centro storico"],
  firenze: ["Firenze", 43.77, 11.256, "Campo di Marte, Novoli, Rifredi e Oltrarno"],
  padova: ["Padova", 45.406, 11.877, "Portello, Arcella, Centro e Santa Croce"],
  genova: ["Genova", 44.406, 8.946, "Albaro, Castelletto, Sampierdarena e Centro"],
  pavia: ["Pavia", 45.185, 9.155, "Centro, Borgo Ticino e Città Giardino"],
  bergamo: ["Bergamo", 45.698, 9.677, "Città Alta, Borgo Santa Caterina e Centro"],
  monza: ["Monza", 45.584, 9.274, "Centro, San Biagio e Triante"],
};
const LV = { medie: "Medie", superiori: "Superiori", universita: "Università" };

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugify = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
const km = d => d < 1 ? "meno di 1 km" : String(d.toFixed(d < 10 ? 1 : 0)).replace(".", ",") + " km";
const COLORS = [["#FFE3C8", "#8A3E07"], ["#E6DCF4", "#523873"], ["#D8EFE2", "#25694A"], ["#FDE0E3", "#8C2A3A"], ["#DCE9F6", "#2D4F78"]];
const av = n => { const [b, f] = COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  return `<div class="av" style="background:${b};color:${f}" aria-hidden="true">${esc(n.split(/\s+/).map(x => x[0] || "").join("").slice(0, 2).toUpperCase())}</div>`; };

async function rpc(name, args) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`${name}: ${r.status} ${await r.text()}`);
  return r.json();
}

const sitemap = [];
function write(rel, html, { index = true, priority = 0.6 } = {}) {
  const file = path.join(ROOT, rel, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (index) sitemap.push([SITE + "/" + rel + (rel ? "/" : ""), priority]);
}
function page({ title, desc, canonical, index = true, jsonld = [], body, live = "" }) {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${index ? "" : `<meta name="robots" content="noindex,follow">\n`}<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="Ripetiamo">
<meta property="og:locale" content="it_IT">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FFF6EF">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath d='M16 2a14 14 0 1 1-14 14V8a6 6 0 0 1 6-6z' fill='%23F2994A'/%3E%3Ccircle cx='16' cy='16' r='5' fill='%23FFF6EF'/%3E%3C/svg%3E">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gabarito:wght@500;700;800&family=Figtree:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/static.css">
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("\n")}
</head>
<body>
<a class="sr-only" href="#main">Vai al contenuto</a>
<header><div class="wrap bar"><a class="logo" href="/"><i></i>Ripetiamo</a><a class="btn" href="/#pubblica" style="text-decoration:none">Pubblica un annuncio</a></div></header>
<main class="wrap seo static" id="main">
${body}
</main>
<footer><div class="wrap"><span>Ripetiamo mette in contatto chi offre e chi cerca ripetizioni. Le lezioni sono offerte dagli utenti.</span><span><a href="/ripetizioni/">Ripetizioni per città</a> · <a href="/universita/">Esami universitari</a> · <a href="/guadagnare/">Guadagnare con le ripetizioni</a> · <a href="/termini.html">Termini</a> · <a href="/privacy.html">Privacy</a></span></div></footer>
<div class="toast" id="toast" role="status" hidden></div>
<script src="/config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4"></script>
<script src="/seo.js"></script>
</body>
</html>
`;
}
const crumbs = items => `<nav class="crumbs" aria-label="Percorso">${items.map(([n, u], i) => i < items.length - 1 ? `<a href="${u}">${esc(n)}</a>` : `<span aria-current="page">${esc(n)}</span>`).join(" › ")}</nav>`;
const crumbsLd = items => ({ "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + u })) });
const faqLd = qa => ({ "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a.replace(/<[^>]+>/g, "") } })) });
const faqHtml = qa => qa.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n");

function card(p, geo) {
  const href = p.slug ? `/t/${encodeURIComponent(p.slug)}/` : "/#annunci";
  return `<article class="card">
  <div class="top"><span class="kind offro">Offre ripetizioni</span>${geo ? `<span class="dist">${p.near ? km(p.distance_km) : "Online"}</span>` : ""}</div>
  <div class="who">${av(p.name)}<div><b><a class="plink" href="${href}">${esc(p.name)}</a></b><small>${esc(p.school)}</small>${p.verified_school ? `<span class="vbadge">✓ ${esc(p.verified_school)}</span>` : ""}</div></div>
  <div class="tags">${p.subjects.map(s => `<span class="tag">${esc(s)}</span>`).join("")}${(p.levels || []).map(l => `<span class="lvl">${esc(LV[l] || l)}</span>`).join("")}</div>
  ${(p.exams || []).length ? `<p class="exams"><b>Esami:</b> ${esc(p.exams.join(", "))}</p>` : ""}
  <p>${esc(p.body)}</p>
  <p><span aria-hidden="true">📍 </span>${esc(p.place_label)}${p.online ? " · anche online" : ""}${p.reviews_count ? ` · <span class="stars">★ ${String(p.rating).replace(".", ",")}</span> (${p.reviews_count})` : ""}</p>
  <div class="foot"><span class="price">€${p.price} <small>/ora</small></span><a class="btn" href="${href}" style="text-decoration:none">Vedi e prenota</a></div>
</article>`;
}
const COMMON_FAQ = s => [
  [`Quanto costa una lezione${s ? " di " + s.toLowerCase() : ""}?`, "Lo decide ogni tutor e lo trovi scritto nell'annuncio, all'ora. Di solito tra studenti si chiedono tra 10 e 20 € l'ora. Ripetiamo non aggiunge commissioni: paghi direttamente il tutor a fine lezione."],
  ["Chi sono i tutor?", "Studenti maggiorenni, soprattutto universitari. Chi si iscrive con l'email della propria università ha il badge «Studente verificato». Dopo ogni lezione gli studenti possono lasciare una recensione."],
  ["Per quali livelli?", "Medie, superiori e università: ogni annuncio indica i livelli, e per l'università anche gli esami che il tutor sa spiegare."],
  ["Ho meno di 18 anni, posso usarlo?", "Sì, dai 14 anni con il consenso di un genitore, a cui scriviamo quando hai una lezione di persona confermata. Sotto i 14 anni l'account lo apre un genitore. Per le lezioni di persona consigliamo luoghi pubblici o casa con un adulto presente."],
  [`Vado forte${s ? " in " + s.toLowerCase() : ""}: posso guadagnare dando ripetizioni?`, `Se sei maggiorenne sì: <a href="/#pubblica">pubblica un annuncio</a> gratis, indica quando sei disponibile e ricevi le richieste nel sito. Leggi anche <a href="/guadagnare/">come funziona e cosa sapere sulle tasse</a>.`],
];

async function main() {
  const all = await rpc("posts_near", { p_lat: 45.464, p_lon: 9.19, p_radius_km: 0, p_include_online: true, p_kind: "offro" });
  console.log("annunci attivi (offro):", all.length);

  // ---------- città × materia ----------
  const byCity = {};
  for (const [c, [, lat, lon]] of Object.entries(CITIES)) byCity[c] = await rpc("posts_near", { p_lat: lat, p_lon: lon, p_radius_km: 25, p_include_online: true, p_kind: "offro" });
  const indexed = {};
  for (const [s, [S, txt]] of Object.entries(SUBJECTS)) for (const [c, [C, lat, lon, zone]] of Object.entries(CITIES)) {
    const list = byCity[c].filter(p => p.subjects.includes(S)).slice(0, 12);
    const nearN = list.filter(p => p.near).length;
    const ok = nearN > 0;              // indicizziamo solo dove c'è almeno un tutor in zona
    indexed[`${s}-${c}`] = ok;
    const rel = `ripetizioni/${s}-${c}`, url = `${SITE}/${rel}/`;
    const items = [["Ripetiamo", "/"], ["Ripetizioni per città", "/ripetizioni/"], [`${S} a ${C}`, `/${rel}/`]];
    const faq = COMMON_FAQ(S);
    const prices = list.map(p => p.price).sort((a, b) => a - b);
    const priceLine = prices.length >= 2 ? `<p>I tutor che vedi qui chiedono da <b>${prices[0]} €</b> a <b>${prices[prices.length - 1]} €</b> l'ora.</p>` : "";
    const otherCities = Object.entries(CITIES).filter(([k]) => k !== c);
    write(rel, page({
      title: `Ripetizioni di ${S} a ${C} · Ripetiamo`,
      desc: nearN ? `${nearN} ${nearN === 1 ? "studente offre" : "studenti offrono"} ripetizioni di ${S.toLowerCase()} a ${C} o online, per medie, superiori e università. Prezzi da studenti, paghi di persona, senza commissioni.`
                  : `Ripetizioni di ${S.toLowerCase()} a ${C} fatte da studenti, per medie, superiori e università, vicino a te o online. Paghi di persona, senza commissioni.`,
      canonical: url, index: ok, jsonld: [crumbsLd(items), faqLd(faq.map(([q, a]) => [q, a]))],
      body: `${crumbs(items)}
<h1>Ripetizioni di ${esc(S)} a ${esc(C)}</h1>
<p class="lead">Ripetizioni di ${esc(S.toLowerCase())} fatte da studenti, a ${esc(C)} o online, per medie, superiori e università. Scegli chi ti convince, prenoti in due tocchi e paghi direttamente a fine lezione.</p>
<div class="cta"><a class="btn" href="/#annunci">Vedi tutti gli annunci</a><a class="btn ghost" href="/#pubblica">Offri ripetizioni di ${esc(S.toLowerCase())}</a></div>
<section id="live" data-lat="${lat}" data-lon="${lon}" data-subject="${esc(S)}" data-city="${esc(C)}">
  <h2>Chi offre ripetizioni di ${esc(S.toLowerCase())} a ${esc(C)}</h2>
  <div class="grid" id="liveGrid">${list.length ? list.map(p => card(p, true)).join("\n") : `<div class="empty">Ancora nessun annuncio di ${esc(S.toLowerCase())} a ${esc(C)}. Vai forte in ${esc(S.toLowerCase())}? <a href="/#pubblica">Pubblica il primo annuncio</a>: chi cerca qui lo vedrà subito.</div>`}</div>
</section>
${priceLine}
<h2>Come funziona</h2>
<p>Su Ripetiamo gli annunci li pubblicano direttamente gli studenti: soprattutto universitari che spiegano le materie in cui vanno forte. Le ripetizioni di ${esc(S.toLowerCase())} sono richieste soprattutto ${esc(txt)}</p>
<p>Cerchi per zona (${esc(zone)} e dintorni) o scegli una lezione online, scrivi al tutor nella chat del sito senza dare il tuo numero e prenoti un orario libero. Prima di verifiche ed esami trovi anche ripassi di gruppo, che a testa costano meno. Il prezzo lo decide chi offre la lezione e lo vedi prima di prenotare; il pagamento avviene di persona, senza commissioni.</p>
<h2>Domande frequenti</h2>
${faqHtml(faq)}
<h2>${esc(S)} in altre città</h2>
<ul class="links">${otherCities.map(([k, [N]]) => `<li><a href="/ripetizioni/${s}-${k}/">${esc(S)} a ${esc(N)}</a></li>`).join("")}</ul>
<h2>Altre materie a ${esc(C)}</h2>
<ul class="links">${Object.entries(SUBJECTS).filter(([k]) => k !== s).map(([k, [N]]) => `<li><a href="/ripetizioni/${k}-${c}/">${esc(N)} a ${esc(C)}</a></li>`).join("")}</ul>`,
    }), { index: ok, priority: 0.6 });
  }

  // ---------- indice /ripetizioni/ ----------
  {
    const items = [["Ripetiamo", "/"], ["Ripetizioni per città", "/ripetizioni/"]];
    write("ripetizioni", page({
      title: "Ripetizioni per città e materia · Ripetiamo",
      desc: "Ripetizioni di matematica, fisica, latino, inglese e altre materie nelle principali città italiane, fatte da studenti per medie, superiori e università. Paghi di persona, senza commissioni.",
      canonical: `${SITE}/ripetizioni/`, jsonld: [crumbsLd(items)],
      body: `${crumbs(items)}
<h1>Ripetizioni per città e materia</h1>
<p class="lead">Trova ripetizioni fatte da studenti nella tua città, oppure online, per medie, superiori e università. Le città con tutor attivi sono evidenziate.</p>
<div class="cta"><a class="btn" href="/#annunci">Cerca vicino a te</a><a class="btn ghost" href="/#pubblica">Offri ripetizioni</a><a class="btn ghost" href="/universita/">Esami universitari</a></div>
${Object.entries(CITIES).map(([c, [C]]) => `<h2>Ripetizioni a ${esc(C)}</h2><ul class="links">${Object.entries(SUBJECTS).map(([s, [S]]) => `<li><a href="/ripetizioni/${s}-${c}/"${indexed[`${s}-${c}`] ? ' class="on"' : ""}>${esc(S)}${indexed[`${s}-${c}`] ? " ✓" : ""}</a></li>`).join("")}</ul>`).join("\n")}`,
    }), { priority: 0.8 });
  }

  // ---------- profili tutor /t/<slug>/ ----------
  fs.rmSync(path.join(ROOT, "t"), { recursive: true, force: true });
  const slugs = [...new Set(all.map(p => p.slug).filter(Boolean))];
  const tutors = [];
  for (const slug of slugs) {
    const P = await rpc("tutor_profile", { p_slug: slug });
    if (!P || !P.posts.length) continue;
    tutors.push(P);
    const subs = [...new Set(P.posts.flatMap(p => p.subjects))];
    const lvls = [...new Set(P.posts.flatMap(p => p.levels || []))].map(l => LV[l] || l);
    const exams = [...new Set(P.posts.flatMap(p => p.exams || []))];
    const city = (P.posts[0].place_label || "").split(",").pop().trim();
    const minP = Math.min(...P.posts.map(p => p.price));
    const rel = `t/${slug}`, url = `${SITE}/${rel}/`;
    const items = [["Ripetiamo", "/"], ["Tutor", "/ripetizioni/"], [P.name, `/${rel}/`]];
    const person = { "@context": "https://schema.org", "@type": "Person", name: P.name, url,
      ...(P.school ? { affiliation: { "@type": "CollegeOrUniversity", name: P.school } } : {}),
      knowsAbout: [...subs, ...exams],
      makesOffer: P.posts.map(p => ({ "@type": "Offer", priceCurrency: "EUR", price: p.price, unitText: "ora",
        itemOffered: { "@type": "Service", name: `Ripetizioni di ${p.subjects.join(", ")}`, areaServed: p.place_label } })) };
    write(rel, page({
      title: `${P.name} · Ripetizioni di ${subs.slice(0, 3).join(", ")}${city ? " a " + city : ""} · Ripetiamo`,
      desc: `${P.name}${P.school ? ", studente di " + P.school + "," : ""} dà ripetizioni di ${subs.join(", ").toLowerCase()}${lvls.length ? " (" + lvls.join(", ").toLowerCase() + ")" : ""}${city ? " a " + city : ""}${P.posts.some(p => p.online) ? " e online" : ""}, da ${minP} €/ora.${P.reviews_count ? ` ★ ${String(P.rating).replace(".", ",")} su ${P.reviews_count} recensioni.` : ""}`,
      canonical: url, jsonld: [crumbsLd(items), person],
      body: `${crumbs(items)}
<div class="tutor-head">
  ${av(P.name)}
  <div class="th-main"><h1>${esc(P.name)}</h1>${P.school ? `<span class="vbadge">✓ ${esc(P.school)}</span>` : ""}
    <div class="facts"><span>${P.reviews_count ? `<b>★ ${String(P.rating).replace(".", ",")}</b> · ${P.reviews_count} ${P.reviews_count === 1 ? "recensione" : "recensioni"}` : "Ancora nessuna recensione"}</span><span><b>${P.lessons}</b> ${P.lessons === 1 ? "lezione fatta" : "lezioni fatte"}</span><span>Su Ripetiamo da ${new Date(P.since).toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</span></div></div>
  <div class="th-acts"><a class="btn" href="/#t/${encodeURIComponent(slug)}" style="text-decoration:none">Prenota o scrivi</a></div>
</div>
<section id="live"><h2 class="sec">Annunci di ${esc(P.name.split(" ")[0])}</h2>
<div class="grid">${P.posts.map(p => card({ ...p, slug, verified_school: P.school, reviews_count: 0 }, false)).join("\n")}</div></section>
<h2 class="sec">Recensioni</h2>
<div class="reviews">${P.reviews.length ? P.reviews.map(r => `<div class="rev"><div class="rev-h"><span class="stars" aria-label="${r.rating} su 5">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span><b>${esc(r.name)}</b><small>${new Date(r.at).toLocaleDateString("it-IT")}</small></div>${r.body ? `<p>${esc(r.body)}</p>` : ""}</div>`).join("") : `<p class="note">Le recensioni le possono scrivere solo gli studenti che hanno fatto davvero una lezione.</p>`}</div>
<p><a class="btn" href="/#t/${encodeURIComponent(slug)}" style="text-decoration:none">Vedi gli orari liberi e prenota</a></p>`,
    }), { priority: 0.7 });
  }
  console.log("profili tutor:", tutors.length);

  // ---------- università × esame ----------
  fs.rmSync(path.join(ROOT, "universita"), { recursive: true, force: true });
  const groups = new Map();
  for (const p of all) {
    if (!(p.levels || []).includes("universita")) continue;
    const uni = p.university || p.verified_school || "";
    for (const ex of p.exams || []) {
      const k = `${slugify(uni || "online")}/${slugify(ex)}`;
      if (!groups.has(k)) groups.set(k, { uni, exam: ex, posts: [] });
      groups.get(k).posts.push(p);
    }
  }
  for (const [k, g] of groups) {
    const rel = `universita/${k}`, where = g.uni ? ` · ${g.uni}` : "";
    const items = [["Ripetiamo", "/"], ["Esami universitari", "/universita/"], [`${g.exam}${where}`, `/${rel}/`]];
    write(rel, page({
      title: `Ripetizioni di ${g.exam}${g.uni ? " per " + g.uni : ""} · Ripetiamo`,
      desc: `Studenti che hanno già passato ${g.exam}${g.uni ? " a " + g.uni : ""} e lo spiegano a chi deve darlo: lezioni singole o ripassi di gruppo, di persona o online, senza commissioni.`,
      canonical: `${SITE}/${rel}/`, jsonld: [crumbsLd(items)],
      body: `${crumbs(items)}
<h1>Ripetizioni di ${esc(g.exam)}${g.uni ? ` <span style="display:block;font-size:.55em;color:var(--muted)">${esc(g.uni)}</span>` : ""}</h1>
<p class="lead">Chi ha già passato l'esame è la persona migliore per spiegartelo: sa cosa chiedono, quali esercizi tornano e come organizzare lo studio.</p>
<div class="cta"><a class="btn" href="/#annunci">Vedi tutti gli annunci</a><a class="btn ghost" href="/#pubblica">Spiega anche tu un esame</a></div>
<section id="live" data-exam="${esc(g.exam)}" data-uni="${esc(g.uni)}"><h2>Chi spiega ${esc(g.exam)}</h2>
<div class="grid" id="liveGrid">${g.posts.map(p => card(p, false)).join("\n")}</div></section>
<h2>Domande frequenti</h2>
${faqHtml([["Posso fare un ripasso di gruppo?", "Sì: chi offre ripetizioni può organizzare ripassi di gruppo prima dell'appello. A testa costano meno; li trovi nella bacheca."], ["Quanto costa?", "Lo decide ogni tutor e lo vedi nell'annuncio. Paghi di persona, Ripetiamo non prende commissioni."]])}`,
    }), { priority: 0.6 });
  }
  {
    const items = [["Ripetiamo", "/"], ["Esami universitari", "/universita/"]];
    const list = [...groups.entries()].sort((a, b) => (a[1].uni + a[1].exam).localeCompare(b[1].uni + b[1].exam));
    write("universita", page({
      title: "Ripetizioni per esami universitari, da chi li ha già passati · Ripetiamo",
      desc: "Trova studenti che hanno già passato il tuo esame (Analisi, Fisica, Economia e altri) e te lo spiegano: lezioni singole o ripassi di gruppo, senza commissioni.",
      canonical: `${SITE}/universita/`, index: list.length > 0, jsonld: [crumbsLd(items)],
      body: `${crumbs(items)}
<h1>Esami universitari</h1>
<p class="lead">Ripetizioni da studenti che l'esame l'hanno già passato. Scegli il tuo esame, oppure pubblica un annuncio per dire cosa ti serve.</p>
<div class="cta"><a class="btn" href="/#annunci">Cerca nella bacheca</a><a class="btn ghost" href="/#pubblica">Spiega un esame che hai passato</a></div>
${list.length ? `<ul class="links">${list.map(([k, g]) => `<li><a href="/universita/${k}/">${esc(g.exam)}${g.uni ? " · " + esc(g.uni) : ""}</a></li>`).join("")}</ul>`
  : `<div class="empty">Ancora nessun esame in elenco. Hai passato un esame e sai spiegarlo? <a href="/#pubblica">Pubblica un annuncio</a> scegliendo «Università» e scrivendo gli esami: comparirai qui.</div>`}`,
    }), { index: list.length > 0, priority: 0.7 });
  }

  // ---------- sitemap ----------
  const fixed = [[`${SITE}/`, 1.0], [`${SITE}/guadagnare/`, 0.8], [`${SITE}/termini.html`, 0.2], [`${SITE}/privacy.html`, 0.2], [`${SITE}/terms.html`, 0.2], [`${SITE}/privacy-en.html`, 0.2]];
  const urls = [...fixed, ...sitemap];
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p]) => `  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod><priority>${p.toFixed(1)}</priority></url>`).join("\n")}
</urlset>
`);
  console.log("sitemap:", urls.length, "URL (", Object.values(indexed).filter(Boolean).length, "pagine città/materia indicizzabili su", Object.keys(indexed).length, ")");
}
main().catch(e => { console.error(e); process.exit(1); });
