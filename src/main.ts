import Phaser from 'phaser';
import './styles.css';
import { pictureForKana, pictures } from './domain/kana';
import { courseForStage, courseKana, currentKana, isComplete, newSession, stageCourses, type Session, type StageCourse } from './domain/session';
import { activeSlotId, allCollected, loadProgress, loadSlots, resetProgress, saveCollected, setActiveSlot, setActiveStage, type SaveSlot } from './persistence/progress';
import { GameScene, type PickResult } from './game/GameScene';

const progress = document.querySelector('#progress')!;
const complete = document.querySelector('#complete') as HTMLElement;
const collection = document.querySelector('#collection') as HTMLElement;
const collectionGrid = document.querySelector('#collection-grid')!;
const collectionCount = document.querySelector('#collection-count')!;
const rewardRow = document.querySelector('#reward-row')!;
const message = document.querySelector('#complete-message')!;
const titleScreen = document.querySelector('#title-screen') as HTMLElement;
const stagePicker = document.querySelector('#stage-picker') as HTMLElement;
const saveSlots = document.querySelector('#save-slots')!;
const stageSlots = document.querySelector('#stage-slots')!;
const stageSaveName = document.querySelector('#stage-save-name')!;
let session: Session;
let currentCourse: StageCourse = courseForStage('garden');

const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game-container', backgroundColor: '#fff8dc', scene: [GameScene],
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%', autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false }
});

function scene() { return game.scene.getScene('game') as GameScene; }
function renderProgress() { progress.textContent = Array.from({ length: 5 }, (_, index) => index < session.questionIndex ? '●' : '○').join(' '); }
function startRound(course: StageCourse) {
  complete.hidden = true;
  currentCourse = course;
  setActiveStage(course.id);
  session = newSession(loadProgress(course.id).collected, course);
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
  const before = loadProgress(currentCourse.id).collected;
  saveCollected(kana, currentCourse.id);
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
  const saved = allCollected();
  collectionCount.textContent = `${saved.length} / ${pictures.length}`;
  collectionGrid.replaceChildren(...pictures.map((item) => {
    const known = saved.includes(item.kana);
    const card = document.createElement('div'); card.className = `collection-item${known ? '' : ' unknown'}`;
    card.innerHTML = known ? `<span>${item.emoji}</span><b>${item.kana}</b><small>${item.word}</small>` : '<span>？</span><b>？</b>';
    return card;
  }));
}
function renderSaveSlots() {
  const selected = activeSlotId();
  saveSlots.replaceChildren(...loadSlots().map((slot, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `save-slot${slot.id === selected ? ' selected' : ''}`;
    button.innerHTML = `<span>${['🌱', '🌻', '🌟'][index]}</span><b>${slot.name}</b><small>${allCollected(slot).length} / ${pictures.length}</small>`;
    button.addEventListener('click', () => selectSave(slot));
    return button;
  }));
}
function selectSave(slot: SaveSlot) {
  setActiveSlot(slot.id);
  titleScreen.hidden = true;
  renderStageSlots();
  stagePicker.hidden = false;
}
function renderStageSlots() {
  const activeSave = loadSlots().find((slot) => slot.id === activeSlotId()) ?? loadSlots()[0];
  stageSaveName.textContent = `${activeSave.name} の ステージ`;
  stageSlots.replaceChildren(...stageCourses.map((course) => {
    const button = document.createElement('button'); const count = activeSave.stages[course.id].collected.length;
    button.type = 'button'; button.className = 'save-slot';
    button.innerHTML = `<span>${course.emoji}</span><b>${course.name}</b><small>${count} / ${courseKana(course).length}</small>`;
    button.addEventListener('click', () => { stagePicker.hidden = true; startRound(course); });
    return button;
  }));
}
function showTitle() { complete.hidden = true; stagePicker.hidden = true; renderSaveSlots(); titleScreen.hidden = false; }

document.querySelector('#play-again')!.addEventListener('click', () => startRound(currentCourse));
document.querySelector('#book-button')!.addEventListener('click', () => { renderCollection(); collection.hidden = false; });
document.querySelector('#close-book')!.addEventListener('click', () => { collection.hidden = true; });
document.querySelector('#save-button')!.addEventListener('click', showTitle);
document.querySelector('#close-stages')!.addEventListener('click', showTitle);
// Reset remains available from the console for parents and test automation, but is not exposed in the child UI.
void resetProgress;
window.setTimeout(showTitle, 100);
