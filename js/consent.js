/* =====================================================================
   ilComasco — Consenso cookie + Google Analytics
   ---------------------------------------------------------------------
   UNICO PUNTO DA MODIFICARE: incolla sotto il tuo ID di misurazione GA4
   (Google Analytics → Amministrazione → Flussi di dati → ID misurazione,
   nel formato G-XXXXXXXXXX). Finché resta il valore di esempio,
   Analytics NON viene caricato: il resto del sito funziona comunque.
   ===================================================================== */
var GA_ID = 'G-069SSZFE3C';

(function () {
  'use strict';

  var KEY = 'cookie';
  var gaLoaded = false;

  function read()  { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v){ try { localStorage.setItem(KEY, v);     } catch (e) {} }
  function wipe()  { try { localStorage.removeItem(KEY);     } catch (e) {} }

  /* ---------- Google Analytics: caricato solo su consenso ---------- */
  function loadGA() {
    if (gaLoaded) return;
    if (!GA_ID || GA_ID.indexOf('G-') !== 0 || GA_ID === 'G-XXXXXXXXXX') return;
    gaLoaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  /* Cancella i cookie _ga già presenti, se il consenso viene revocato */
  function dropGACookies() {
    var host = location.hostname;
    var roots = [host, '.' + host];
    var parts = host.split('.');
    if (parts.length > 2) roots.push('.' + parts.slice(-2).join('.'));

    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0) return;
      roots.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=' + d;
      });
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });
  }

  /* ---------- Banner ---------- */
  function styles() {
    if (document.getElementById('ilc-consent-css')) return;
    var css = document.createElement('style');
    css.id = 'ilc-consent-css';
    css.textContent =
      '#ilc-cookie{position:fixed;bottom:18px;left:18px;right:18px;max-width:680px;margin:0 auto;' +
      'background:var(--card,#fff);border:1px solid var(--border,#e4edfa);border-radius:16px;' +
      'box-shadow:var(--shadow,0 18px 45px rgba(6,47,99,.14));padding:20px 22px;z-index:2000;display:none}' +
      '#ilc-cookie.on{display:block}' +
      '#ilc-cookie p{font-size:.9rem;line-height:1.6;color:var(--ink-soft,#5b6b82);margin:0 0 14px;max-width:none}' +
      '#ilc-cookie a{color:var(--azzurro,#0a4da2);font-weight:700;text-decoration:underline}' +
      '#ilc-cookie .row{display:flex;gap:10px;flex-wrap:wrap}' +
      '#ilc-cookie button{padding:11px 22px;border-radius:100px;font-weight:800;border:0;cursor:pointer;' +
      'font-family:inherit;font-size:.9rem}' +
      '#ilc-cookie .yes{background:var(--azzurro,#0a4da2);color:#fff}' +
      '#ilc-cookie .no{background:var(--bg,#eef4fc);color:var(--ink,#0b1220);border:1px solid var(--border,#e4edfa)}' +
      '#ilc-cookie button:focus-visible{outline:3px solid var(--lago,#12b5c9);outline-offset:2px}';
    document.head.appendChild(css);
  }

  function banner() {
    var el = document.getElementById('ilc-cookie');
    if (el) return el;
    styles();
    el = document.createElement('div');
    el.id = 'ilc-cookie';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Consenso ai cookie');
    el.innerHTML =
      '<p>Il sito usa la memoria del browser per ricordare il tema che scegli. ' +
      'Con il tuo consenso usa anche <strong>Google Analytics</strong>, che installa cookie ' +
      'per contare le visite. Puoi rifiutare e leggere tutto ugualmente. ' +
      'Dettagli nella <a href="/cookie-policy.html">Cookie Policy</a>.</p>' +
      '<div class="row">' +
      '<button type="button" class="yes" data-act="all">Accetta tutti</button>' +
      '<button type="button" class="no" data-act="essential">Solo essenziali</button>' +
      '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-act]');
      if (!b) return;
      var v = b.getAttribute('data-act');
      write(v);
      el.classList.remove('on');
      if (v === 'all') loadGA(); else dropGACookies();
      document.dispatchEvent(new CustomEvent('ilc:consent', { detail: v }));
    });
    return el;
  }

  /* ---------- API pubblica (usata dalla Cookie Policy) ---------- */
  window.ilcConsent = {
    value: read,
    open:  function () { banner().classList.add('on'); },
    reset: function () { wipe(); dropGACookies(); document.dispatchEvent(new CustomEvent('ilc:consent', { detail: null })); },
    accept:function () { write('all'); loadGA(); document.dispatchEvent(new CustomEvent('ilc:consent', { detail: 'all' })); },
    reject:function () { write('essential'); dropGACookies(); document.dispatchEvent(new CustomEvent('ilc:consent', { detail: 'essential' })); }
  };

  function start() {
    var c = read();
    if (c === 'all') loadGA();
    else if (!c) banner().classList.add('on');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
