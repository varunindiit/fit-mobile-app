import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = 'fitora-state-v1';
/** Bump when the saved shape changes and add a step to `migrate`. */
export const SCHEMA_VERSION = 1;

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Merge saved data onto defaults, keeping only values whose type matches the default.
 * A corrupted or outdated field falls back to its default instead of crashing the app.
 */
export function mergeTyped<T>(defaults: T, saved: unknown): T {
  if (saved === undefined || saved === null) return defaults;
  if (Array.isArray(defaults)) return (Array.isArray(saved) ? saved : defaults) as T;
  if (typeof defaults === 'number') return (typeof saved === 'number' && Number.isFinite(saved) ? saved : defaults) as T;
  if (typeof defaults === 'string' || typeof defaults === 'boolean') return (typeof saved === typeof defaults ? saved : defaults) as T;
  if (isObj(defaults)) {
    if (!isObj(saved)) return defaults;
    // Empty default objects are open records (e.g. water by date) — keep every saved key.
    if (Object.keys(defaults).length === 0) return saved as T;
    const out: Json = { ...defaults };
    for (const k of Object.keys(defaults)) out[k] = mergeTyped((defaults as Json)[k], saved[k]);
    return out as T;
  }
  // Nullable defaults (e.g. premium: null, rating: null) take the saved value; the store validates its shape.
  return saved as T;
}

/** Upgrade older saved payloads to the current schema. */
export function migrate(saved: Json): Json {
  const v = typeof saved.version === 'number' ? saved.version : 0;
  let out = saved;
  if (v < 1) out = { ...out, version: 1 };
  return out;
}

export function deserialize<T>(raw: string | null, initial: T): T {
  if (!raw) return initial;
  const parsed = JSON.parse(raw);
  if (!isObj(parsed)) throw new Error('Saved state is not an object');
  return mergeTyped(initial, migrate(parsed));
}

export function serialize<T extends object>(state: T) {
  return JSON.stringify({ ...state, version: SCHEMA_VERSION });
}

/**
 * Read saved state. Unreadable data is copied aside (never silently overwritten)
 * so a bad write or a bug can't wipe the user's history.
 */
export async function loadState<T>(initial: T): Promise<T> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  try {
    return deserialize(raw, initial);
  } catch (e) {
    console.warn('[store] saved state unreadable, keeping a backup', e);
    if (raw) await AsyncStorage.setItem(`${STORAGE_KEY}.corrupt-${Date.now()}`, raw).catch(() => {});
    return initial;
  }
}

export async function saveState<T extends object>(state: T) {
  await AsyncStorage.setItem(STORAGE_KEY, serialize(state));
}
