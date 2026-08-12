import Phaser from 'phaser';
import type { Picture } from '../domain/kana';
import type { QuestionDefinition } from '../domain/questions';
import type { AdventureProgress } from '../persistence/progress';

export type PickResult = 'correct' | 'wrong';
export type AdventureStage = { id: string; areaId: 'a-row' | 'ka-row'; label: string; kana?: string; summary?: boolean };

type QuestionCallbacks = {
  onPick: (result: PickResult, question: QuestionDefinition) => void;
  onMap: () => void;
};

/** Thin Phaser view: rules and save data remain in main/domain modules. */
export class GameScene extends Phaser.Scene {
  private question?: QuestionDefinition;
  private callbacks?: QuestionCallbacks;
  private cards: Phaser.GameObjects.Container[] = [];
  private locked = false;
  private hintTween?: Phaser.Tweens.Tween;
  private readonly reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() { super('game'); }

  create() { this.scale.on('resize', () => this.question ? this.renderQuestion() : undefined); }

  showMap(progress: AdventureProgress, stages: readonly AdventureStage[], onSelect: (stage: AdventureStage) => void) {
    this.question = undefined;
    this.children.removeAll(true);
    const { width, height } = this.scale;
    const portrait = height > width;
    this.add.rectangle(width / 2, height / 2, width, height, 0xe8f5da);
    this.add.circle(width * .12, height * .14, Math.min(width, height) * .09, 0xffdc79, .85);
    this.add.text(width / 2, portrait ? 36 : 30, 'もじの ぼうけん ちず', this.textStyle(24)).setOrigin(.5);

    const aStages = stages.filter((stage) => stage.areaId === 'a-row');
    const kStages = stages.filter((stage) => stage.areaId === 'ka-row');
    const areaY = portrait ? [height * .36, height * .70] : [height * .52, height * .52];
    const areaX = portrait ? [width * .50, width * .50] : [width * .28, width * .73];
    this.drawArea('あ行の もり', aStages, areaX[0], areaY[0], width, progress, onSelect, true);
    const kaOpen = progress.completedStageIds.includes('a-row:summary');
    this.drawArea('か行の おか', kStages, areaX[1], areaY[1], width, progress, onSelect, kaOpen);
  }

  showQuestion(question: QuestionDefinition, callbacks: QuestionCallbacks) {
    this.question = question;
    this.callbacks = callbacks;
    this.locked = false;
    this.renderQuestion();
  }

  showHint() {
    const correct = this.cards.find((card) => card.getData('correct') === true);
    if (!correct) return;
    this.hintTween?.stop();
    if (this.reducedMotion) {
      correct.setAlpha(.55);
      this.tweens.add({ targets: correct, alpha: 1, duration: 450 });
    } else {
      this.hintTween = this.tweens.add({ targets: correct, scaleX: 1.09, scaleY: 1.09, yoyo: true, repeat: 2, duration: 290, ease: 'Sine.easeInOut' });
    }
  }

