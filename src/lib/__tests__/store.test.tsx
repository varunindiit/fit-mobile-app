import AsyncStorage from '@react-native-async-storage/async-storage';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AppState } from 'react-native';

import { addDays, todayKey } from '../calc';
import { STORAGE_KEY } from '../persist';
import { DEFAULT_PROFILE, isPremiumActive, StoreProvider, useStore } from '../store';

const wrapper = ({ children }: { children: React.ReactNode }) => <StoreProvider>{children}</StoreProvider>;

/** Mount a fresh store (like an app launch) and wait for it to read storage. */
async function launch() {
  const hook = await renderHook(() => useStore(), { wrapper });
  await waitFor(() => expect(hook.result.current.hydrated).toBe(true));
  return hook;
}

/** Simulate the app going to background (forces an immediate save), then a cold start. */
async function restart(hook: Awaited<ReturnType<typeof launch>>) {
  await act(async () => hook.result.current.flush());
  await hook.unmount();
  return launch();
}

const saved = async () => JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? 'null');

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

const profile = { ...DEFAULT_PROFILE, name: 'Asha', weightKg: 70, targetKg: 62 };

describe('onboarding', () => {
  it('stores real answers only — no fake history', async () => {
    const h = await launch();
    await act(async () => h.result.current.completeOnboarding(profile));
    const s = h.result.current.state;
    expect(s.onboarded).toBe(true);
    expect(s.entries).toEqual([]);
    expect(s.workouts).toEqual([]);
    expect(s.weights).toEqual([expect.objectContaining({ date: todayKey(), kg: 70 })]);
    expect(s.profile.startWeightKg).toBe(70);
    expect(s.programProgress).toEqual({});
  });

  it('re-onboarding after log out keeps every log', async () => {
    const h = await launch();
    await act(async () => h.result.current.completeOnboarding(profile));
    await act(async () => {
      h.result.current.addFood('poha', 'breakfast', 1);
      h.result.current.addWeight(69.4);
      h.result.current.subscribe('pro', 3);
      h.result.current.restartOnboarding();
    });
    await act(async () => h.result.current.completeOnboarding({ ...profile, name: 'Asha K' }));
    const s = h.result.current.state;
    expect(s.entries).toHaveLength(1);
    expect(s.weights.at(-1)?.kg).toBe(69.4);
    expect(s.premium?.tier).toBe('pro');
    expect(s.profile.name).toBe('Asha K');
    expect(s.profile.startWeightKg).toBe(70);
  });

  it('log in returns to saved data and draft survives a restart', async () => {
    let h = await launch();
    await act(async () => h.result.current.saveOnboardingDraft({ p: { ...profile, name: 'Draft' }, step: 'goal', genderPicked: true }));
    h = await restart(h);
    expect(h.result.current.state.onboardingDraft?.step).toBe('goal');
    expect(h.result.current.state.onboardingDraft?.p.name).toBe('Draft');
    await act(async () => h.result.current.logIn());
    expect(h.result.current.state.onboarded).toBe(true);
    expect(h.result.current.state.onboardingDraft).toBeNull();
  });
});

