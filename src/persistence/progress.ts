import type { StageCourse } from '../domain/session';

// v1（おうち＝セーブだった旧版）は残したまま、タイトル用の独立した3セーブをv2で保存する。
const KEY = 'moji-no-ouchi:adventure-saves:v2';
const ACTIVE_SAVE_KEY = 'moji-no-ouchi:active-save:v2';
const ACTIVE_STAGE_KEY = 'moji-no-ouchi:active-stage:v2';
export const SLOT_COUNT = 3;
export type StageId = StageCourse['id'];

export interface Progress { collected: string[]; }
export interface SaveSlot { id: string; name: string; stages: Record<StageId, Progress>; }
const blank = (): Progress => ({ collected: [] });
const stages = (): Record<StageId, Progress> => ({ garden: blank(), forest: blank(), hill: blank() });
const emptySlots = (): SaveSlot[] => Array.from({ length: SLOT_COUNT }, (_, index) => ({ id: `save-${index + 1}`, name: `ぼうけん ${index + 1}`, stages: stages() }));
const saveId = (id: string) => /^save-[1-3]$/.test(id);
const stageId = (id: string): id is StageId => id === 'garden' || id === 'forest' || id === 'hill';
const clean = (value: unknown): Progress => ({ collected: Array.isArray(value) ? [...new Set(value.filter((kana): kana is string => typeof kana === 'string'))] : [] });

function normalizeSlots(value: unknown): SaveSlot[] {
  const source = Array.isArray(value) ? value : [];
  return emptySlots().map((empty, index) => {
    const saved = source[index] && typeof source[index] === 'object' ? source[index] as Partial<SaveSlot> : {};
    const storedStages = saved.stages && typeof saved.stages === 'object' ? saved.stages as Partial<Record<StageId, Progress>> : {};
    return { id: empty.id, name: typeof saved.name === 'string' && saved.name.trim() ? saved.name.trim().slice(0, 12) : empty.name,
      stages: { garden: clean(storedStages.garden?.collected), forest: clean(storedStages.forest?.collected), hill: clean(storedStages.hill?.collected) } };
  });
}
function saveSlots(slots: SaveSlot[]) { localStorage.setItem(KEY, JSON.stringify(slots)); }
export function loadSlots(): SaveSlot[] {
  try { const raw = localStorage.getItem(KEY); if (raw) return normalizeSlots(JSON.parse(raw)); } catch { /* use clean saves */ }
  const slots = emptySlots(); saveSlots(slots); return slots;
}
export function activeSlotId() { const value = localStorage.getItem(ACTIVE_SAVE_KEY); return saveId(value ?? '') ? value! : 'save-1'; }
export function setActiveSlot(id: string) { if (saveId(id)) localStorage.setItem(ACTIVE_SAVE_KEY, id); }
export function activeStageId(): StageId { const value = localStorage.getItem(ACTIVE_STAGE_KEY) ?? ''; return stageId(value) ? value : 'garden'; }
export function setActiveStage(id: StageId) { localStorage.setItem(ACTIVE_STAGE_KEY, id); }
function activeSlot() { return loadSlots().find((slot) => slot.id === activeSlotId()) ?? loadSlots()[0]; }

export function loadProgress(stage: StageId = activeStageId()): Progress { return activeSlot().stages[stage]; }
export function saveCollected(kana: string, stage: StageId = activeStageId()): Progress {
  const slots = loadSlots(); const slot = slots.find((item) => item.id === activeSlotId()) ?? slots[0]; const progress = slot.stages[stage];
  if (!progress.collected.includes(kana)) progress.collected.push(kana);
  saveSlots(slots); return progress;
}
export function allCollected(slot: SaveSlot = activeSlot()) { return [...new Set(Object.values(slot.stages).flatMap((progress) => progress.collected))]; }
export function resetProgress() { const slots = loadSlots(); const slot = slots.find((item) => item.id === activeSlotId()) ?? slots[0]; slot.stages = stages(); saveSlots(slots); }
