-- 031: repair dictionary encoding damage.
--
-- Repairs the mojibake left in the dictionary by the pre-StringDecoder
-- JMdict/JMnedict importers.
--
-- The entity-rewriting Transform in helpers/files/parse_jmdict.js and
-- parse_jmnedict.js decoded each 64 KB read chunk with Buffer#toString('utf8').
-- A read boundary that falls inside a multi-byte character leaves orphaned
-- bytes, and toString cannot hold them back, so each became its own U+FFFD:
-- 資源エネルギー庁 was imported as 資源エネ���ギー庁. Fixed at source by
-- switching that Transform to a StringDecoder; this file repairs the rows the
-- old code already wrote.
--
-- Dictionary tables only, so reset_user_data.sql is deliberately NOT touched
-- (same rationale as 030). No user data is read or written.
--
-- Idempotent by construction: every UPDATE requires chr(65533) in the target
-- column, so a repaired row no longer matches and a second run is a no-op.
-- Scoped per entry as well, and no entry has two corrupted values in the same
-- field, so each statement can only touch the row it means to.
--
-- Row counts to expect on a first run. These were verified by applying this
-- repair to a copy of the shipped mobile bundle, which is a dump of the same
-- Postgres tables — every count below came back exactly:
--     word_kanji       23
--     word_readings    38
--     word_meanings    36   (Russian + Hungarian; no English gloss
--                          was affected, so gloss_norm and the English-only
--                          FTS index need no recompute)
--     names           175
--   plus, for matches the corrupted text had blocked:
--     pitch_accents    10
--     jlpt_level        1
--
-- The pitch figure is 10, not the 18 rows the pitch section lists. A word with
-- several kanji forms usually had only one of them corrupted, so the
-- kanji-anchored pass in parse_pitch_accents.js had already matched through an
-- intact form: 8 of the 18 readings already carry the right accent, and the
-- IS DISTINCT FROM guard correctly skips them. Verified by replaying this file
-- against a copy of the shipped bundle — 23, 38, 36, 110, 65, 10, 1.
--
-- Run:  psql "$DATABASE_URL" -f migrations/031_repair_dict_encoding.sql


BEGIN;

-- ── Kanji forms ──────────────────────────────────────────────────────────────
WITH fixes(jmdict_id, correct) AS (VALUES
  (1011520, 'ベロベロ舐める'),
  (1325760, '主席研究員'),
  (1658340, '資源エネルギー庁'),
  (1664850, 'かけ橋'),
  (1680950, '片口'),
  (1755980, '義軍'),
  (1764450, '盛りだくさん'),
  (1964770, 'ジャカード機'),
  (2126260, '腹に据え兼ねる'),
  (2154240, '絵組み'),
  (2181330, '仇になる'),
  (2208950, 'アイロンを掛ける'),
  (2245240, '一之宮'),
  (2362240, '主管機関領域名'),
  (2375850, '通貨記号'),
  (2419600, '物は使い様'),
  (2428430, '枠形アンテナ'),
  (2451350, 'かくはん機'),
  (2574270, '回り灯籠'),
  (2846826, 'サントメ・プリンシペ民主共和国'),
  (2854093, '袖ビーム'),
  (2865787, '２周目'),
  (5329102, '市立養護学校')
)
UPDATE word_kanji wk
   SET kanji = f.correct
  FROM words w, fixes f
 WHERE w.id = wk.word_id
   AND w.jmdict_id = f.jmdict_id
   AND wk.kanji LIKE '%' || chr(65533) || '%';

