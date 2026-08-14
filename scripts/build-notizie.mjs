/* =====================================================================
   ilComasco — Generatore delle pagine notizia
   ---------------------------------------------------------------------
   Da data/news.json crea una pagina vera per ogni articolo:
       /notizia/<indirizzo>/index.html
   e rigenera sitemap.xml e rss.xml.

   Si lancia da solo a ogni pubblicazione dal CMS (vedi vercel.json).
   A mano:  node scripts/build-notizie.mjs

   NON MODIFICARE QUI la grafica: quella sta in templates/notizia.html.
   ===================================================================== */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, render, nudo, slugPulito, SITO } from './lib/markdown.mjs';
import { leggi, oggi } from './lib/date.mjs';
import { caricaCategorie } from './lib/categorie.mjs';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = (...x) => join(RADICE, ...x);

const IMMAGINE_DI_SCORTA =
  'https://images.unsplash.com/photo-1667375152478-5c4d62eb9ecb?auto=format&fit=crop&w=1200&q=80';

/* pagine fisse del sito, per la sitemap */
const PAGINE = [
  { url: '/',                  freq: 'daily',  pri: '1.0' },
  { url: '/notizie.html',      freq: 'daily',  pri: '0.8' },
  { url: '/privacy.html',      freq: 'yearly', pri: '0.3' },
  { url: '/cookie-policy.html', freq: 'yearly', pri: '0.3' }
];

const avvisi = [];
const CAT = caricaCategorie(P('js', 'categorie.js'));
const modello = readFileSync(P('templates', 'notizia.html'), 'utf8');
const dati = JSON.parse(readFileSync(P('data', 'news.json'), 'utf8'));

const assoluto = u => (!u ? '' : /^https?:\/\//.test(u) ? u : SITO + (u[0] === '/' ? '' : '/') + u);

/* ------------------------------------------------------------------ */
/* 1. lettura e controllo delle notizie                                */
/* ------------------------------------------------------------------ */
const visti = new Set();

const notizie = (dati.news || []).map((n, i) => {
  const grezzo = String(n.slug || '').trim();
  const slug = slugPulito(grezzo) || 'notizia-' + (i + 1);
  const d = leggi(n.date);

  if (!grezzo) avvisi.push(`"${n.title}" non ha un indirizzo: uso /notizia/${slug}`);
  else if (slug !== grezzo) avvisi.push(`indirizzo "${grezzo}" corretto in "${slug}" — sistemalo nel CMS`);
  if (!d) avvisi.push(`"${n.title}" ha una data illeggibile (${n.date})`);
  if (visti.has(slug)) avvisi.push(`indirizzo doppio: "${slug}" — la seconda notizia sovrascrive la prima`);
  visti.add(slug);

  return {
    ...n,
    slug, grezzo, d, i,
    percorso: '/notizia/' + slug,
    sommario: String(n.summary || nudo(n.body) || n.title).slice(0, 300)
  };
}).filter(n => n.title);

/* dalla piu' recente; a parita' di data vince quella aggiunta per ultima,
   la stessa regola che usano la home e l'archivio */
notizie.sort((a, b) =>
  String(b.d ? b.d.ordina : '').localeCompare(String(a.d ? a.d.ordina : '')) || b.i - a.i);

/* ------------------------------------------------------------------ */
/* 2. testa della pagina: titolo, descrizione, social, dati Google      */
/* ------------------------------------------------------------------ */
function testa(n) {
  const url = SITO + n.percorso;
  const titolo = `${n.title} — ilComasco`;
  const descrizione = n.sommario.slice(0, 155);
  const immagine = assoluto(n.image) || IMMAGINE_DI_SCORTA;

  const dattiloscritto = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        headline: n.title.slice(0, 110),
        description: descrizione,
        image: [immagine],
        datePublished: n.d ? n.d.iso : undefined,
        dateModified: n.d ? n.d.iso : undefined,
        articleSection: n.cat || 'La squadra',
        inLanguage: 'it-IT',
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: { '@type': 'Organization', name: 'ilComasco', url: SITO },
        publisher: { '@type': 'Organization', name: 'ilComasco', url: SITO }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITO + '/' },
          { '@type': 'ListItem', position: 2, name: 'Notizie', item: SITO + '/notizie.html' },
          { '@type': 'ListItem', position: 3, name: n.title, item: url }
        ]
      }
    ]
  };

  return [
    `<title>${esc(titolo)}</title>`,
    `<meta name="description" content="${esc(descrizione)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="ilComasco">`,
    `<meta property="og:locale" content="it_IT">`,
    `<meta property="og:title" content="${esc(n.title)}">`,
    `<meta property="og:description" content="${esc(descrizione)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(immagine)}">`,
    n.d ? `<meta property="article:published_time" content="${n.d.iso}">` : '',
    `<meta property="article:section" content="${esc(n.cat || 'La squadra')}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(n.title)}">`,
    `<meta name="twitter:description" content="${esc(descrizione)}">`,
    `<meta name="twitter:image" content="${esc(immagine)}">`,
    `<script type="application/ld+json">${JSON.stringify(dattiloscritto)}</script>`
  ].filter(Boolean).join('\n');
}