describe('every user action survives an app restart', () => {
  it('food, water, steps, weight, settings, chat, search, favourites, plan edits, resume', async () => {
    let h = await launch();
    const a = () => h.result.current;
    await act(async () => {
      a().completeOnboarding(profile);
      a().addFood('dal', 'lunch', 2);
      a().addWater(1);
      a().addWater(1);
      a().addWater(1);
      a().setSteps(5400);
      a().addWeight(69.5);
      a().updateSettings({ units: 'lb', classSpeed: 10 });
      a().addChatMessage({ from: 'user', text: 'hi' });
      a().addRecentSearch('paneer');
      a().toggleFavorite('apple');
      a().setPlanEdit('program:belly:3', [{ exerciseId: 'burpees', reps: 8 }]);
      a().saveResume('program:belly:3', { idx: 2, done: [0, 2], elapsedMs: 90000 });
      a().markTipSeen('plan-edit');
      a().setRating(5);
    });
    h = await restart(h);
    const s = a().state;
    const t = todayKey();
    expect(s.onboarded).toBe(true);
    expect(s.entries).toEqual([expect.objectContaining({ foodId: 'dal', meal: 'lunch', qty: 2, date: t })]);
    expect(s.water[t]).toBe(3);
    expect(s.steps[t]).toBe(5400);
    expect(s.weights.find((w) => w.date === t)?.kg).toBe(69.5);
    expect(s.profile.weightKg).toBe(69.5);
    expect(s.settings.units).toBe('lb');
    expect(s.settings.classSpeed).toBe(10);
    expect(s.coachChat.map((m) => m.text)).toEqual(['hi']);
    expect(s.recentSearches).toEqual(['paneer']);
    expect(s.favoriteFoods).toEqual(['apple']);
    expect(s.planEdits['program:belly:3']).toEqual([{ exerciseId: 'burpees', reps: 8 }]);
    expect(s.sessionResume['program:belly:3']).toMatchObject({ idx: 2, done: [0, 2], elapsedMs: 90000 });
    expect(s.seenTips).toEqual(['plan-edit']);
    expect(s.rating).toBe(5);
  });

  it('saves immediately when the app goes to background', async () => {
    const listeners: ((s: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, fn: (s: string) => void) => {
      listeners.push(fn);
      return { remove: () => {} };
    }) as never);
    const h = await launch();
    await act(async () => h.result.current.addWater(2));
    expect((await saved())?.water?.[todayKey()]).toBeUndefined(); // still debounced
    await act(async () => listeners.forEach((fn) => fn('background')));
    // Well under the 300ms debounce, so only the background flush can have written it.
    await waitFor(async () => expect((await saved())?.water?.[todayKey()]).toBe(2), { timeout: 100, interval: 10 });
  });

  it('retries a failed save', async () => {
    const h = await launch();
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await act(async () => h.result.current.addWater(4));
    await act(async () => h.result.current.flush());
    await waitFor(async () => expect((await saved())?.water?.[todayKey()]).toBe(4), { timeout: 3500 });
  });

  it('does not overwrite storage when reading it failed', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ onboarded: true, entries: [] }));
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    const h = await launch();
    await act(async () => h.result.current.addWater(1));
    await act(async () => h.result.current.flush());
    expect((await saved()).onboarded).toBe(true);
    expect((await saved()).water).toBeUndefined();
  });

  it('drops malformed saved records instead of crashing', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        onboarded: true,
        entries: [{ id: 'ok', foodId: 'dal', meal: 'lunch', qty: 1, date: '2026-10-01' }, { id: 'bad', foodId: 'dal', qty: 'x', date: 'nope' }, null],
        weights: [{ id: 'w', date: '2026-10-01', kg: null }],
        planEdits: { 'program:belly:1': [{ exerciseId: 'gone-exercise' }, { exerciseId: 'burpees' }] },
        premium: 'yes',
        rating: '5',
      }),
    );
    const s = (await launch()).result.current.state;
    expect(s.entries.map((e) => e.id)).toEqual(['ok']);
    expect(s.weights).toEqual([]);
    expect(s.planEdits['program:belly:1']).toEqual([{ exerciseId: 'burpees' }]);
    expect(s.premium).toBeNull();
    expect(s.rating).toBeNull();
  });
});