-- ── Kana readings ────────────────────────────────────────────────────────────
WITH fixes(jmdict_id, correct) AS (VALUES
  (1110480, 'フォグ'),
  (1132480, 'メーク・オーバー'),
  (1133880, 'メモリアル'),
  (1199340, 'まわし'),
  (1214400, 'かんりゃくか'),
  (1217460, 'にせてがみ'),
  (1299940, 'さんかい'),
  (1430220, 'ちょうじょう'),
  (1492500, 'ふさく'),
  (1913680, 'ゆうきをふるいおこす'),
  (1945540, 'はんたいは'),
  (1993140, 'こくさいたいほじょう'),
  (2051580, 'にょうぼうこうこう'),
  (2129620, 'ないけいどうみゃく'),
  (2193420, 'クリスマス・リース'),
  (2247070, 'すかす'),
  (2436320, 'インスティチュート'),
  (2460640, 'クジャクソウ'),
  (2471450, 'オフ・ザ・ジョブ・トレーニング'),
  (2572520, 'しょにちがでる'),
  (2653010, 'じゅんかんぶん'),
  (2788260, 'くすだまつめくさ'),
  (2825851, 'たけすみ'),
  (2831107, 'ゆるしをこう'),
  (2832671, 'ブラウアー・ポルトギーザー'),
  (2837996, 'おうべいか'),
  (2840755, 'アンダーコントロール'),
  (2841997, 'マインドフルネス'),
  (2850923, 'しがいか'),
  (2857434, 'ダブリュー・エイチ・オー'),
  (2858234, 'さとうごろも'),
  (2861641, 'みつくち'),
  (2865328, 'スモールサイズ'),
  (2866619, 'ドレミファれんしゅう'),
  (2867220, 'ぬらりひょん'),
  (5009653, 'アテネのタイモン'),
  (5451056, 'せいしょうねんたいさくほんぶ'),
  (5746387, 'ねずみのよめいり')
)
UPDATE word_readings wr
   SET kana = f.correct
  FROM words w, fixes f
 WHERE w.id = wr.word_id
   AND w.jmdict_id = f.jmdict_id
   AND wr.kana LIKE '%' || chr(65533) || '%';

-- ── Glosses (Russian + Hungarian only; no English gloss was affected, so
-- gloss_norm needs no recompute and the tsv column regenerates itself) ───────
WITH fixes(jmdict_id, lang, correct) AS (VALUES
  (1095670, 'hun', 'felépítmény hajó farán'),
  (1119230, 'rus', '((от) ベースI 1 (и англ.) up) повышение зарплаты (ставки)'),
  (1151820, 'rus', '{～な} злокачественный'),
  (1197580, 'rus', 'иллюстрированный журнал'),
  (1219510, 'rus', '(как опред.) радостный, весёлый; (как сказ.) рад, радуюсь; (что-л.) приятно, радует'),
  (1248580, 'rus', 'военная система (организация)'),
  (1254350, 'rus', 'решительный бой, решающее сражение; (спорт.) решающая игра (схватка); финальное соревнование; повторная игра после ничьей'),
  (1275640, 'rus', '1) рот; уста, губы'),
  (1314960, 'rus', '(буд.) прислужник, послушник'),
  (1320230, 'rus', '2) (при извинении)'),
  (1389830, 'rus', '{～に} по собственному усмотрению, самочинно; по своему произволу'),
  (1420500, 'rus', 'становиться широко известным, получать широкую известность; широко распространяться (напр. об известии)'),
  (1431740, 'rus', '1) тишина, спокойствие; покой, безмятежность'),
  (1440910, 'rus', '3) единство, согласованность'),
  (1448620, 'rus', '{～する} лечиться (принимать ванны) на горячих источниках'),
  (1515470, 'rus', '{～する} содержать в себе, включать, охватывать'),
  (1530820, 'rus', '(кн.) несравненный, бесподобный, не имеющий себе равного'),
  (1572440, 'rus', '2) выцветший (поблекший) цвет'),
  (1578540, 'hun', 'ügyfél'),
  (1592100, 'rus', '2) существовать, жить (чем-л.); поддерживать существование'),
  (1628530, 'rus', '{～では} а) так, таким образом; б) при сложившихся обстоятельствах, при таких условиях, при таком положении дел'),
  (1642900, 'rus', '1) замешивание (напр. теста); (ср.) ねり【煉り】'),
  (1659240, 'rus', 'сбор, соединение, сосредоточение, концентрация'),
  (1682170, 'rus', 'центр мишени (обозначенный золотым цветом); (обр.) большая цель; очень желаемое'),
  (1688140, 'rus', 'повесть (роман) с продолжением (печатающийся из номера в номер); кинокартина из нескольких серий'),
  (1715810, 'rus', 'ученик-практикант'),
  (1746900, 'rus', '(юр.) защитник по назначению (судебными органами)'),
  (1750270, 'rus', 'иссиня-чёрный, вороной; (обр.) очень бледный, измождённый'),
  (1771770, 'rus', '1) повышение дивидендов'),
  (1830690, 'hun', 'áldozás'),
  (1891790, 'rus', 'общество взаимопомощи'),
  (1937110, 'hun', 'előnyben részesítés'),
  (2019560, 'rus', '((англ.) car navigation system) автомобильная навигационная система'),
  (2057760, 'rus', '(прост.) Митян-Хатян (уменьшительные от очень распространённых женских имён Мицу и Хацу; уничижительное прозвище малообразованных девушек в Токио)'),
  (2202100, 'rus', '2) (театр.) смена декораций; ()'),
  (2462650, 'rus', '(связ.:) …は記憶から拭い去られた (что-л.) стёрлось у меня в памяти, (что-л.) выпало у меня из памяти')
)
UPDATE word_meanings wm
   SET meaning = f.correct
  FROM words w, fixes f
 WHERE w.id = wm.word_id
   AND w.jmdict_id = f.jmdict_id
   AND wm.lang = f.lang
   AND wm.meaning LIKE '%' || chr(65533) || '%';

