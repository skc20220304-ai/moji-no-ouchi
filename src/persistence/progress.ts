const KEY = 'moji-no-ouchi:save-slots:v1';
const LEGACY_KEY = 'moji-no-ouchi:progress:v1';
const ACTIVE_KEY = 'moji-no-ouchi:active-slot:v1';
export const SLOT_COUNT = 3;

export interface Progress { collected: string[]; }
const blank = (): Progress => ({ collected: [] });

export interface SaveSlot { id: string; progress: Progress; }
const emptySlots = (): SaveSlot[] => Array.from({ length: SLOT_COUNT }, (_, index) => ({ id: `home-${index + 1}`, progress: blank() }));

export function loadSlots(): SaveSlot[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<SaveSlot>[] | null;
    if (Array.isArray(saved)) return emptySlots().map((slot, index) => ({
      id: slot.id,
      progress: Array.isArray(saved[index]?.progress?.collected)
        ? { collected: [...new Set(saved[index].progress.collected.filter((item): item is string => typeof item === 'string'))] }
        : blank()
    }));
  } catch { /* Continue with clean slots when old data is unreadable. */ }
  const slots = emptySlots();
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null') as Partial<Progress> | null;
    if (Array.isArray(legacy?.collected)) slots[0].progress.collected = [...new Set(legacy.collected.filter((item): item is string => typeof item === 'string'))];
  } catch { /* No legacy save is also valid. */ }
  saveSlots(slots);
  return slots;
}

function saveSlots(slots: SaveSlot[]) { localStorage.setItem(KEY, JSON.stringify(slots)); }
export function activeSlotId() { const value = localStorage.getItem(ACTIVE_KEY); return /^home-[1-3]$/.test(value ?? '') ? value! : 'home-1'; }
export function setActiveSlot(id: string) { if (/^home-[1-3]$/.test(id)) localStorage.setItem(ACTIVE_KEY, id); }
function activeSlot() { return loadSlots().find((slot) => slot.id === activeSlotId()) ?? loadSlots()[0]; }

export function loadProgress(): Progress {
  return activeSlot().progress;
}

export function saveCollected(kana: string): Progress {
  const slots = loadSlots();
  const slot = slots.find((item) => item.id === activeSlotId()) ?? slots[0];
  const progress = slot.progress;
  if (!progress.collected.includes(kana)) progress.collected.push(kana);
  saveSlots(slots);
  return progress;
}

export function resetProgress() {
  const slots = loadSlots();
  const slot = slots.find((item) => item.id === activeSlotId()) ?? slots[0];
  slot.progress = blank();
  saveSlots(slots);
}
