export type KanaRow = 'あ' | 'か' | 'さ' | 'た' | 'な' | 'は' | 'ま' | 'や' | 'ら' | 'わ';

export interface Picture {
  word: string;
  emoji: string;
  kana: string;
  row: KanaRow;
}

// 文字を大きく見せるため、絵の名前は画面に表示せず、ずかんでだけ確認できる。
export const pictures: readonly Picture[] = [
  ['あり', '🐜', 'あ'], ['いぬ', '🐶', 'い'], ['うさぎ', '🐰', 'う'], ['えび', '🦐', 'え'], ['おにぎり', '🍙', 'お'],
  ['かめ', '🐢', 'か'], ['きつね', '🦊', 'き'], ['くじら', '🐋', 'く'], ['けーき', '🍰', 'け'], ['こあら', '🐨', 'こ'],
  ['さる', '🐒', 'さ'], ['しまうま', '🦓', 'し'], ['すいか', '🍉', 'す'], ['せみ', '🦗', 'せ'], ['そら', '🌤️', 'そ'],
  ['たこ', '🐙', 'た'], ['ちょうちょ', '🦋', 'ち'], ['つき', '🌙', 'つ'], ['てんとうむし', '🐞', 'て'], ['とまと', '🍅', 'と'],
  ['なす', '🍆', 'な'], ['にんじん', '🥕', 'に'], ['ぬの', '🧣', 'ぬ'], ['ねこ', '🐱', 'ね'], ['のり', '🍘', 'の'],
  ['はな', '🌷', 'は'], ['ひつじ', '🐑', 'ひ'], ['ふね', '⛵', 'ふ'], ['へび', '🐍', 'へ'], ['ほし', '⭐', 'ほ'],
  ['まめ', '🫛', 'ま'], ['みかん', '🍊', 'み'], ['むし', '🐛', 'む'], ['めだか', '🐟', 'め'], ['もも', '🍑', 'も'],
  ['やま', '⛰️', 'や'], ['ゆき', '❄️', 'ゆ'], ['よっと', '🛥️', 'よ'],
  ['らいおん', '🦁', 'ら'], ['りんご', '🍎', 'り'], ['るすばん', '🏠', 'る'], ['れもん', '🍋', 'れ'], ['ろぼっと', '🤖', 'ろ'],
  ['わに', '🐊', 'わ'], ['を', '🌉', 'を'], ['みかん', '🍊', 'ん']
].map(([word, emoji, kana]) => ({ word, emoji, kana, row: kana === 'を' || kana === 'ん' ? 'わ' : kana[0] as KanaRow }));

export const kanaOrder = pictures.map((picture) => picture.kana);

// 1ラウンドを五十音の1行として進め、最後だけ「わ・を・ん」の特別ステージにする。
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

export function choicesFor(kana: string): Picture[] {
  const target = pictureForKana(kana);
  const index = kanaOrder.indexOf(kana);
  const offsets = [7, 19, 31, 43];
  const distractors = offsets
    .map((offset) => pictures[(index + offset) % pictures.length])
    .filter((item) => item.kana !== kana)
    .slice(0, 2);
  return [target, ...distractors];
}