-- ── Proper names ─────────────────────────────────────────────────────────────
WITH fixes(jmnedict_id, correct) AS (VALUES
  (5000283, 'あけぼのちょう'),
  (5005610, 'びんごうんどうこうえん'),
  (5020672, 'オロウエンポロナイがわ'),
  (5033273, 'コルビッツ'),
  (5034714, 'サカサナ'),
  (5035786, 'サルメロンイアロンソ'),
  (5036126, 'サンタモニカ'),
  (5047288, 'ソレンコワ'),
  (5048009, 'タダラノさわ'),
  (5056732, 'ドックランズ'),
  (5058558, 'ニキータ'),
  (5072548, 'ブレヤがわ'),
  (5081529, 'マドレイラさん'),
  (5082244, 'マルガリータ'),
  (5109286, 'やすはらかみひがし'),
  (5121133, 'いのうえたけひこ'),
  (5123059, 'いそやみさき'),
  (5128101, 'いばらだ'),
  (5133838, 'うぎ'),
  (5139591, 'あきかず'),
  (5143118, 'えんば'),
  (5146880, 'おくすそばなダム'),
  (5162013, 'よしゆき'),
  (5191375, 'ままほんまち'),
  (5195672, 'いわむらたヒカリゴケさんち'),
  (5210973, 'きつたか'),
  (5216875, 'きゅうしろう'),
  (5220022, 'きょうだいれいちょうるいけんきゅうじょ'),
  (5231967, 'くきしゅうぞう'),
  (5247975, 'たけおみ'),
  (5249902, 'みぐち'),
  (5270441, 'むくやもとまち'),
  (5273016, 'くどうあき'),
  (5275570, 'ひろでんはつかいちえき'),
  (5289773, 'たかじょうばし'),
  (5292819, 'ごうぞうざん'),
  (5296066, 'くろず'),
  (5309323, 'ざいちょうぜ'),
  (5310861, 'さかいもと'),
  (5324119, 'やまもとがく'),
  (5326311, 'しかめやま'),
  (5343106, 'しばお'),
  (5347855, 'すみか'),
  (5359972, 'やどや'),
  (5371121, 'こばさま'),
  (5372658, 'こやまいけ'),
  (5373573, 'こつねぎだに'),
  (5380695, 'しょうぞう'),
  (5385684, 'まつたけちょうごううら'),
  (5387490, 'しょうぼうがっこう'),
  (5400470, 'きのわさくあと'),
  (5406446, 'しんきょうごく'),
  (5409156, 'しんひらゆおんせん'),
  (5409460, 'あらきむらした'),
  (5441747, 'きよなり'),
  (5443873, 'にしかいでんこめの'),
  (5448304, 'にしまばしくらもとちょう'),
  (5453587, 'せっくきん'),
  (5458830, 'ぜっかい'),
  (5470395, 'よしなお'),
  (5477056, 'あいま'),
  (5480557, 'のりえ'),
  (5482114, 'むらやまばし'),
  (5492047, 'おおえきたふくにし'),
  (5496254, 'おおしまぐんちなちょう'),
  (5505852, 'たんようちょうどさき'),
  (5508446, 'ちてきざいさんせんりゃくかいぎ'),
  (5509089, 'ちもり'),
  (5517115, 'なかすだえき'),
  (5517711, 'なかむらあずさ'),
  (5523225, 'ししむた'),
  (5523874, 'ちょうぜん'),
  (5530981, 'なおみち'),
  (5531620, 'つすみ'),
  (5534435, 'つばきだんち'),
  (5534743, 'つまごいこうげんゴルフじょう'),
  (5536002, 'ていじろう'),
  (5541727, 'でんくろう'),
  (5546370, 'わたなべみちのぶ'),
  (5552018, 'ひがしのむかい'),
  (5574414, 'みなみあきたぐんいかわまち'),
  (5574707, 'みなみあらなみまち'),
  (5575008, 'みなみあさだ'),
  (5582121, 'にちふつ'),
  (5582824, 'にっぽんだいたいいりょうけんきゅうじょ'),
  (5589088, 'まきがわ'),
  (5590936, 'はぎながれ'),
  (5596841, 'はっしょう'),
  (5608272, 'みさか'),
  (5616303, 'ふてんのす'),
  (5619435, 'ぬのべたかのり'),
  (5621650, 'むとうひろみち'),
  (5634677, 'ぽこ'),
  (5646277, 'きたのしょうにし'),
  (5649932, 'ほんじょううんどうこうえん'),
  (5659658, 'たえり'),
  (5661908, 'なべ'),
  (5665775, 'しげぞう'),
  (5668601, 'きさわわん'),
  (5672379, 'のなかひいらぎ'),
  (5677760, 'ただすけ'),
  (5684669, 'わくしま'),
  (5693219, 'ひびき'),
  (5695154, 'らん'),
  (5706413, 'よしたか'),
  (5711270, 'すずひこ'),
  (5715723, 'しとうりあんじゅうじ'),
  (5717644, 'わだむら'),
  (5734633, 'ぐみざき'),
  (5736593, 'しゅんみ')
)
UPDATE names n
   SET kana = f.correct
  FROM fixes f
 WHERE n.jmnedict_id = f.jmnedict_id
   AND n.kana LIKE '%' || chr(65533) || '%';

