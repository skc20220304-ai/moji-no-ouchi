export type KanaRow = 'あ' | 'か' | 'さ' | 'た' | 'な' | 'は' | 'ま' | 'や' | 'ら' | 'わ';

/** A single illustrated word. `assetKey` stays stable when emoji are replaced by WebP art. */
export interface Picture {
  id: string;
  word: string;
  emoji: string;
  kana: string;
  row: KanaRow;
  assetKey: string;
}

type WordSeed = readonly [word: string, emoji: string];

const rowFor = (kana: string): KanaRow => {
  if ('あいうえお'.includes(kana)) return 'あ';
  if ('かきくけこ'.includes(kana)) return 'か';
  if ('さしすせそ'.includes(kana)) return 'さ';
  if ('たちつてと'.includes(kana)) return 'た';
  if ('なにぬねの'.includes(kana)) return 'な';
  if ('はひふへほ'.includes(kana)) return 'は';
  if ('まみむめも'.includes(kana)) return 'ま';
  if ('やゆよ'.includes(kana)) return 'や';
  if ('らりるれろ'.includes(kana)) return 'ら';
  return 'わ';
};

// First release art manifest: four immediately recognisable words for every kana in あ行・か行.
// These emoji are the temporary renderer; the assetKey is the future transparent WebP filename.
const firstAreaWords: Readonly<Record<string, readonly WordSeed[]>> = {
  あ: [['あり', '🐜'], ['あひる', '🦆'], ['あめ', '🌧️'], ['あおむし', '🐛']],
  い: [['いぬ', '🐶'], ['いちご', '🍓'], ['いす', '🪑'], ['いか', '🦑']],
  う: [['うさぎ', '🐰'], ['うし', '🐮'], ['うみ', '🌊'], ['うでどけい', '⌚']],
  え: [['えび', '🦐'], ['えんぴつ', '✏️'], ['えき', '🚉'], ['えだまめ', '🫛']],
  お: [['おにぎり', '🍙'], ['おおかみ', '🐺'], ['おうち', '🏠'], ['おれんじ', '🍊']],
  か: [['かめ', '🐢'], ['かさ', '☂️'], ['かに', '🦀'], ['かえる', '🐸']],
  き: [['きつね', '🦊'], ['きりん', '🦒'], ['きのこ', '🍄'], ['きしゃ', '🚂']],
  く: [['くじら', '🐋'], ['くるま', '🚗'], ['くま', '🐻'], ['くつ', '👟']],
  け: [['けーき', '🍰'], ['けむし', '🐛'], ['けいと', '🧶'], ['けしごむ', '🧽']],
  こ: [['こあら', '🐨'], ['こいぬ', '🐕'], ['こま', '🪀'], ['こおり', '🧊']]
};

export const adventureKana = Object.keys(firstAreaWords);
export const vocabulary: readonly Picture[] = Object.entries(firstAreaWords).flatMap(([kana, words]) =>
  words.map(([word, emoji]) => ({ id: `${kana}-${word}`, word, emoji, kana, row: rowFor(kana), assetKey: `kana/${kana}/${word}` }))
);

// Kept as a one-picture-per-kana collection for the current game screen and the full 46-kana book.
const fallbackWords: readonly (readonly [string, string, string])[] = [
  ['さ', 'さる', '🐒'], ['し', 'しまうま', '🦓'], ['す', 'すいか', '🍉'], ['せ', 'せみ', '🦗'], ['そ', 'そら', '🌤️'],
  ['た', 'たこ', '🐙'], ['ち', 'ちょうちょ', '🦋'], ['つ', 'つき', '🌙'], ['て', 'てんとうむし', '🐞'], ['と', 'とまと', '🍅'],
  ['な', 'なす', '🍆'], ['に', 'にんじん', '🥕'], ['ぬ', 'ぬの', '🧣'], ['ね', 'ねこ', '🐱'], ['の', 'のり', '🍘'],
  ['は', 'はな', '🌷'], ['ひ', 'ひつじ', '🐑'], ['ふ', 'ふね', '⛵'], ['へ', 'へび', '🐍'], ['ほ', 'ほし', '⭐'],
  ['ま', 'まめ', '🫛'], ['み', 'みかん', '🍊'], ['む', 'むし', '🐛'], ['め', 'めだか', '🐟'], ['も', 'もも', '🍑'],
  ['や', 'やま', '⛰️'], ['ゆ', 'ゆき', '❄️'], ['よ', 'よっと', '🛥️'],
  ['ら', 'らいおん', '🦁'], ['り', 'りんご', '🍎'], ['る', 'るすばん', '🏠'], ['れ', 'れもん', '🍋'], ['ろ', 'ろぼっと', '🤖'],
  ['わ', 'わに', '🐊'], ['を', 'をのはし', '🌉'], ['ん', 'みかん', '🍊']
];

const primaryPictures = adventureKana.map((kana) => vocabulary.find((item) => item.kana === kana)!);
export const pictures: readonly Picture[] = [
  ...primaryPictures,
  ...fallbackWords.map(([kana, word, emoji]) => ({ id: `${kana}-${word}`, word, emoji, kana, row: rowFor(kana), assetKey: `kana/${kana}/${word}` }))
];

export const kanaOrder = pictures.map((picture) => picture.kana);
export const learningRows: readonly (readonly string[])[] = [
  ['あ', 'い', 'う', 'え', 'お'], ['か', 'き', 'く', 'け', 'こ'], ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'], ['な', 'に', 'ぬ', 'ね', 'の'], ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'], ['や', 'ゆ', 'よ'], ['ら', 'り', 'る', 'れ', 'ろ'], ['わ', 'を', 'ん']
];

export function pictureForKana(kana: string): Picture {
  const picture = pictures.find((item) => item.kana === kana);
  if (!picture) throw new Error(`Unknown kana: ${kana}`);
  return picture;
}

export function wordsForKana(kana: string): readonly Picture[] {
  const words = vocabulary.filter((item) => item.kana === kana);
  return words.length ? words : [pictureForKana(kana)];
}

/** Compatibility helper for the original Phaser scene. Adventure questions use question.ts instead. */
export function choicesFor(kana: string): Picture[] {
  const target = pictureForKana(kana);
  const index = kanaOrder.indexOf(kana);
  const distractors = [7, 19, 31, 43].map((offset) => pictures[(index + offset) % pictures.length])
    .filter((item) => item.kana !== kana).slice(0, 2);
  return [target, ...distractors];
}
