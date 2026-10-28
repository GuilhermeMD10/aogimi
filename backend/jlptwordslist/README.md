# JLPT word lists

`n1.csv` … `n5.csv` are the `original_data/` files of
[stephenmk/yomitan-jlpt-vocab](https://github.com/stephenmk/yomitan-jlpt-vocab),
copied verbatim (fetched 2026-10-28; last upstream change to that folder is
commit `b062d4e`, 2025-08-26). Columns: `jmdict_seq,kana,kanji,waller_definition`.

They are Jonathan Waller's JLPT vocabulary lists (tanos.co.uk, CC BY) with every
word hand-mapped to its JMdict entry id by stephenmk (CC BY-SA 4.0). 14 rows in
`n1.csv` have a blank `jmdict_seq` — words with no JMdict entry — and are skipped.

Loaded by `migrations/033_jlpt_by_jmdict_id.psql`, which sets `words.jlpt_level`
by `jmdict_id` (easier level wins when a word is on several lists) and derives
`kanji.jlpt_level` from the tagged words. Before 033 this folder held the same
lists as `expression,reading,meaning,tags` (via jamsinclair/open-anki-jlpt-decks)
and 012 matched them by text, which mis-tagged homophones.

The root `.gitignore` ignores every `n{1..5}.csv`; these five are re-included
explicitly there.