describe('actions handle edge cases', () => {
  it('water stays within 0..16 and rapid taps never drop a glass', async () => {
    const h = await launch();
    await act(async () => {
      for (let i = 0; i < 20; i++) h.result.current.addWater(1);
    });
    expect(h.result.current.state.water[todayKey()]).toBe(16);
    await act(async () => h.result.current.addWater(-40));
    expect(h.result.current.state.water[todayKey()]).toBe(0);
  });

  it('rejects invalid food quantities', async () => {
    const h = await launch();
    await act(async () => {
      h.result.current.addFood('dal', 'lunch', 0);
      h.result.current.addFood('dal', 'lunch', NaN);
      h.result.current.addFood('dal', 'lunch', 1.5);
    });
    const [e] = h.result.current.state.entries;
    expect(h.result.current.state.entries).toHaveLength(1);
    await act(async () => h.result.current.updateFood(e.id, { qty: -1 }));
    expect(h.result.current.state.entries[0].qty).toBe(1.5);
  });

  it('undo restores a deleted entry with the same id and position', async () => {
    const h = await launch();
    await act(async () => ['poha', 'dal', 'roti'].forEach((f) => h.result.current.addFood(f, 'lunch', 1)));
    const entry = h.result.current.state.entries[1];
    await act(async () => h.result.current.removeFood(entry.id));
    await act(async () => h.result.current.restoreFood(entry, 1));
    expect(h.result.current.state.entries.map((e) => e.foodId)).toEqual(['poha', 'dal', 'roti']);
    expect(h.result.current.state.entries[1].id).toBe(entry.id);
  });

  it('copyDay copies once', async () => {
    const h = await launch();
    const y = addDays(todayKey(), -1);
    await act(async () => h.result.current.addFood('idli', 'breakfast', 3, y));
    await act(async () => {
      h.result.current.copyDay(y, todayKey());
      h.result.current.copyDay(y, todayKey());
    });
    expect(h.result.current.state.entries.filter((e) => e.date === todayKey())).toHaveLength(1);
  });

  it('logSnap records the snap and its entries together', async () => {
    const h = await launch();
    await act(async () =>
      h.result.current.logSnap({ date: todayKey(), meal: 'lunch', title: 'Thali', score: 7, kcal: 600, items: [{ foodId: 'roti', qty: 2 }, { foodId: 'dal', qty: 0 }] }),
    );
    const { snaps, entries } = h.result.current.state;
    expect(snaps).toHaveLength(1);
    expect(entries).toEqual([expect.objectContaining({ foodId: 'roti', qty: 2, snapId: snaps[0].id })]);
  });

  it('recent searches are deduped and capped', async () => {
    const h = await launch();
    await act(async () => ['a', 'b', 'A', ' ', ...'cdefghij'].forEach((q) => h.result.current.addRecentSearch(q)));
    const r = h.result.current.state.recentSearches;
    expect(r).toHaveLength(8);
    expect(r[0]).toBe('j');
    expect(r.filter((x) => x.toLowerCase() === 'a')).toHaveLength(0); // pushed out by newer ones
  });

  it('program progress advances on the next day and rolls back when its log is deleted', async () => {
    const h = await launch();
    const done = (day: number) => h.result.current.completeSession({ sessionKey: `program:belly:${day}`, title: `Day ${day}`, emoji: '🔥', minutes: 10, kcal: 80 });
    await act(async () => h.result.current.saveResume('program:belly:1', { idx: 1, done: [0], elapsedMs: 1 }));
    await act(async () => done(1));
    await act(async () => done(3)); // not the next day — logged but no advance
    expect(h.result.current.state.programProgress.belly).toBe(1);
    expect(h.result.current.state.sessionResume['program:belly:1']).toBeUndefined();
    const day1 = h.result.current.state.workouts.find((w) => w.sessionKey === 'program:belly:1')!;
    await act(async () => h.result.current.removeWorkout(day1.id));
    expect(h.result.current.state.programProgress.belly).toBe(0);
  });

  it('logWorkout returns an id usable for undo', async () => {
    const h = await launch();
    let id = '';
    await act(async () => {
      id = h.result.current.logWorkout({ title: 'Walk', emoji: '🚶', minutes: 30, kcal: 140 });
    });
    expect(h.result.current.state.workouts[0]).toMatchObject({ id, date: todayKey() });
    await act(async () => h.result.current.removeWorkout(id));
    expect(h.result.current.state.workouts).toEqual([]);
  });

  it('premium: renew extends, cancel keeps access until the period ends', async () => {
    const h = await launch();
    await act(async () => h.result.current.subscribe('pro', 3, 999));
    await act(async () => h.result.current.subscribe('pro', 3, 999));
    expect(h.result.current.state.premium).toMatchObject({ tier: 'pro', months: 6, since: todayKey() });
    expect(h.result.current.state.purchases).toHaveLength(2);
    await act(async () => h.result.current.cancelPremium());
    const p = h.result.current.state.premium!;
    expect(p.cancelledAt).toBe(todayKey());
    expect(isPremiumActive(p)).toBe(true);
    expect(isPremiumActive({ ...p, since: '2020-01-01' })).toBe(false);
    expect(isPremiumActive(null)).toBe(false);
  });
});
