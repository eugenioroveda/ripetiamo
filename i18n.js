// =====================================================================
// Ripetiamo · lingue (italiano / inglese)
// Il testo italiano è scritto nell'HTML; quello inglese negli attributi
// data-en (testo), data-en-html (testo con link), data-en-ph (segnaposto),
// data-en-aria (etichetta accessibile), data-en-href (link alle pagine legali).
// =====================================================================
(function () {
  let L = null;
  try { L = localStorage.getItem("rip-lang"); } catch (e) {}
  // Il sito è in italiano. L'inglese si attiva solo se scelto, o per browser non italiani di persone vere:
  // i motori di ricerca (che di solito si presentano in inglese) vedono sempre la versione italiana.
  const BOT = /bot|crawl|spider|slurp|google|bing|duckduck|yandex|baidu|facebookexternalhit|whatsapp|telegram|lighthouse|headless/i.test(navigator.userAgent || "");
  if (L !== "it" && L !== "en") L = BOT || (navigator.language || "it").toLowerCase().startsWith("it") ? "it" : "en";
  window.LANG = L;
  window.t = (it, en) => (L === "en" ? en : it);
  window.setLang = l => { try { localStorage.setItem("rip-lang", l); } catch (e) {} location.reload(); };
  document.documentElement.lang = L;

  if (L === "en") {
    document.querySelectorAll("[data-en]").forEach(e => { e.textContent = e.dataset.en; });
    document.querySelectorAll("[data-en-html]").forEach(e => { e.innerHTML = e.dataset.enHtml; });
    document.querySelectorAll("[data-en-ph]").forEach(e => { e.placeholder = e.dataset.enPh; });
    document.querySelectorAll("[data-en-aria]").forEach(e => { e.setAttribute("aria-label", e.dataset.enAria); });
    document.querySelectorAll("[data-en-href]").forEach(e => { e.setAttribute("href", e.dataset.enHref); });
    const ti = document.querySelector("meta[name='title-en']"); if (ti) document.title = ti.content;
    const de = document.querySelector("meta[name='description-en']"), d = document.querySelector("meta[name='description']");
    if (de && d) d.content = de.content;
  }
  document.querySelectorAll(".lang button").forEach(b => {
    b.classList.toggle("on", b.dataset.lang === L);
    b.setAttribute("aria-pressed", b.dataset.lang === L);
    b.onclick = () => { if (b.dataset.lang !== L) setLang(b.dataset.lang); };
  });
})();
