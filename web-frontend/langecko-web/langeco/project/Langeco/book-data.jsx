// Sample book content — public-domain Japanese + translations.
// Natsume Sōseki — Kokoro (excerpt, opening)
const kokoroParagraphs = [
  { ja: '私はその人を常に先生と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。', en: 'I always called him Sensei. So here too I will simply write "Sensei" and not reveal his real name.' },
  { ja: 'これは世間を憚かる遠慮というよりも、その方が私にとって自然だからである。', en: 'This is less out of deference to the world than because it feels more natural to me.' },
  { ja: '私はその人の記憶を呼び起すごとに、すぐ「先生」といいたくなる。筆を執っても心持は同じ事である。', en: 'Whenever I summon his memory, the word "Sensei" comes naturally to my lips — and the feeling is the same when I take up my pen.' },
  { ja: 'よそよそしい頭文字などはとても使う気にならない。', en: 'I could never bring myself to use distant, impersonal initials in his place.' },
  { ja: '私が先生と知り合いになったのは鎌倉である。その時私はまだ若々しい書生であった。', en: 'I met Sensei in Kamakura. I was still a youthful student at the time.' },
  { ja: '暑中休暇を利用して海水浴に行った友達からぜひ来いという端書を受け取ったので、私は多少の金を工面して、出掛ける事にした。', en: 'A friend, making use of the summer vacation for sea-bathing, had sent me a postcard urging me to come, so I scraped together some money and set out.' },
];

// Miyazawa Kenji — 注文の多い料理店 (The Restaurant of Many Orders, excerpt)
const miyazawaParagraphs = [
  { ja: '二人の若い紳士が、すっかりイギリスの兵隊のかたちをして、ぴかぴかする鉄砲をかついで、白熊のような犬を二疋つれて、だいぶ山奥の、木の葉のかさかさしたとこを、こんなことを云ひながら、あるいてをりました。', en: 'Two young gentlemen, dressed up smartly like British soldiers, shouldering gleaming rifles and leading two polar-bear-like dogs, were walking deep in the mountains through the rustling dead leaves, saying things like this:' },
  { ja: '「ぜんたい、ここらの山は怪しからんね。鳥も獣も一疋も居やがらん。なんでも構はないから、早くタンタアーンと、やつて見たいもんだなあ。」', en: '"Really, the mountains around here are outrageous. Not a single bird or beast to be seen. I don\'t care what it is — I just want to fire off a good loud BANG BANG as soon as possible."' },
  { ja: '「鹿の黄いろな横っ腹なんぞに、二三発お見舞ひ申したら、ずゐぶん痛快だらうねえ。くるくる廻つて、それからどたつと倒れるだらうねえ。」', en: '"If we landed two or three shots into a deer\'s yellow flank, wouldn\'t that be splendid? It would spin round and round, then topple over with a thump."' },
];

const tocData = [
  { n: '序', title: '上　先生と私', page: 7, active: true, children: [
    { n: '一', title: '鎌倉の海', page: 7, active: true },
    { n: '二', title: '茶屋にて', page: 18 },
    { n: '三', title: '先生の家', page: 32 },
    { n: '四', title: '奥さん', page: 47 },
  ]},
  { n: '中', title: '両親と私', page: 128 },
  { n: '下', title: '先生と遺書', page: 214 },
];

const bookmarksData = [
  { n: 7, chapter: '上・一', excerpt: '私はその人を常に先生と…', date: 'Apr 12' },
  { n: 34, chapter: '上・三', excerpt: '墓地を貫く大きな銀杏の…', date: 'Apr 14' },
  { n: 102, chapter: '上・十二', excerpt: '奥さんと先生との間には…', date: 'Apr 17' },
];

const libraryBooks = [
  { title: 'こゝろ', author: '夏目 漱石', progress: 34, cover: '#6B5A45', level: 'N2', days: 12 },
  { title: '注文の多い料理店', author: '宮沢 賢治', progress: 78, cover: '#2E5D4E', level: 'N3', days: 4 },
  { title: '走れメロス', author: '太宰 治', progress: 100, cover: '#8E3B36', level: 'N3', days: 21 },
  { title: '銀河鉄道の夜', author: '宮沢 賢治', progress: 15, cover: '#263B5C', level: 'N2', days: 2 },
  { title: '吾輩は猫である', author: '夏目 漱石', progress: 0, cover: '#4A4038', level: 'N1', days: 0 },
  { title: '坊っちゃん', author: '夏目 漱石', progress: 56, cover: '#7A5330', level: 'N2', days: 9 },
];

window.BookData = { kokoroParagraphs, miyazawaParagraphs, tocData, bookmarksData, libraryBooks };
