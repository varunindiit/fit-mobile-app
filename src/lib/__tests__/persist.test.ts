import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { deserialize, loadState, mergeTyped, saveState, serialize, STORAGE_KEY } from '../persist';

const INITIAL = {
  onboarded: false,
  profile: { name: '', age: 29, mealTimes: { breakfast: '8:00 AM' } },
  entries: [] as { id: string }[],
  water: {} as Record<string, number>,
  premium: null as { tier: string } | null,
};

beforeEach(() => AsyncStorage.clear());

describe('mergeTyped', () => {
  it('keeps saved values that match the default type', () => {
    const out = mergeTyped(INITIAL, { onboarded: true, profile: { name: 'Asha', age: 31 }, water: { '2026-10-15': 4 }, premium: { tier: 'pro' } });
    expect(out.onboarded).toBe(true);
    expect(out.profile).toEqual({ name: 'Asha', age: 31, mealTimes: { breakfast: '8:00 AM' } });
    expect(out.water).toEqual({ '2026-10-15': 4 });
    expect(out.premium).toEqual({ tier: 'pro' });
  });

  it('falls back to defaults for wrong types, NaN and missing fields', () => {
    const out = mergeTyped(INITIAL, { onboarded: 'yes', profile: { age: NaN, name: 5 }, entries: 'oops', water: [] });
    expect(out).toEqual(INITIAL);
  });

  it('drops unknown keys', () => {
    expect(mergeTyped(INITIAL, { hacked: 1 })).not.toHaveProperty('hacked');
  });
});

describe('serialize / deserialize', () => {
  it('round-trips state', () => {
    const s = { ...INITIAL, onboarded: true, entries: [{ id: 'a' }] };
    expect(deserialize(serialize(s), INITIAL)).toEqual(s);
  });

  it('returns initial for empty storage and throws on garbage', () => {
    expect(deserialize(null, INITIAL)).toBe(INITIAL);
    expect(() => deserialize('{not json', INITIAL)).toThrow();
    expect(() => deserialize('[1,2]', INITIAL)).toThrow();
  });
});

describe('loadState / saveState', () => {
  it('persists across a reload', async () => {
    await saveState({ ...INITIAL, onboarded: true });
    expect((await loadState(INITIAL)).onboarded).toBe(true);
  });

  it('backs up corrupted data instead of losing it', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await AsyncStorage.setItem(STORAGE_KEY, '{broken');
    expect(await loadState(INITIAL)).toBe(INITIAL);
    const keys = await AsyncStorage.getAllKeys();
    const backup = keys.find((k) => k.startsWith(`${STORAGE_KEY}.corrupt-`));
    expect(backup).toBeDefined();
    expect(await AsyncStorage.getItem(backup!)).toBe('{broken');
  });
});
