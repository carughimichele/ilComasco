/* =====================================================================
   ilComasco — Categorie delle notizie
   ---------------------------------------------------------------------
   QUESTO E' L'UNICO FILE DA MODIFICARE per aggiungere, rinominare o
   ricolorare una categoria. Lo leggono la home, l'archivio e la pagina
   dell'articolo.

   PER AGGIUNGERE UNA CATEGORIA:
     1. aggiungi una riga alla lista qui sotto
     2. aggiungi la stessa voce all'elenco in admin/config.yml
        (campo "Categoria", sezione options)

   Se una notizia usa una categoria che non e' in elenco, il sito NON si
   rompe: le assegna automaticamente un colore stabile ricavato dal nome
   e l'icona 📰. Serve solo per non dimenticarsene.

     nome    = testo esatto salvato nel CMS
     icona   = tracciati SVG dell'icona, disegnata a linea. Usano
               stroke="currentColor", quindi prendono da soli il colore
               della categoria. Griglia 24x24.
     base    = colore pieno (fascia della card, filtri attivi)
     chiaro  = variante schiarita, usata per la sfumatura della fascia
   ===================================================================== */

var CATEGORIE = [
  { nome: 'La squadra',       icona: '<path d="M12 3l7 3v5.2c0 4.1-2.9 7.5-7 8.6-4.1-1.1-7-4.5-7-8.6V6l7-3z"/>', base: '#0a4da2', chiaro: '#2e86ff' },
  { nome: 'Calciomercato',    icona: '<path d="M3 9h14"/><path d="M14 6l3 3-3 3"/><path d="M21 15H7"/><path d="M10 12l-3 3 3 3"/>', base: '#b45309', chiaro: '#f59f00' },
  { nome: 'Ufficialità',      icona: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14 8l2 2"/>', base: '#15803d', chiaro: '#2f9e44' },
  { nome: 'Amichevoli',       icona: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2"/><path d="M12 19v2"/><path d="M3 12h2"/><path d="M19 12h2"/><path d="M6 6l1.4 1.4"/><path d="M16.6 16.6L18 18"/><path d="M18 6l-1.4 1.4"/><path d="M7.4 16.6L6 18"/>', base: '#0e7490', chiaro: '#12b5c9' },
  { nome: 'Serie A',          icona: '<circle cx="12" cy="12" r="9"/><path d="M12 7.6l3.6 2.6-1.4 4.3H9.8L8.4 10.2z"/>', base: '#4338ca', chiaro: '#6c6ae8' },
  { nome: 'Champions League', icona: '<path d="M12 3.5l2.6 5.5 5.9.8-4.3 4.2 1.1 5.9-5.3-3-5.3 3 1.1-5.9L3.5 9.8l5.9-.8z"/>', base: '#6d28d9', chiaro: '#9d6bf5' },
  { nome: 'Coppa Italia',     icona: '<path d="M8 4h8v4.6a4 4 0 0 1-8 0V4z"/><path d="M8 5.4H5v1.8a3 3 0 0 0 3 3"/><path d="M16 5.4h3v1.8a3 3 0 0 1-3 3"/><path d="M12 12.6V17"/><path d="M8.5 20h7"/>', base: '#0f766e', chiaro: '#17a398' },
  { nome: 'Extra',            icona: '<path d="M11 3.5l1.5 4.4 4.4 1.5-4.4 1.5L11 15.3 9.5 10.9 5.1 9.4l4.4-1.5z"/><path d="M18.2 15.4l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>', base: '#52525b', chiaro: '#8b8b94' }
];

/* Vecchi nomi ancora presenti nelle notizie già pubblicate.
   Sinistra = come e' scritto nel JSON, destra = categoria da usare. */
var CATEGORIE_ALIAS = {
  'como': 'La squadra'
};

(function () {
  'use strict';

  var byKey = {};
  function key(s){ return String(s == null ? '' : s).trim().toLowerCase() }
  CATEGORIE.forEach(function (c) { byKey[key(c.nome)] = c });

  /* colore stabile per una categoria non in elenco: stessa parola,
     sempre lo stesso colore, senza bisogno di toccare il codice */
  function improvvisa(nome) {
    var h = 0, s = key(nome);
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return {
      nome: nome, icona: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>',
      base:   'hsl(' + h + ' 54% 33%)',
      chiaro: 'hsl(' + h + ' 60% 52%)',
      auto: true
    };
  }

  /* avvolge i tracciati in un <svg> pronto da inserire nell'HTML */
  function svg(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
      + ' style="width:1.15em;height:1.15em;flex:0 0 auto">' + paths + '</svg>';
  }

  window.CAT = {
    lista: CATEGORIE,

    /* info('Champions League') -> {nome, icona, base, chiaro, gradiente} */
    info: function (nome) {
      var k = key(nome);
      if (!k) k = 'la squadra';
      if (CATEGORIE_ALIAS[k]) k = key(CATEGORIE_ALIAS[k]);
      var c = byKey[k] || improvvisa(nome || 'Extra');
      return {
        nome: nome || c.nome,
        icona: svg(c.icona),
        base: c.base,
        chiaro: c.chiaro,
        auto: !!c.auto,
        gradiente: 'linear-gradient(150deg,' + c.chiaro + ',' + c.base + ')'
      };
    }
  };
})();
