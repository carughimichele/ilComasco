/* =====================================================================
   ilComasco — Commenti (Giscus) caricati solo su richiesta
   ---------------------------------------------------------------------
   Niente collegamenti a GitHub prima del clic del tifoso.

   COME SI USA
     <div id="giscus" data-term="news-nome-della-notizia"></div>
   Il riquadro di consenso compare da solo. Il valore di data-term e' il
   filo che tiene insieme un articolo e la sua discussione: non va mai
   cambiato dopo la pubblicazione, altrimenti i commenti restano orfani.
   ===================================================================== */

(function () {
  'use strict';

  function stili() {
    if (document.getElementById('ilc-giscus-css')) return;
    var css = document.createElement('style');
    css.id = 'ilc-giscus-css';
    css.textContent =
      '.cload{text-align:center;padding:6px 0}' +
      '.cload p{color:var(--ink-soft,#5b6b82);font-size:.92rem;line-height:1.6;max-width:54ch;margin:0 auto 18px}' +
      '.cload button{padding:13px 30px;border-radius:100px;border:0;background:var(--azzurro,#0a4da2);' +
      'color:#fff;font-weight:800;font-size:.95rem;cursor:pointer;font-family:inherit;transition:.22s}' +
      '.cload button:hover{background:var(--azzurro-chiaro,#2e86ff);transform:translateY(-2px)}' +
      '.cload button:focus-visible{outline:3px solid var(--lago,#12b5c9);outline-offset:3px}' +
      '.cload .note{display:block;margin-top:14px;font-size:.78rem;color:var(--ink-soft,#5b6b82)}' +
      '.cload .note a{color:var(--lago,#12b5c9);font-weight:700;text-decoration:underline}';
    document.head.appendChild(css);
  }

  function monta(mount) {
    if (!mount || mount.dataset.pronto) return;
    var term = mount.getAttribute('data-term');
    if (!term) return;
    mount.dataset.pronto = '1';
    stili();

    var box = document.createElement('div');
    box.className = 'cload';
    box.innerHTML =
      '<p>I commenti sono ospitati su <strong>Giscus</strong> e funzionano con un account GitHub. ' +
      'Caricandoli, il tuo browser si collega a giscus.app e a GitHub, che possono installare cookie propri.</p>' +
      '<button type="button">\uD83D\uDCAC Carica i commenti</button>' +
      '<span class="note">Nessun collegamento avviene prima del tuo clic \u00b7 ' +
      '<a href="/cookie-policy.html">Cookie Policy</a></span>';
    mount.appendChild(box);

    box.querySelector('button').addEventListener('click', function () {
      var b = this;
      b.disabled = true;
      b.textContent = 'Caricamento\u2026';
      var scuro = document.documentElement.getAttribute('data-theme') === 'dark';
      var s = document.createElement('script');
      s.src = 'https://giscus.app/client.js';
      s.setAttribute('data-repo', 'ilComasco1907/ilComasco');
      s.setAttribute('data-repo-id', 'R_kgDOToBMJA');
      s.setAttribute('data-category', 'Announcements');
      s.setAttribute('data-category-id', 'DIC_kwDOToBMJM4DCS1_');
      s.setAttribute('data-mapping', 'specific');
      s.setAttribute('data-term', term);
      s.setAttribute('data-reactions-enabled', '1');
      s.setAttribute('data-input-position', 'bottom');
      s.setAttribute('data-theme', scuro ? 'dark' : 'light');
      s.setAttribute('data-lang', 'it');
      s.crossOrigin = 'anonymous';
      s.async = true;
      s.onload = function () { box.remove() };
      s.onerror = function () { b.disabled = false; b.textContent = '\uD83D\uDCAC Riprova' };
      mount.appendChild(s);
    });
  }

  /* il tema del sito e quello dei commenti restano allineati */
  function sincronizzaTema() {
    var frame = document.querySelector('iframe.giscus-frame');
    if (!frame) return;
    var scuro = document.documentElement.getAttribute('data-theme') === 'dark';
    frame.contentWindow.postMessage(
      { giscus: { setConfig: { theme: scuro ? 'dark' : 'light' } } }, 'https://giscus.app');
  }
  new MutationObserver(sincronizzaTema)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  window.ilcGiscus = monta;

  function avvia() { document.querySelectorAll('[data-term]#giscus, #giscus[data-term]').forEach(monta) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
