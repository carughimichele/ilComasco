import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const OUT = 'data/standings.json';
const COMPS = [
  { code: 'SA', label: 'Serie A' },
  { code: 'CL', label: 'Champions League' }
];

async function fetchOne(c) {
  const r = await fetch(`https://api.football-data.org/v4/competitions/${c.code}/standings`, {
    headers: { 'X-Auth-Token': TOKEN }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  const totals = (j.standings || []).filter(s => s.type === 'TOTAL');
  const rows = [];
  for (const s of totals) {
    for (const t of (s.table || [])) {
      rows.push({
        pos: t.position,
        team: t.team?.shortName || t.team?.name || '',
        crest: t.team?.crest || '',
        g: t.playedGames ?? 0,
        dr: t.goalDifference ?? 0,
        pts: t.points ?? 0
      });
    }
  }
  if (totals.length > 1) {
    rows.sort((a, b) => b.pts - a.pts || b.dr - a.dr);
    rows.forEach((r, i) => { r.pos = i + 1; });
  } else {
    rows.sort((a, b) => a.pos - b.pos);
  }
  return {
    code: c.code,
    label: c.label,
    matchday: j.season?.currentMatchday ?? null,
    season: { start: j.season?.startDate ?? null, end: j.season?.endDate ?? null },
    table: rows
  };
}

const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { competitions: [] };
const out = { updated: new Date().toISOString(), competitions: [] };

for (const c of COMPS) {
  try {
    out.competitions.push(await fetchOne(c));
    console.log(`${c.code}: ok`);
  } catch (e) {
    console.log(`${c.code}: ${e.message} — tengo i dati precedenti`);
    const old = (previous.competitions || []).find(x => x.code === c.code);
    if (old) out.competitions.push(old);
  }
}

writeFileSync(OUT, JSON.stringify(out, null, 2));
