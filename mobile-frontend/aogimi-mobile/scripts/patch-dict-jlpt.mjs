// Patch JLPT levels into a bundled `dictionary.sqlite` without rebuilding it.
//
//   npm run patch-dict-jlpt                   # assets/dictionary.sqlite ← ../../backend/jlptwordslist
//   node scripts/patch-dict-jlpt.mjs [db] [csvDir]
//
// The canonical path is Postgres → helpers/files/build_sqlite_dict.js, which
// copies `words.jlpt_level` / `kanji.jlpt_level` across. This script applies
// the same lists straight to an existing SQLite file for when they change and
// the asset should follow without a full rebuild. It mirrors
// backend/migrations/033_jlpt_by_jmdict_id.psql rule for rule — keep the two
// in step:
//
//   1. a word on several lists gets the EASIER level (MAX numeric, N5 wins);
//   2. words not on any list lose their level (full reset, then set by jmdict_id);
//   3. kanji.jlpt_level = MAX(level) across tagged words containing the literal,
//      CJK Unified Ideographs only.
//
// Rows with a blank jmdict_seq (no JMdict entry) are skipped, as in 033.
//
// Nothing else needs bumping afterwards: openDictionary.ts uses Metro's hash
// of the asset bytes as its install marker, so a build that bundles the
// patched file makes every device re-copy it on next launch.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [
  dbPath = resolve(pkgDir, 'assets/dictionary.sqlite'),
  csvDir = resolve(pkgDir, '../../backend/jlptwordslist'),
] = process.argv.slice(2).map((p) => resolve(p));

// Same character class as the migration's `literal ~ '[一-鿿㐀-䶿]'`.
const HAN = /[一-鿿㐀-䶿]/u;

/** jmdict_id → easiest level across the five lists. */
function loadLists() {
  const best = new Map();
  let skipped = 0;
  for (const level of [5, 4, 3, 2, 1]) {
    const lines = readFileSync(resolve(csvDir, `n${level}.csv`), 'utf8').split('\n');
    for (const line of lines.slice(1)) {
      if (line.trim() === '') continue;
      // First column is jmdict_seq: digits or empty, never quoted.
      const seq = line.slice(0, line.indexOf(','));
      if (seq === '') {
        skipped++;
        continue;
      }
      const id = Number(seq);
      best.set(id, Math.max(best.get(id) ?? 0, level));
    }
  }
  return { best, skipped };
}

function levelCounts(db, table) {
  const out = {};
  for (const { level, n } of db
    .prepare(`SELECT jlpt_level AS level, COUNT(*) AS n FROM ${table} GROUP BY 1 ORDER BY 1`)
    .all()) {
    out[level ?? 'none'] = n;
  }
  return out;
}

const { best, skipped } = loadLists();
const db = new DatabaseSync(dbPath);
const before = { words: levelCounts(db, 'words'), kanji: levelCounts(db, 'kanji') };

db.exec('BEGIN');

db.exec('UPDATE words SET jlpt_level = NULL WHERE jlpt_level IS NOT NULL');
const setWord = db.prepare('UPDATE words SET jlpt_level = ? WHERE jmdict_id = ?');
let unmatched = 0;
for (const [id, level] of best) {
  if (setWord.run(level, id).changes === 0) unmatched++;
}

db.exec('UPDATE kanji SET jlpt_level = NULL WHERE jlpt_level IS NOT NULL');
const kanjiBest = new Map();
for (const { kanji, level } of db
  .prepare(
    `SELECT wk.kanji, w.jlpt_level AS level
       FROM words w JOIN word_kanji wk ON wk.word_id = w.id
      WHERE w.jlpt_level IS NOT NULL`,
  )
  .all()) {
  for (const ch of kanji) {
    if (HAN.test(ch)) kanjiBest.set(ch, Math.max(kanjiBest.get(ch) ?? 0, level));
  }
}
const setKanji = db.prepare('UPDATE kanji SET jlpt_level = ? WHERE literal = ?');
for (const [literal, level] of kanjiBest) setKanji.run(level, literal);

db.exec('COMMIT');

const after = { words: levelCounts(db, 'words'), kanji: levelCounts(db, 'kanji') };
db.close();

console.log(`${dbPath}\n${best.size} listed ids (${skipped} rows without a JMdict entry skipped), ${unmatched} not in this dictionary`);
for (const table of ['words', 'kanji']) {
  console.log(`\n${table}   level  before → after`);
  for (const level of ['none', 1, 2, 3, 4, 5]) {
    console.log(`${String(level).padStart(12)}  ${before[table][level] ?? 0} → ${after[table][level] ?? 0}`);
  }
}