WITH fixes(jmnedict_id, correct) AS (VALUES
  (5001700, 'かじ子'),
  (5092058, 'リンゼイ美恵子'),
  (5108321, '粟飯原'),
  (5111476, '安房博物館'),
  (5151764, '沖津ノ目島'),
  (5158583, '下中川原'),
  (5165521, '嘉根'),
  (5166821, '夏都美'),
  (5168449, '歌島橋'),
  (5175151, '会島'),
  (5198867, '寄延'),
  (5199522, '希志雄'),
  (5210055, '吉田善吾'),
  (5224139, '鏡赦'),
  (5227629, '琴公'),
  (5228876, '近浪廣'),
  (5235430, '熊島'),
  (5261904, '五味文彦'),
  (5262858, '吾妻高原牧場'),
  (5273338, '幸ノ小島'),
  (5291879, '高野沢川'),
  (5293143, '合戦場駅'),
  (5323816, '山之谷東'),
  (5355271, '秋成'),
  (5384211, '松井秀文'),
  (5420788, '仁生'),
  (5429600, '世雄'),
  (5446231, '西条町馬木'),
  (5446523, '西整理'),
  (5453288, '石家荘'),
  (5453885, '石崎'),
  (5461400, '千速晃会'),
  (5463313, '宣善'),
  (5475149, '早稲田鶴巻'),
  (5479616, '増位新町'),
  (5482406, '村瀬洋介'),
  (5493565, '大聖寺相生町'),
  (5504601, '谷村有美'),
  (5513802, '筑後川昇開橋'),
  (5518287, '中沢なつき'),
  (5520379, '中野沢川'),
  (5530012, '鳥豆'),
  (5530331, '直義'),
  (5531305, '津々井'),
  (5538900, '鉄穴'),
  (5540778, '天田貴子'),
  (5553747, '東原東'),
  (5562478, '藤島桓夫'),
  (5573519, '南逆瀬川町'),
  (5582374, '日本外国特派員協会'),
  (5585574, '乃菜'),
  (5617251, '富三穂'),
  (5620401, '芙実江'),
  (5645678, '北大矢知'),
  (5649324, '本鴨'),
  (5652174, '麻植塚駅'),
  (5664176, '明未莉'),
  (5664818, '鳴沢岳'),
  (5674915, '矢内原'),
  (5685996, '由利菜'),
  (5688961, '夕雨香'),
  (5696787, '李々'),
  (5708624, '琳々佳'),
  (5716053, '和果奈'),
  (5724490, '憙子')
)
UPDATE names n
   SET kanji = f.correct
  FROM fixes f
 WHERE n.jmnedict_id = f.jmnedict_id
   AND n.kanji LIKE '%' || chr(65533) || '%';

