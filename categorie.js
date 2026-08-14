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
     emoji   = icona mostrata prima del nome
     base    = colore pieno (fascia della card, filtri attivi)
     chiaro  = variante schiarita, usata per la sfumatura della fascia
   ===================================================================== */

var CATEGORIE = [
  { nome: 'La squadra',       emoji: '🛡️', base: '#0a4da2', chiaro: '#2e86ff' },
  { nome: 'Calciomercato',    emoji: '🔄', base: '#b45309', chiaro: '#f59f00' },
  { nome: 'Ufficialità',      emoji: '✍️', base: '#15803d', chiaro: '#2f9e44' },
  { nome: 'Amichevoli',       emoji: '🤝', base: '#0e7490', chiaro: '#12b5c9' },
  { nome: 'Serie A',          emoji: '⚽', base: '#4338ca', chiaro: '#6c6ae8' },
  { nome: 'Champions League', emoji: '⭐', base: '#6d28d9', chiaro: '#9d6bf5' },
  { nome: 'Coppa Italia',     emoji: '🏆', base: '#0f766e', chiaro: '#17a398' },
  { nome: 'Extra',            emoji: '✨', base: '#52525b', chiaro: '#8b8b94' }
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
      nome: nome, emoji: '📰',
      base:   'hsl(' + h + ' 54% 33%)',
      chiaro: 'hsl(' + h + ' 60% 52%)',
      auto: true
    };
  }

  window.CAT = {
    lista: CATEGORIE,

    /* info('Champions League') -> {nome, emoji, base, chiaro, gradiente} */
    info: function (nome) {
      var k = key(nome);
      if (!k) k = 'la squadra';
      if (CATEGORIE_ALIAS[k]) k = key(CATEGORIE_ALIAS[k]);
      var c = byKey[k] || improvvisa(nome || 'Extra');
      return {
        nome: nome || c.nome,
        emoji: c.emoji,
        base: c.base,
        chiaro: c.chiaro,
        auto: !!c.auto,
        gradiente: 'linear-gradient(150deg,' + c.chiaro + ',' + c.base + ')'
      };
    }
  };
})();
