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
  SITO + '/og-default.png';

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

/* Legge larghezza e altezza vere di una foto salvata nel sito (png, jpg,
   webp) e le scrive nella pagina: cosi' il browser le riserva lo spazio
   giusto e il testo non balla mentre la foto carica. Se non ci riesce non
   scrive nulla: la pagina funziona lo stesso. */
function misura(percorso) {
  try {
    if (!percorso || /^https?:\/\//.test(percorso)) return '';
    const file = P(...percorso.replace(/^\//, '').split('/'));
    if (!existsSync(file)) return '';
    const b = readFileSync(file);
    let w = 0, h = 0;
    if (b.length > 24 && b.toString('ascii', 1, 4) === 'PNG') {
      w = b.readUInt32BE(16); h = b.readUInt32BE(20);
    } else if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const tipo = b.toString('ascii', 12, 16);
      if (tipo === 'VP8X') { w = 1 + b.readUIntLE(24, 3); h = 1 + b.readUIntLE(27, 3); }
      else if (tipo === 'VP8 ') { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff; }
      else if (tipo === 'VP8L') {
        const v = b.readUInt32LE(21);
        w = 1 + (v & 0x3fff); h = 1 + ((v >> 14) & 0x3fff);
      }
    } else if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i < b.length - 9) {
        if (b[i] !== 0xff) { i++; continue; }
        const marcatore = b[i + 1];
        if (marcatore >= 0xc0 && marcatore <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcatore)) {
          h = b.readUInt16BE(i + 5); w = b.readUInt16BE(i + 7); break;
        }
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
    return (w > 0 && h > 0) ? ` width="${w}" height="${h}"` : '';
  } catch (e) { return ''; }
}

function pagina(n, prima, dopo) {
  const c = CAT.info(n.cat);
  /* la categoria compare nella fascia blu solo se l'articolo ha una foto:
     senza foto la mostra gia' la copertina colorata, non serve due volte */
  const kicker = n.image
    ? `<div><span class="kicker" style="background:#fff;border-color:#fff;color:${c.base}">`
      + `${c.icona}${esc(n.cat || c.nome)}</span></div>`
    : '';

  /* Testata dell'articolo.
     - senza foto: fascia colorata con categoria, titolo e data (copertina automatica)
     - con foto:   titolo e data come sempre, la foto resta sopra il testo */
  const dataTesto = n.d ? n.d.testo : '';
  const dataIso = n.d ? n.d.iso : '';
  const tempo = `<time datetime="${dataIso}">${dataTesto}</time>`;

  const testata = n.image
    ? `<h1>${esc(n.title)}</h1>\n    <div class="date">${tempo}</div>`
    : `<header class="cover" style="--c:${c.base};--c2:${c.chiaro}">`
      + `<span class="cat">${c.icona}${esc(n.cat || c.nome)}</span>`
      + `<h1>${esc(n.title)}</h1>`
      + `<div class="meta">ilComasco · ${tempo}</div>`
      + `</header>`;

  /* foto di apertura: descrizione per chi non vede, crediti visibili sotto */
  const dim = misura(n.image);
  const didascalia = String(n.imageCredit || '').trim()
    ? `<figcaption>${esc(n.imageCredit)}</figcaption>` : '';
  const copertina = n.image
    ? `<figure><img src="${esc(n.image)}" alt="${esc(n.imageAlt || n.title)}"${dim}>${didascalia}</figure>`
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
    .replace('{{TESTATA}}', testata)
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