-- ── Pitch accents unblocked by the repair ────────────────────────────────────
-- A corrupted kanji form or reading could not match Kanjium's accents.txt, so
-- these readings were left with pitch_accents NULL. Values below replay
-- parse_pitch_accents.js's matching rules against the repaired forms; running
-- that script again instead produces the same result.
WITH fixes(jmdict_id, kana, accent) AS (VALUES
  (1199340, 'まわし', '0'),
  (1430220, 'ちょうじょう', '3'),
  (1492500, 'ふさく', '0'),
  (1658340, 'しげんエネルギーちょう', '7'),
  (1664850, 'かけはし', '2'),
  (1680950, 'かたくち', '0'),
  (1755980, 'ぎぐん', '0,1'),
  (1764450, 'もりだくさん', '3,5,4'),
  (1945540, 'はんたいは', '0'),
  (1964770, 'ジャカードき', '4'),
  (2154240, 'えぐみ', '0'),
  (2245240, 'いちのみや', '2,3'),
  (2247070, 'すかす', '0'),
  (2428430, 'わくがたアンテナ', '5'),
  (2451350, 'かくはんき', '3'),
  (2460640, 'くじゃくそう', '0'),
  (2574270, 'まわりどうろう', '4'),
  (2861641, 'みつくち', '0')
)
UPDATE word_readings wr
   SET pitch_accents = f.accent
  FROM words w, fixes f
 WHERE w.id = wr.word_id
   AND w.jmdict_id = f.jmdict_id
   AND wr.kana = f.kana
   AND wr.pitch_accents IS DISTINCT FROM f.accent;

-- ── JLPT level unblocked by the repair ───────────────────────────────────────
-- 012_jlpt_backfill.sql joins word_kanji.kanji + word_readings.kana against the
-- staged CSV rows; a corrupted reading missed the join and left jlpt_level NULL.
-- This sets only words.jlpt_level. kanji.jlpt_level is derived as a MAX across
-- every matched word, so re-run 011_jlpt_seed.psql + 012_jlpt_backfill.sql if
-- you want that recomputed too (both are idempotent).
WITH fixes(jmdict_id, level) AS (VALUES
  (1430220, 3)
)
UPDATE words w
   SET jlpt_level = f.level::smallint
  FROM fixes f
 WHERE w.jmdict_id = f.jmdict_id
   AND w.jlpt_level IS DISTINCT FROM f.level::smallint;

COMMIT;

-- ── Verification ─────────────────────────────────────────────────────────────
-- Every count must be 0. A non-zero row here means the repair missed something
-- (most likely because that table was imported from a different XML revision
-- than helpers/files/data/).
SELECT 'word_kanji'    AS tbl, count(*) FROM word_kanji    WHERE kanji   LIKE '%' || chr(65533) || '%'
UNION ALL SELECT 'word_readings', count(*) FROM word_readings WHERE kana    LIKE '%' || chr(65533) || '%'
UNION ALL SELECT 'word_meanings', count(*) FROM word_meanings WHERE meaning LIKE '%' || chr(65533) || '%'
UNION ALL SELECT 'names_kana',    count(*) FROM names WHERE kana    LIKE '%' || chr(65533) || '%'
UNION ALL SELECT 'names_kanji',   count(*) FROM names WHERE kanji   LIKE '%' || chr(65533) || '%'
UNION ALL SELECT 'names_meaning', count(*) FROM names WHERE meaning LIKE '%' || chr(65533) || '%';

-- The entry this was reported through: expect 資源エネルギー庁 / しげんエネルギーちょう.
SELECT wk.kanji, wr.kana
  FROM words w
  JOIN word_kanji    wk ON wk.word_id = w.id
  JOIN word_readings wr ON wr.word_id = w.id
 WHERE w.jmdict_id = 1658340;
