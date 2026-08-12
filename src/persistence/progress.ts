import type { KanaMastery } from '../domain/questions';

/** v2 is intentionally independent from v1: existing child saves remain available for rollback. */
const KEY = 'moji-no-ouchi:save-slots:v2';
const ACTIVE_KEY = 'moji-no-ouchi:active-slot:v2';
export const SLOT_COUNT = 3;

export type AdventureAreaId = 'a-row' | 'ka-row';

export interface AdventureProgress {
  /** Kept for the current collection screen and for a simple v1-compatible migration path in UI. */
  collected: string[];
  currentAreaId: AdventureAreaId;
  currentStageId: string;
  completedStageIds: string[];
  mapParts: string[];
  mastery: KanaMastery;
  collectedWordIds: string[];
}

export interface SaveSlotV2 {
  id: string;
  name: string;
  progress: AdventureProgress;
}

// Old imports keep compiling while the UI is migrated from the first game.
export type Progress = AdventureProgress;
export type SaveSlot = SaveSlotV2;

const slotName = (index: number) => `おうち ${index + 1}`;
const blankProgress = (): AdventureProgress => ({
  collected: [], currentAreaId: 'a-row', currentStageId: 'a-row:あ', completedStageIds: [], mapParts: [], mastery: {}, collectedWordIds: []
});
const blankSlot = (index: number): SaveSlotV2 => ({ id: `home-${index + 1}`, name: slotName(index), progress: blankProgress() });
const emptySlots = (): SaveSlotV2[] => Array.from({ length: SLOT_COUNT }, (_, index) => blankSlot(index));
const validId = (id: string) => /^home-[1-3]$/.test(id);
const storage = () => typeof localStorage === 'undefined' ? null : localStorage;

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))] : [];
}
function readMastery(value: unknown): KanaMastery {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const mastery: KanaMastery = {};
  Object.entries(value).forEach(([kana, raw]) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const entry = raw as Partial<{ score: unknown; correct: unknown; wrong: unknown }>;
    const number = (item: unknown, max = Number.MAX_SAFE_INTEGER) => typeof item === 'number' && Number.isFinite(item) ? Math.max(0, Math.min(max, Math.floor(item))) : 0;
    mastery[kana] = { score: number(entry.score, 5), correct: number(entry.correct), wrong: number(entry.wrong) };
  });
  return mastery;
}
function normalizeProgress(value: unknown): AdventureProgress {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<AdventureProgress> : {};
  return {
    collected: stringList(source.collected),
    currentAreaId: source.currentAreaId === 'ka-row' ? 'ka-row' : 'a-row',
    currentStageId: typeof source.currentStageId === 'string' ? source.currentStageId : 'a-row:あ',
    completedStageIds: stringList(source.completedStageIds),
    mapParts: stringList(source.mapParts),
    mastery: readMastery(source.mastery),
    collectedWordIds: stringList(source.collectedWordIds)
  };
}
function normalizeSlots(value: unknown): SaveSlotV2[] {
  const candidate = Array.isArray(value) ? value : [];
  return emptySlots().map((defaultSlot, index) => {
    const source = candidate[index] && typeof candidate[index] === 'object' ? candidate[index] as Partial<SaveSlotV2> : {};
    return {
      id: defaultSlot.id,
      name: typeof source.name === 'string' && source.name.trim() ? source.name.trim().slice(0, 12) : defaultSlot.name,
      progress: normalizeProgress(source.progress)
    };
  });
}

function saveSlots(slots: readonly SaveSlotV2[]) { storage()?.setItem(KEY, JSON.stringify(slots)); }
export function loadSlots(): SaveSlotV2[] {
  const value = storage()?.getItem(KEY);
  if (!value) return emptySlots();
  try { return normalizeSlots(JSON.parse(value)); } catch { return emptySlots(); }
}
export function activeSlotId() {
  const value = storage()?.getItem(ACTIVE_KEY);
  return validId(value ?? '') ? value! : 'home-1';
}
export function setActiveSlot(id: string) { if (validId(id)) storage()?.setItem(ACTIVE_KEY, id); }
function slotIndex(id: string) { return Math.max(0, Number(id.replace('home-', '')) - 1); }
function updateSlot(id: string, apply: (slot: SaveSlotV2) => void): SaveSlotV2[] {
  const slots = loadSlots();
  const slot = slots.find((item) => item.id === id);
  if (slot) apply(slot);
  saveSlots(slots);
  return slots;
}
function activeSlot() { return loadSlots().find((slot) => slot.id === activeSlotId()) ?? loadSlots()[0]; }

export function loadProgress(): AdventureProgress { return activeSlot().progress; }
export function saveProgress(progress: AdventureProgress): AdventureProgress {
  const normalized = normalizeProgress(progress);
  updateSlot(activeSlotId(), (slot) => { slot.progress = normalized; });
  return normalized;
}
export function saveCollected(kana: string): AdventureProgress {
  const progress = loadProgress();
  if (!progress.collected.includes(kana)) progress.collected.push(kana);
  return saveProgress(progress);
}
export function resetProgress() { updateSlot(activeSlotId(), (slot) => { slot.progress = blankProgress(); }); }

/** Parent controls for the three persistent homes. Deletion replaces only that home's v2 data. */
export function renameSlot(id: string, name: string): SaveSlotV2[] {
  const clean = name.trim().slice(0, 12);
  return updateSlot(id, (slot) => { if (clean) slot.name = clean; });
}
export function deleteSlot(id: string): SaveSlotV2[] {
  return updateSlot(id, (slot) => { Object.assign(slot, blankSlot(slotIndex(id))); });
}
export function replaceSlotProgress(id: string, progress: AdventureProgress): SaveSlotV2[] {
  return updateSlot(id, (slot) => { slot.progress = normalizeProgress(progress); });
}
