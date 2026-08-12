import Phaser from 'phaser';
import { choicesFor, pictureForKana, type Picture } from '../domain/kana';

export type PickResult = 'correct' | 'wrong';

export class GameScene extends Phaser.Scene {
  private onPick: ((result: PickResult, picture: Picture) => void) | null = null;
  private cards: Phaser.GameObjects.Container[] = [];
  private target = '';
  private locked = false;
  private hintTween?: Phaser.Tweens.Tween;

  constructor() { super('game'); }

  create() {
    this.scale.on('resize', () => this.renderQuestion());
    this.renderQuestion();
  }

  showQuestion(kana: string, callback: (result: PickResult, picture: Picture) => void) {
    this.target = kana;
    this.onPick = callback;
    this.locked = false;
    this.renderQuestion();
  }

  showHint() {
    const correct = this.cards.find((card) => card.getData('kana') === this.target);
    if (!correct) return;
    this.hintTween?.stop();
    this.hintTween = this.tweens.add({ targets: correct, scaleX: 1.1, scaleY: 1.1, yoyo: true, repeat: 2, duration: 300, ease: 'Sine.easeInOut' });
  }

  private renderQuestion() {
    if (!this.target) return;
    this.children.removeAll(true);
    this.cards = [];
    const { width, height } = this.scale;
    const portrait = height > width;
    const houseY = portrait ? height * 0.26 : height * 0.34;
    const cardY = portrait ? height * 0.69 : height * 0.75;
    const houseScale = Math.min(width, height) / 600;

    this.add.rectangle(width / 2, height / 2, width, height, 0xfff8dc);
    this.add.circle(width * 0.1, height * 0.13, 38 * houseScale, 0xffe17a, 0.65);
    this.add.circle(width * 0.88, height * 0.17, 24 * houseScale, 0xaee5d8, 0.7);
    this.drawHouse(width / 2, houseY, this.target, houseScale);
    this.add.text(width / 2, portrait ? height * 0.47 : height * 0.51, 'どれかな？', { fontFamily: 'sans-serif', fontSize: `${Math.max(19, 26 * houseScale)}px`, color: '#6e5a45', fontStyle: 'bold' }).setOrigin(0.5);

    const selections = choicesFor(this.target);
    const positions = [width * 0.2, width * 0.5, width * 0.8];
    selections.forEach((picture, index) => this.drawCard(positions[index], cardY, picture, houseScale));
  }

  private drawHouse(x: number, y: number, kana: string, scale: number) {
    const w = 205 * scale; const h = 172 * scale;
    const roof = this.add.triangle(x, y - h * .55, 0, h * .32, w / 2, -h * .38, w, h * .32, 0xf48b65).setStrokeStyle(5 * scale, 0xa95843);
    const body = this.add.rectangle(x, y + h * .04, w, h * .88, 0xffecd0).setStrokeStyle(5 * scale, 0xa95843);
    const door = this.add.arc(x, y + h * .24, w * .22, 180, 360, false, 0x9bd18a).setStrokeStyle(4 * scale, 0x568a52);
    const text = this.add.text(x, y - h * .02, kana, { fontFamily: '"Yu Kyokasho", "UD Digi Kyokasho NK-R", sans-serif', fontSize: `${Math.max(74, 120 * scale)}px`, color: '#4d3e35', fontStyle: 'bold' }).setOrigin(.5);
    const label = this.add.text(x, y + h * .58, 'おうち', { fontFamily: 'sans-serif', fontSize: `${Math.max(14, 18 * scale)}px`, color: '#806c5a' }).setOrigin(.5);
    [roof, body, door, text, label].forEach((item) => item.setDepth(1));
  }

  private drawCard(x: number, y: number, picture: Picture, scale: number) {
    const cardW = Math.min(164 * scale, this.scale.width * .27); const cardH = Math.max(126 * scale, 142);
    const shadow = this.add.rectangle(0, 7, cardW, cardH, 0xb5896f, .25).setOrigin(.5);
    const plate = this.add.rectangle(0, 0, cardW, cardH, 0xffffff).setStrokeStyle(Math.max(3, 4 * scale), 0x7f6755).setOrigin(.5);
    const emoji = this.add.text(0, -8 * scale, picture.emoji, { fontSize: `${Math.max(57, 82 * scale)}px` }).setOrigin(.5);
    const tab = this.add.rectangle(0, cardH * .35, cardW * .72, Math.max(25, 31 * scale), 0xf9d86a).setStrokeStyle(2, 0xbe9840).setOrigin(.5);
    const initial = this.add.text(0, cardH * .35, picture.kana === 'ん' ? 'ん を さがそう' : picture.kana === 'を' ? 'を の はし' : picture.word, { fontFamily: '"Yu Kyokasho", sans-serif', fontSize: `${Math.max(15, 19 * scale)}px`, color: '#5b4536', fontStyle: 'bold' }).setOrigin(.5);
    const container = this.add.container(x, y, [shadow, plate, emoji, tab, initial]).setSize(cardW, cardH).setInteractive({ useHandCursor: true });
    container.setData('kana', picture.kana);
    container.setData('homeX', x);
    container.setData('homeY', y);
    container.on('pointerdown', () => this.pick(container, picture));
    this.input.setDraggable(container);
    container.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => { if (!this.locked) { container.x = dragX; container.y = dragY; } });
    container.on('dragend', () => this.pick(container, picture));
    this.cards.push(container);
  }

  private pick(card: Phaser.GameObjects.Container, picture: Picture) {
    if (this.locked) return;
    this.locked = true;
    const correct = picture.kana === this.target;
    if (correct) {
      this.tweens.add({ targets: card, x: this.scale.width / 2, y: this.scale.height > this.scale.width ? this.scale.height * .27 : this.scale.height * .34, scale: .45, duration: 360, ease: 'Back.easeIn', onComplete: () => this.onPick?.('correct', picture) });
      return;
    }
    this.tweens.add({ targets: card, x: card.getData('homeX'), y: card.getData('homeY'), duration: 260, ease: 'Sine.easeOut', onComplete: () => { this.locked = false; this.onPick?.('wrong', picture); } });
  }
}
