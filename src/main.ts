import Phaser from 'phaser';
import './styles.css';
import { vocabulary } from './domain/kana';
import { buildKanaStage, buildSummaryStage, updateMastery, type QuestionDefinition } from './domain/questions';
import { activeSlotId, deleteSlot, loadProgress, loadSlots, renameSlot, saveProgress, setActiveSlot, type AdventureProgress, type SaveSlotV2 } from './persistence/progress';
import { GameScene, type AdventureStage, type PickResult } from './game/GameScene';

const progressElement = document.querySelector('#progress')!;
const heartsElement = document.querySelector('#hearts')!;
const complete = document.querySelector('#complete') as HTMLElement;
const collection = document.querySelector('#collection') as HTMLElement;
const collectionGrid = document.querySelector('#collection-grid')!;
const collectionCount = document.querySelector('#collection-count')!;
const rewardRow = document.querySelector('#reward-row')!;
const message = document.querySelector('#complete-message')!;
const savePicker = document.querySelector('#save-picker') as HTMLElement;
const saveSlots = document.querySelector('#save-slots')!;

const stages: readonly AdventureStage[] = [
  ...['あ', 'い', 'う', 'え', 'お'].map((kana) => ({ id: `a-row:${kana}`, areaId: 'a-row' as const, label: kana, kana })),
  { id: 'a-row:summary', areaId: 'a-row' as const, label: 'あ', summary: true },
  ...['か', 'き', 'く', 'け', 'こ'].map((kana) => ({ id: `ka-row:${kana}`, areaId: 'ka-row' as const, label: kana, kana })),
  { id: 'ka-row:summary', areaId: 'ka-row' as const, label: 'か', summary: true }
];

let questions: QuestionDefinition[] = [];
let questionIndex = 0;
let hearts = 3;
let mistakesForQuestion = 0;
let hinted = false;
let recentWordIds: string[] = [];
let playingStage: AdventureStage | undefined;

const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game-container', backgroundColor: '#e8f5da', scene: [GameScene],
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%', autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false }
});

function scene() { return game.scene.getScene('game') as GameScene; }
function activeStage(progress = loadProgress()) { return stages.find((stage) => stage.id === progress.currentStageId) ?? stages[0]; }
function renderHud() {
  const inQuestion = questions.length > 0 && questionIndex < questions.length;
  heartsElement.textContent = inQuestion ? Array.from({ length: 3 }, (_, index) => index < hearts ? '♥' : '♡').join(' ') : '🗺️';
  heartsElement.setAttribute('aria-label', inQuestion ? `ハート${hearts}こ` : 'ぼうけんのちず');
  progressElement.textContent = inQuestion ? Array.from({ length: 5 }, (_, index) => index < questionIndex ? '●' : '○').join(' ') : 'つぎの ステージ';
}
function showMap() {
  questions = [];
  questionIndex = 0;
  complete.hidden = true;
  renderHud();
  scene().showMap(loadProgress(), stages, startStage);
}
function makeQuestions(stage: AdventureStage, progress: AdventureProgress) {
  if (stage.summary) {
    const row = stage.areaId === 'a-row' ? ['あ', 'い', 'う', 'え', 'お'] : ['か', 'き', 'く', 'け', 'こ'];
    return buildSummaryStage(row, progress.mastery, recentWordIds);
  }
  return buildKanaStage(stage.kana!, progress.mastery, recentWordIds);
}
function startStage(stage: AdventureStage) {
  const progress = loadProgress();
  playingStage = stage;
  questions = makeQuestions(stage, progress);
  questionIndex = 0;
  hearts = 3;
  mistakesForQuestion = 0;
  hinted = false;
  renderHud();
  showQuestion();
}
function showQuestion() {
  const question = questions[questionIndex];
  if (!question) { finishStage(); return; }
  scene().showQuestion(question, { onPick: handlePick, onMap: showMap });
}
function handlePick(result: PickResult, question: QuestionDefinition) {
  const progress = loadProgress();
  if (result === 'wrong') {
    hearts -= 1;
    mistakesForQuestion += 1;
    progress.mastery = updateMastery(progress.mastery, question.targetKana, 'wrong');
    saveProgress(progress);
    if (mistakesForQuestion >= 2) { hinted = true; scene().showHint(); }
    renderHud();
    if (hearts === 0) restartAfterRest();
    return;
  }
  progress.mastery = updateMastery(progress.mastery, question.targetKana, 'correct', hinted);
  if (!progress.collected.includes(question.targetKana)) progress.collected.push(question.targetKana);
  if (question.word && !progress.collectedWordIds.includes(question.word.id)) progress.collectedWordIds.push(question.word.id);
  saveProgress(progress);
  if (question.word) recentWordIds = [...recentWordIds, question.word.id].slice(-12);
  questionIndex += 1;
  mistakesForQuestion = 0;
  hinted = false;
  renderHud();
  window.setTimeout(showQuestion, 420);
}
function restartAfterRest() {
  const stage = playingStage ?? activeStage();
  questions = [];
  renderHud();
  scene().showRest(() => startStage(stage));
}
function finishStage() {
  const progress = loadProgress();
  const stage = playingStage ?? activeStage(progress);
  if (!progress.completedStageIds.includes(stage.id)) progress.completedStageIds.push(stage.id);
  if (!progress.mapParts.includes(stage.id)) progress.mapParts.push(stage.id);
  const next = stages[stages.indexOf(stage) + 1];
  if (next) {
    progress.currentStageId = next.id;
    progress.currentAreaId = next.areaId;
  }
  saveProgress(progress);
  const earned = questions.flatMap((question) => question.word ? [question.word] : []);
  message.textContent = stage.summary ? 'ちずが ぐーんと ひろがったよ！' : 'みちが ひとつ できたよ！';
  rewardRow.replaceChildren(...earned.slice(0, 5).map((word) => {
    const element = document.createElement('span'); element.className = 'reward'; element.textContent = word.emoji; return element;
  }));
  questions = [];
  playingStage = undefined;
  renderHud();
  complete.hidden = false;
}

