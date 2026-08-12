import Phaser from 'phaser';
import './styles.css';
import { pictureForKana, pictures } from './domain/kana';
import { currentKana, isComplete, newSession, type Session } from './domain/session';
import { activeSlotId, loadProgress, loadSlots, resetProgress, saveCollected, setActiveSlot, type SaveSlot } from './persistence/progress';
import { GameScene, type PickResult } from './game/GameScene';

const progress = document.querySelector('#progress')!;
const complete = document.querySelector('#complete') as HTMLElement;
const collection = document.querySelector('#collection') as HTMLElement;
const collectionGrid = document.querySelector('#collection-grid')!;
const collectionCount = document.querySelector('#collection-count')!;
const rewardRow = document.querySelector('#reward-row')!;
const message = document.querySelector('#complete-message')!;
const savePicker = document.querySelector('#save-picker') as HTMLElement;
const saveSlots = document.querySelector('#save-slots')!;
let session: Session;

const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game-container', backgroundColor: '#fff8dc', scene: [GameScene],
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%', autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false }
});

function scene() { return game.scene.getScene('game') as GameScene; }
function renderProgress() { progress.textContent = Array.from({ length: 5 }, (_, index) => index < session.questionIndex ? '●' : '○').join(' '); }
function startRound() {
  complete.hidden = true;
  session = newSession(loadProgress().collected);
  renderProgress();
  window.setTimeout(showQuestion, 30);
}
function showQuestion() {
  if (isComplete(session)) { finishRound(); return; }
  scene().showQuestion(currentKana(session), handlePick);
}
function handlePick(result: PickResult) {
  if (result === 'wrong') {
    session.mistakes += 1;
    if (session.mistakes >= 2) scene().showHint();
    return;
  }
  const kana = currentKana(session);
  const before = loadProgress().collected;
  saveCollected(kana);
  if (!before.includes(kana)) session.collectedThisRound.push(kana);
  session.questionIndex += 1;
  session.mistakes = 0;
  renderProgress();
  window.setTimeout(showQuestion, 460);
}
function finishRound() {
  const additions = session.collectedThisRound.map(pictureForKana);
  message.textContent = additions.length ? 'ずかんに あたらしい なかまが ふえたよ！' : 'たくさん できたね！';
  rewardRow.replaceChildren(...(additions.length ? additions : session.queue.map(pictureForKana)).map((item) => {
    const element = document.createElement('span'); element.className = 'reward'; element.textContent = item.emoji; return element;
  }));
  complete.hidden = false;
}
function renderCollection() {
  const saved = loadProgress().collected;
  collectionCount.textContent = `${saved.length} / ${pictures.length}`;
  collectionGrid.replaceChildren(...pictures.map((item) => {
    const known = saved.includes(item.kana);
    const card = document.createElement('div'); card.className = `collection-item${known ? '' : ' unknown'}`;
    card.innerHTML = known ? `<span>${item.emoji}</span><b>${item.kana}</b><small>${item.word}</small>` : '<span>？</span><b>？</b>';
    return card;
  }));
}
function slotEmoji(index: number) { return ['🏠', '🏡', '🏰'][index] ?? '🏠'; }
function renderSaveSlots() {
  const selected = activeSlotId();
  saveSlots.replaceChildren(...loadSlots().map((slot, index) => {
    const button = document.createElement('button');
    const count = slot.progress.collected.length;
    button.type = 'button';
    button.className = `save-slot${slot.id === selected ? ' selected' : ''}`;
    button.innerHTML = `<span>${slotEmoji(index)}</span><b>おうち ${index + 1}</b><small>${count} / ${pictures.length}</small>`;
    button.addEventListener('click', () => selectSlot(slot));
    return button;
  }));
}
function selectSlot(slot: SaveSlot) {
  setActiveSlot(slot.id);
  savePicker.hidden = true;
  startRound();
}
document.querySelector('#play-again')!.addEventListener('click', startRound);
document.querySelector('#book-button')!.addEventListener('click', () => { renderCollection(); collection.hidden = false; });
document.querySelector('#close-book')!.addEventListener('click', () => { collection.hidden = true; });
document.querySelector('#save-button')!.addEventListener('click', () => { renderSaveSlots(); savePicker.hidden = false; });
document.querySelector('#close-saves')!.addEventListener('click', () => { savePicker.hidden = true; });
// Reset remains available from the console for parents and test automation, but is not exposed in the child UI.
void resetProgress;
window.setTimeout(startRound, 100);
