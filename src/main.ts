import Phaser from 'phaser';
import './styles.css';
import { pictureForKana, pictures } from './domain/kana';
import { courseForHome, courseKana, currentKana, isComplete, newSession, type Session } from './domain/session';
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
  const course = courseForHome(activeSlotId());
  session = newSession(loadProgress().collected, course);
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
  const coursePictures = pictures.filter((item) => courseKana(courseForHome(activeSlotId())).includes(item.kana));
  collectionCount.textContent = `${saved.filter((kana) => coursePictures.some((item) => item.kana === kana)).length} / ${coursePictures.length}`;
  collectionGrid.replaceChildren(...coursePictures.map((item) => {
    const known = saved.includes(item.kana);
    const card = document.createElement('div'); card.className = `collection-item${known ? '' : ' unknown'}`;
    card.innerHTML = known ? `<span>${item.emoji}</span><b>${item.kana}</b><small>${item.word}</small>` : '<span>？</span><b>？</b>';
    return card;
  }));
}
function renderSaveSlots() {
  const selected = activeSlotId();
  saveSlots.replaceChildren(...loadSlots().map((slot) => {
    const course = courseForHome(slot.id);
    const button = document.createElement('button');
    const count = slot.progress.collected.filter((kana) => courseKana(course).includes(kana)).length;
    button.type = 'button';
    button.className = `save-slot${slot.id === selected ? ' selected' : ''}`;
    button.innerHTML = `<span>${course.emoji}</span><b>${course.name}</b><small>${count} / ${courseKana(course).length}</small>`;
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
