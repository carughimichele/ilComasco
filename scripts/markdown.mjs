/* =====================================================================
   ilComasco — Da testo del CMS a HTML
   ---------------------------------------------------------------------
   Stesse regole di scrittura di prima: **grassetto**, *corsivo*,
   [testo](indirizzo), righe che iniziano con "- " o "* " per gli elenchi,
   "1. " per gli elenchi numerati, "## " e "### " per i sottotitoli.

   I link interni al sito vengono aperti nella stessa scheda e, se
   puntano ancora al vecchio indirizzo news.html?id=..., sono corretti
   automaticamente: nelle notizie già pubblicate non serve toccare nulla.
   ===================================================================== */

export const SITO = 'https://il-comasco.vercel.app';

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

/* /notizia/<slug> a partire da uno slug scritto nel CMS */
export function slugPulito(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* true se l'indirizzo punta a una pagina di ilComasco */
function interno(url) {
  return url.indexOf('/') === 0 || url.indexOf(SITO) === 0 ||
         url.indexOf('https://ilcomasco.netlify.app') === 0;
}

/* vecchio formato -> nuovo, e via il nome del sito dai link interni */
function normalizzaLink(url) {
  let u = url.replace(/^https?:\/\/(il-comasco\.vercel\.app|ilcomasco\.netlify\.app)/, '');
  const m = /^\/?news\.html\?id=([^&#]+)/.exec(u);
  if (m) u = '/notizia/' + slugPulito(decodeURIComponent(m[1]));
  return u || '/';
}

function rich(t) {
  return esc(t)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, function (_, testo, url) {
      if (interno(url)) return '<a href="' + esc(normalizzaLink(url)) + '">' + testo + '</a>';
      return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + testo + '</a>';
    });
}

export function render(t) {
  let out = '', list = null;
  String(t || '').split(/\r?\n/).forEach(function (line) {
    const s = line.trim();
    if (!s) { if (list) { out += '</' + list + '>'; list = null } return }
    const ul = s.match(/^[-*]\s+(.*)$/),
          ol = s.match(/^\d+[.)]\s+(.*)$/),
          h  = s.match(/^(#{2,3})\s+(.*)$/);
    if (ul) { if (list !== 'ul') { if (list) out += '</' + list + '>'; out += '<ul>'; list = 'ul' } out += '<li>' + rich(ul[1]) + '</li>'; return }
    if (ol) { if (list !== 'ol') { if (list) out += '</' + list + '>'; out += '<ol>'; list = 'ol' } out += '<li>' + rich(ol[1]) + '</li>'; return }
    if (list) { out += '</' + list + '>'; list = null }
    if (h) { const lv = h[1].length === 2 ? 'h2' : 'h3'; out += '<' + lv + '>' + rich(h[2]) + '</' + lv + '>'; return }
    out += '<p>' + rich(s) + '</p>';
  });
  if (list) out += '</' + list + '>';
  return out;
}

/* testo semplice, per la descrizione nei meta quando manca il sommario */
export function nudo(t) {
  return String(t || '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
