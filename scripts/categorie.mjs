/* =====================================================================
   ilComasco — Categorie lato Node
   ---------------------------------------------------------------------
   NON contiene nessuna categoria: legge ed esegue js/categorie.js, lo
   stesso file che usa il sito nel browser. Cosi' colori, icone e alias
   restano scritti in un posto solo, esattamente come dice il commento
   in cima a quel file.
   ===================================================================== */

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

export function caricaCategorie(percorso) {
  const codice = readFileSync(percorso, 'utf8');
  const finta = {};
  const ambiente = createContext(finta);
  runInContext('var window = this;', ambiente);
  runInContext(codice, ambiente, { filename: percorso });
  if (!finta.CAT || typeof finta.CAT.info !== 'function') {
    throw new Error('js/categorie.js non ha definito window.CAT');
  }
  return finta.CAT;
}