  showRest(onReady: () => void) {
    this.children.removeAll(true);
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0xe8f5da);
    this.add.text(width / 2, height * .42, '☁️ ひとやすみ ☁️', this.textStyle(28)).setOrigin(.5);
    this.add.text(width / 2, height * .54, 'ちがう もんだいで もういちど！', this.textStyle(20)).setOrigin(.5);
    this.time.delayedCall(this.reducedMotion ? 250 : 900, onReady);
  }

  private drawArea(title: string, stages: readonly AdventureStage[], x: number, y: number, width: number, progress: AdventureProgress, onSelect: (stage: AdventureStage) => void, open: boolean) {
    const compact = this.scale.height > this.scale.width;
    const spacing = Math.min(compact ? width * .145 : width * .105, 92);
    const pathColor = open ? 0xc8a46f : 0xb9c5bb;
    this.add.ellipse(x, y + 15, Math.min(width * (compact ? .84 : .39), 460), compact ? 126 : 220, open ? 0xb9dd97 : 0xd8dfd7).setStrokeStyle(4, 0x78946d);
    this.add.text(x, y - (compact ? 78 : 120), title, this.textStyle(20)).setOrigin(.5);
    if (!open) {
      this.add.text(x, y, '☁️  ☁️', { fontSize: `${Math.max(42, spacing)}px` }).setOrigin(.5);
      this.add.text(x, y + 53, 'つぎの ばしょ', this.textStyle(16)).setOrigin(.5);
      return;
    }
    const firstX = x - (spacing * (stages.length - 1)) / 2;
    stages.slice(0, -1).forEach((stage, index) => {
      if (index < stages.length - 2) this.add.line(firstX + spacing * (index + .5), y, 0, 0, spacing, 0, pathColor, 1).setLineWidth(10);
      this.drawStageNode(stage, firstX + index * spacing, y, progress, onSelect);
    });
    const finale = stages[stages.length - 1];
    this.drawStageNode(finale, firstX + spacing * (stages.length - 1), y, progress, onSelect);
  }

  private drawStageNode(stage: AdventureStage, x: number, y: number, progress: AdventureProgress, onSelect: (stage: AdventureStage) => void) {
    const completed = progress.completedStageIds.includes(stage.id);
    const previous = stage.summary ? `${stage.areaId}:${stage.areaId === 'a-row' ? 'お' : 'こ'}` : stage.kana === 'あ' || stage.kana === 'か' ? '' : `${stage.areaId}:${stage.kana === 'い' ? 'あ' : stage.kana === 'う' ? 'い' : stage.kana === 'え' ? 'う' : stage.kana === 'お' ? 'え' : stage.kana === 'き' ? 'か' : stage.kana === 'く' ? 'き' : stage.kana === 'け' ? 'く' : 'け'}`;
    const unlocked = completed || !previous || progress.completedStageIds.includes(previous);
    const color = completed ? 0xf6c964 : unlocked ? 0xfffdf4 : 0xd8ded6;
    const border = completed ? 0xb57b39 : unlocked ? 0x6f8c5e : 0x95a29a;
    const circle = this.add.circle(x, y, 31, color).setStrokeStyle(4, border);
    const label = stage.summary ? '★' : stage.label;
    this.add.text(x, y - 1, label, { ...this.textStyle(stage.summary ? 29 : 29), color: unlocked ? '#493d36' : '#788179' }).setOrigin(.5);
    if (unlocked) {
      circle.setInteractive({ useHandCursor: true }).on('pointerdown', () => onSelect(stage));
      if (stage.id === progress.currentStageId && !completed && !this.reducedMotion) this.tweens.add({ targets: circle, scale: 1.08, yoyo: true, repeat: -1, duration: 600 });
    }
  }

  private renderQuestion() {
    const question = this.question;
    if (!question) return;
    this.children.removeAll(true);
    this.cards = [];
    const { width, height } = this.scale;
    const portrait = height > width;
    const scale = Math.min(width, height) / 620;
    this.add.rectangle(width / 2, height / 2, width, height, 0xfff5d5);
    this.add.circle(width * .1, height * .12, 38 * scale, 0xffdc79, .65);
    const map = this.add.text(28, 25, '🗺️', { fontSize: `${Math.max(31, 43 * scale)}px` }).setOrigin(.5).setInteractive({ useHandCursor: true });
    map.on('pointerdown', () => this.callbacks?.onMap());
    const title = question.type === 'kana-to-picture' ? 'この もじの なかまは？' : question.type === 'picture-to-kana' ? 'さいしょの もじは？' : 'もじを さがそう！';
    this.add.text(width / 2, portrait ? height * .12 : height * .10, title, this.textStyle(Math.max(18, 23 * scale))).setOrigin(.5);
    if (question.type === 'kana-to-picture') {
      this.drawHouse(width / 2, portrait ? height * .32 : height * .35, question.targetKana, scale);
    } else {
      const word = question.word!;
      this.drawPromptPicture(width / 2, portrait ? height * .30 : height * .31, word, scale, question.type === 'find-kana');
    }
    const choices = question.choices;
    const max = Math.min(4, choices.length);
    const positions = Array.from({ length: max }, (_, index) => width * ((index + 1) / (max + 1)));
    const cardY = portrait ? height * .70 : height * .73;
    choices.forEach((choice, index) => this.drawCard(positions[index], cardY, choice, question, scale));
  }

  private drawHouse(x: number, y: number, kana: string, scale: number) {
    const w = 200 * scale; const h = 158 * scale;
    this.add.triangle(x, y - h * .51, 0, h * .31, w / 2, -h * .37, w, h * .31, 0xf48b65).setStrokeStyle(5 * scale, 0xa95843);
    this.add.rectangle(x, y + h * .04, w, h * .84, 0xffecd0).setStrokeStyle(5 * scale, 0xa95843);
    this.add.text(x, y - h * .04, kana, { fontFamily: '"Yu Kyokasho", "UD Digi Kyokasho NK-R", sans-serif', fontSize: `${Math.max(76, 120 * scale)}px`, color: '#4d3e35', fontStyle: 'bold' }).setOrigin(.5);
    this.add.text(x, y + h * .50, 'おうち', this.textStyle(Math.max(14, 17 * scale))).setOrigin(.5);
  }

  private drawPromptPicture(x: number, y: number, picture: Picture, scale: number, find: boolean) {
    this.add.rectangle(x, y, Math.min(this.scale.width * .42, 250 * scale), 125 * scale, 0xffffff).setStrokeStyle(4, 0x826a55);
    this.add.text(x, y - 14 * scale, picture.emoji, { fontSize: `${Math.max(57, 82 * scale)}px` }).setOrigin(.5);
    const label = find ? picture.word.split('').map((char) => char === picture.kana ? '□' : char).join('') : picture.word;
    this.add.text(x, y + 45 * scale, label, this.textStyle(Math.max(19, 27 * scale))).setOrigin(.5);
  }

  private drawCard(x: number, y: number, choice: Picture | string, question: QuestionDefinition, scale: number) {
    const picture = typeof choice === 'string' ? undefined : choice;
    const label = typeof choice === 'string' ? choice : choice.word;
    const correct = typeof choice === 'string' ? choice === question.targetKana : choice.id === question.word?.id;
    const cardW = Math.min(150 * scale, this.scale.width / (question.choices.length + .45));
    const cardH = Math.max(110 * scale, 126);
    const shadow = this.add.rectangle(0, 6, cardW, cardH, 0xb5896f, .22);
    const plate = this.add.rectangle(0, 0, cardW, cardH, 0xffffff).setStrokeStyle(4, 0x7f6755);
    const main = this.add.text(0, picture ? -15 : -8, picture ? picture.emoji : label, { fontFamily: '"Yu Kyokasho", sans-serif', fontSize: `${picture ? Math.max(45, 63 * scale) : Math.max(42, 62 * scale)}px`, color: '#4d3e35', fontStyle: 'bold' }).setOrigin(.5);
    const tab = this.add.rectangle(0, cardH * .32, cardW * .78, 28, 0xf9d86a).setStrokeStyle(2, 0xbe9840);
    const text = this.add.text(0, cardH * .32, picture ? label : 'この もじ', this.textStyle(Math.max(13, 17 * scale))).setOrigin(.5);
    const card = this.add.container(x, y, [shadow, plate, main, tab, text]).setSize(cardW, cardH).setInteractive({ useHandCursor: true });
    card.setData({ homeX: x, homeY: y, correct });
    card.on('pointerdown', () => this.pick(card, question));
    this.input.setDraggable(card);
    card.on('drag', (_: Phaser.Input.Pointer, dragX: number, dragY: number) => { if (!this.locked) { card.x = dragX; card.y = dragY; } });
    card.on('dragend', () => this.pick(card, question));
    this.cards.push(card);
  }

  private pick(card: Phaser.GameObjects.Container, question: QuestionDefinition) {
    if (this.locked) return;
    this.locked = true;
    const correct = card.getData('correct') === true;
    if (correct) {
      const targetY = this.scale.height > this.scale.width ? this.scale.height * .32 : this.scale.height * .35;
      this.tweens.add({ targets: card, x: this.scale.width / 2, y: targetY, scale: .48, duration: this.reducedMotion ? 120 : 360, ease: 'Back.easeIn', onComplete: () => this.callbacks?.onPick('correct', question) });
    } else {
      this.tweens.add({ targets: card, x: card.getData('homeX'), y: card.getData('homeY'), duration: this.reducedMotion ? 100 : 260, ease: 'Sine.easeOut', onComplete: () => { this.locked = false; this.callbacks?.onPick('wrong', question); } });
    }
  }

  private textStyle(size: number): Phaser.Types.GameObjects.Text.TextStyle { return { fontFamily: '"Yu Kyokasho", "UD Digi Kyokasho NK-R", sans-serif', fontSize: `${size}px`, color: '#5b493d', fontStyle: 'bold' }; }
}
