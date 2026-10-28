-- Superseded by 033_jlpt_by_jmdict_id.psql.
--
-- This file used to derive words.jlpt_level + kanji.jlpt_level from the rows
-- 011 staged in `_jlpt_raw`, matching JMdict by (kanji form, reading) and
-- letting a kana-only row tag every kana-only entry with that reading. That is
-- what gave homophones wrong chips; 033 matches on the JMdict entry id instead
-- and carries the two rules worth keeping (easier level wins, kanji level =
-- MAX across tagged words). All that is left here is dropping the staging
-- table 010 still creates, so a fresh chain ends with the same schema as before.

BEGIN;

DROP TABLE IF EXISTS _jlpt_raw;

COMMIT;