/* ------------------------------------------------------------------ */
/* 3. una pagina                                                       */
/* ------------------------------------------------------------------ */
function pagina(n, prima, dopo) {
  const c = CAT.info(n.cat);
  const kicker = `<div><span class="kicker" style="background:#fff;border-color:#fff;color:${c.base}">`
    + `${c.icona}${esc(n.cat || c.nome)}</span></div>`;

  const copertina = n.image
    ? `<figure><img src="${esc(n.image)}" alt="${esc(n.imageAlt || n.title)}" width="1200" height="675"></figure>`
    : '';

  const scheda = (n2, verso) => n2
    ? `<a class="${verso}" href="${n2.percorso}"><span class="l">`
      + (verso === 'prev' ? '← Precedente' : 'Successiva →')
      + `</span><span class="t">${esc(n2.title)}</span></a>`
    : '';
  const pn = (prima || dopo)
    ? `<nav class="pn" aria-label="Altre notizie">${scheda(dopo, 'prev')}${scheda(prima, 'next')}</nav>`
    : '';

  return modello
    .replace('{{META}}', testa(n))
    .replace('{{KICKER}}', kicker)
    .replace('{{TITOLO}}', esc(n.title))
    .replace('{{DATA_ISO}}', n.d ? n.d.iso : '')
    .replace('{{DATA_TESTO}}', n.d ? n.d.testo : '')
    .replace('{{CORPO}}', copertina + render(n.body || n.summary || ''))
    .replace('{{PRECEDENTE_SUCCESSIVO}}', pn)
    .replace(/\{\{SLUG\}\}/g, n.slug);
}

/* pagina-ponte per un vecchio indirizzo scritto male: non si indicizza,
   manda solo il lettore sulla pagina giusta senza mostrargli un errore */
function ponte(n) {
  const url = SITO + n.percorso;
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${esc(url)}">
<meta http-equiv="refresh" content="0;url=${esc(n.percorso)}">
<title>${esc(n.title)} — ilComasco</title></head>
<body><p>La notizia si trova qui: <a href="${esc(n.percorso)}">${esc(n.title)}</a></p>
<script>location.replace(${JSON.stringify(n.percorso)})</script></body></html>`;
}

/* ------------------------------------------------------------------ */
/* 4. scrittura                                                        */
/* ------------------------------------------------------------------ */
function scrivi(percorsoFile, contenuto) {
  mkdirSync(dirname(percorsoFile), { recursive: true });
  writeFileSync(percorsoFile, contenuto);
}

if (existsSync(P('notizia'))) rmSync(P('notizia'), { recursive: true, force: true });

notizie.forEach((n, i) => {
  scrivi(P('notizia', n.slug, 'index.html'), pagina(n, notizie[i - 1], notizie[i + 1]));
  if (n.grezzo && n.grezzo !== n.slug) {
    scrivi(P('notizia', ...n.grezzo.split('/'), 'index.html'), ponte(n));
  }
});

/* sitemap: le pagine vere, senza piu' gli ancoraggi #sezione (non sono pagine) */
const ultimo = notizie[0]?.d?.giornoIso || oggi();
scrivi(P('sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  + PAGINE.map(p => `  <url>\n    <loc>${SITO}${p.url}</loc>\n    <lastmod>${p.pri === '0.3' ? oggi() : ultimo}</lastmod>\n`
      + `    <changefreq>${p.freq}</changefreq>\n    <priority>${p.pri}</priority>\n  </url>`).join('\n') + '\n'
  + notizie.map(n => `  <url>\n    <loc>${SITO}${n.percorso}</loc>\n`
      + `    <lastmod>${n.d ? n.d.giornoIso : oggi()}</lastmod>\n`
      + `    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>`).join('\n')
  + `\n</urlset>\n`);

/* feed RSS: aggregatori, Telegram, chi vuole seguirci senza social */
const cdata = s => `<![CDATA[${String(s).replace(/\]\]>/g, ']]&gt;')}]]>`;
scrivi(P('rss.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n`
  + `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n`
  + `  <title>ilComasco — Notizie del Calcio Como 1907</title>\n`
  + `  <link>${SITO}/</link>\n`
  + `  <description>Il portale indipendente dei tifosi Lariani.</description>\n`
  + `  <language>it-IT</language>\n`
  + `  <atom:link href="${SITO}/rss.xml" rel="self" type="application/rss+xml"/>\n`
  + notizie.slice(0, 30).map(n =>
      `  <item>\n    <title>${cdata(n.title)}</title>\n`
      + `    <link>${SITO}${n.percorso}</link>\n`
      + `    <guid isPermaLink="true">${SITO}${n.percorso}</guid>\n`
      + (n.cat ? `    <category>${cdata(n.cat)}</category>\n` : '')
      + (n.d ? `    <pubDate>${n.d.rfc822}</pubDate>\n` : '')
      + `    <description>${cdata(n.sommario)}</description>\n  </item>`).join('\n')
  + `\n</channel>\n</rss>\n`);

/* ------------------------------------------------------------------ */
console.log(`\nilComasco — generate ${notizie.length} pagine notizia`);
notizie.forEach(n => console.log(`  ${n.percorso}${n.grezzo !== n.slug ? '   (ponte da /notizia/' + n.grezzo + ')' : ''}`));
console.log('  sitemap.xml, rss.xml aggiornati');
if (avvisi.length) {
  console.log('\n  Da sistemare nel CMS:');
  avvisi.forEach(a => console.log('   · ' + a));
}
console.log('');