function renderCollection() {
  const saved = loadProgress();
  collectionCount.textContent = `${saved.collectedWordIds.length} / ${vocabulary.length}`;
  collectionGrid.replaceChildren(...vocabulary.map((item) => {
    const known = saved.collectedWordIds.includes(item.id);
    const card = document.createElement('div'); card.className = `collection-item${known ? '' : ' unknown'}`;
    card.innerHTML = known ? `<span>${item.emoji}</span><b>${item.kana}</b><small>${item.word}</small>` : '<span>？</span><b>？</b>';
    return card;
  }));
}
function slotEmoji(index: number) { return ['🏠', '🏡', '🏰'][index] ?? '🏠'; }
function stop(event: Event) { event.preventDefault(); event.stopPropagation(); }
function renderSaveSlots() {
  const selected = activeSlotId();
  saveSlots.replaceChildren(...loadSlots().map((slot, index) => createSlot(slot, index, selected)));
}
function createSlot(slot: SaveSlotV2, index: number, selected: string) {
  const wrap = document.createElement('div'); wrap.className = 'save-slot-wrap';
  const button = document.createElement('button');
  button.type = 'button'; button.className = `save-slot${slot.id === selected ? ' selected' : ''}`;
  button.innerHTML = `<span>${slotEmoji(index)}</span><b>${escapeHtml(slot.name)}</b><small>${slot.progress.collectedWordIds.length} / ${vocabulary.length}</small>`;
  button.addEventListener('click', () => { setActiveSlot(slot.id); savePicker.hidden = true; showMap(); });
  const actions = document.createElement('div'); actions.className = 'slot-actions';
  const rename = document.createElement('button'); rename.type = 'button'; rename.className = 'slot-action'; rename.textContent = '✎'; rename.setAttribute('aria-label', `${slot.name} の なまえを かえる`);
  rename.addEventListener('click', (event) => { stop(event); const name = window.prompt('おうちの なまえ（12もじまで）', slot.name); if (name?.trim()) { renameSlot(slot.id, name); renderSaveSlots(); } });
  const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'slot-action delete-action'; remove.textContent = '🗑'; remove.setAttribute('aria-label', `${slot.name} を 2びょう おして おかたづけ`);
  let timer: number | undefined;
  const cancel = () => { if (timer) window.clearTimeout(timer); timer = undefined; remove.classList.remove('holding'); };
  remove.addEventListener('pointerdown', (event) => { stop(event); remove.setPointerCapture?.((event as PointerEvent).pointerId); remove.classList.add('holding'); timer = window.setTimeout(() => { timer = undefined; remove.classList.remove('holding'); if (window.confirm(`「${slot.name}」の ぼうけんを おかたづけしますか？`)) { deleteSlot(slot.id); renderSaveSlots(); if (slot.id === activeSlotId()) showMap(); } }, 2000); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => remove.addEventListener(name, cancel));
  remove.addEventListener('click', stop);
  actions.append(rename, remove); wrap.append(button, actions); return wrap;
}
function escapeHtml(value: string) { const element = document.createElement('div'); element.textContent = value; return element.innerHTML; }

document.querySelector('#play-again')!.addEventListener('click', showMap);
document.querySelector('#book-button')!.addEventListener('click', () => { renderCollection(); collection.hidden = false; });
document.querySelector('#close-book')!.addEventListener('click', () => { collection.hidden = true; });
document.querySelector('#save-button')!.addEventListener('click', () => { renderSaveSlots(); savePicker.hidden = false; });
document.querySelector('#close-saves')!.addEventListener('click', () => { savePicker.hidden = true; });
window.setTimeout(showMap, 120);
