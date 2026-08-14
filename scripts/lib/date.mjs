/* =====================================================================
   ilComasco — Date
   ---------------------------------------------------------------------
   Nel CMS la data puo' essere "2026-08-09" oppure "2026-08-09T18:30".
   Qui viene trasformata nei tre formati che servono:
     testo   -> "9 agosto 2026"          (quello che legge il tifoso)
     iso     -> "2026-08-09T18:30:00+02:00" (per Google e per i social)
     rfc822  -> "Sun, 09 Aug 2026 18:30:00 +0200" (per il feed RSS)
   L'ora legale italiana e' calcolata dal fuso Europe/Rome, non a mano.
   ===================================================================== */

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MESI_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* scarto dall'ora di Greenwich a Como in quella data: +02:00 o +01:00 */
function scarto(d) {
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', timeZoneName: 'longOffset' });
    const s = f.format(d).match(/GMT([+-]\d{2}:\d{2})/);
    if (s) return s[1];
  } catch (e) {}
  const m = d.getUTCMonth();
  return (m >= 3 && m <= 9) ? '+02:00' : '+01:00';
}

export function leggi(valore) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(valore || ''));
  if (!m) return null;
  const anno = +m[1], mese = +m[2], giorno = +m[3], ore = +(m[4] || 0), min = +(m[5] || 0);
  const conOra = !!m[4];
  // data di riferimento in UTC, serve solo per capire il giorno della settimana e il fuso
  const utc = new Date(Date.UTC(anno, mese - 1, giorno, ore, min));
  const off = scarto(utc);
  const p = n => String(n).padStart(2, '0');
  return {
    conOra,
    ordina: `${m[1]}-${m[2]}-${m[3]}T${p(ore)}:${p(min)}`,
    giornoIso: `${m[1]}-${m[2]}-${m[3]}`,
    testo: `${giorno} ${MESI[mese - 1]} ${anno}`,
    testoBreve: `${giorno} ${MESI[mese - 1].slice(0, 3)} ${anno}`,
    iso: `${m[1]}-${m[2]}-${m[3]}T${p(ore)}:${p(min)}:00${off}`,
    rfc822: `${GIORNI_EN[utc.getUTCDay()]}, ${p(giorno)} ${MESI_EN[mese - 1]} ${anno} `
          + `${p(ore)}:${p(min)}:00 ${off.replace(':', '')}`
  };
}

export const oggi = () => new Date().toISOString().slice(0, 10);
