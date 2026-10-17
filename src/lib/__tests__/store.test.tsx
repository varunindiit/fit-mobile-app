import AsyncStorage from '@react-native-async-storage/async-storage';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AppState } from 'react-native';

import { addDays, todayKey } from '../calc';
import { STORAGE_KEY } from '../persist';
import { DEMO_DAYS } from '../demo';
import { DEFAULT_PROFILE, isPremiumActive, needsProWelcome, StoreProvider, useStore } from '../store';

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
/** Logs the user made themselves, i.e. everything the demo history did not create. */
const own = <T extends { id: string }>(xs: T[]) => xs.filter((x) => !x.id.startsWith('demo-'));

describe('onboarding', () => {
  it('keeps the answers and fills the account with 30 days of demo history', async () => {
    const h = await launch();
    await act(async () => h.result.current.completeOnboarding(profile));
    const s = h.result.current.state;
    expect(s.onboarded).toBe(true);
    expect(s.profile.name).toBe('Asha');
    expect(s.demoSeeded).toBe(true);
    expect(new Set(s.entries.map((e) => e.date)).size).toBe(DEMO_DAYS);
    expect(s.workouts.length).toBeGreaterThan(0);
    expect(s.snaps.length).toBeGreaterThan(0);
    expect(s.programProgress[s.profile.program]).toBeGreaterThan(0);
    // Today's weigh-in is still the weight they entered; the 30-day history leads up to it.
    expect(s.weights.at(-1)).toMatchObject({ date: todayKey(), kg: 70 });
    expect(s.profile.startWeightKg).toBeGreaterThan(70);
    // Today is left half-logged: no dinner yet.
    const todayMeals = s.entries.filter((e) => e.date === todayKey()).map((e) => e.meal);
    expect(todayMeals).toContain('breakfast');
    expect(todayMeals).not.toContain('dinner');
  });

  it('seeds the demo history only once, even after a restart', async () => {
    let h = await launch();
    await act(async () => h.result.current.completeOnboarding(profile));
    const before = h.result.current.state.entries.length;
    h = await restart(h);
    expect(h.result.current.state.entries).toHaveLength(before);
  });

  it('never seeds over real logs', async () => {
    let h = await launch();
    await act(async () => h.result.current.addFood('poha', 'breakfast', 1));
    await act(async () => h.result.current.completeOnboarding(profile));
    const s = h.result.current.state;
    expect(s.demoSeeded).toBe(true);
    expect(s.entries).toHaveLength(1);
    expect(s.workouts).toEqual([]);
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
    const startWeight = h.result.current.state.profile.startWeightKg;
    await act(async () => h.result.current.completeOnboarding({ ...profile, name: 'Asha K' }));
    const s = h.result.current.state;
    expect(own(s.entries)).toHaveLength(1);
    expect(s.weights.at(-1)?.kg).toBe(69.4);
    expect(s.premium?.tier).toBe('pro');
    expect(s.profile.name).toBe('Asha K');
    expect(s.profile.startWeightKg).toBe(startWeight);
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
    await act(async () => a().completeOnboarding(profile));
    // The demo history already fills today, so these checks are relative to it.
    const water0 = a().state.water[todayKey()] ?? 0;
    await act(async () => {
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
    expect(own(s.entries)).toEqual([expect.objectContaining({ foodId: 'dal', meal: 'lunch', qty: 2, date: t })]);
    expect(s.water[t]).toBe(water0 + 3);
    expect(s.steps[t]).toBe(5400);
    expect(s.weights.find((w) => w.date === t)?.kg).toBe(69.5);
    expect(s.profile.weightKg).toBe(69.5);
    expect(s.settings.units).toBe('lb');
    expect(s.settings.classSpeed).toBe(10);
    expect(s.coachChat.map((m) => m.text)).toEqual(['hi']);
    expect(s.recentSearches[0]).toBe('paneer');
    expect(s.favoriteFoods[0]).toBe('apple');
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

describe('Pro trainer slice', () => {
  it('messages append, advance delivery state and survive a restart', async () => {
    let h = await launch();
    let id = '';
    await act(async () => {
      h.result.current.assignTrainer('arjun-mehta');
      id = h.result.current.addTrainerMsg({ from: 'user', text: 'Chest workout please?', status: 'sending' });
      h.result.current.addTrainerMsg({ from: 'trainer', text: 'Here you go.', status: 'delivered', planKey: 'trainer:chest-triceps' });
    });
    await act(async () => h.result.current.setMsgStatus(id, 'read'));
    expect(h.result.current.state.trainerChat.map((m) => m.status)).toEqual(['read', 'delivered']);

    h = await restart(h);
    const s = h.result.current.state;
    expect(s.trainerId).toBe('arjun-mehta');
    expect(s.trainerChat).toHaveLength(2);
    expect(s.trainerChat[1].planKey).toBe('trainer:chest-triceps');
  });

  it('opening the thread marks only the trainer’s messages read', async () => {
    const h = await launch();
    await act(async () => {
      h.result.current.addTrainerMsg({ from: 'trainer', text: 'Hi', status: 'delivered' });
      h.result.current.addTrainerMsg({ from: 'user', text: 'Hey', status: 'sent' });
    });
    await act(async () => h.result.current.markTrainerChatRead());
    const [coach, me] = h.result.current.state.trainerChat;
    expect(coach.status).toBe('read');
    expect(me.status).toBe('sent');
  });

  it('calls are logged newest first and clearing the chat keeps them', async () => {
    const h = await launch();
    await act(async () => {
      h.result.current.logCall({ trainerId: 'arjun-mehta', kind: 'audio', seconds: 90, outcome: 'ended' });
      h.result.current.logCall({ trainerId: 'arjun-mehta', kind: 'video', seconds: 0, outcome: 'declined' });
      h.result.current.addTrainerMsg({ from: 'trainer', text: 'Hi', status: 'sent' });
    });
    await act(async () => h.result.current.clearTrainerChat());
    expect(h.result.current.state.trainerChat).toEqual([]);
    expect(h.result.current.state.calls.map((c) => c.kind)).toEqual(['video', 'audio']);
  });

  it('drops malformed trainer records on load', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        onboarded: true,
        trainerId: 42,
        trainerChat: [{ id: 'ok', from: 'trainer', text: 'hi', at: 1, status: 'sent' }, { id: 'bad', from: 'alien', text: 'hi', at: 1 }, null],
        calls: [{ id: 'c1', trainerId: 'x', kind: 'audio', at: 1, seconds: 10, outcome: 'ended' }, { id: 'bad', kind: 'telepathy', at: 'nope', seconds: 1 }],
      }),
    );
    const s = (await launch()).result.current.state;
    expect(s.trainerId).toBeNull();
    expect(s.trainerChat.map((m) => m.id)).toEqual(['ok']);
    expect(s.calls.map((c) => c.id)).toEqual(['c1']);
  });
});

describe('Pro welcome shows once per activation', () => {
  const pro = (since: string, months = 3) => ({ tier: 'pro' as const, months, since });

  it('never for Free or Smart', () => {
    expect(needsProWelcome({ premium: null, proIntroFor: null })).toBe(false);
    expect(needsProWelcome({ premium: { tier: 'smart', months: 6, since: todayKey() }, proIntroFor: null })).toBe(false);
  });

  it('once for a fresh Pro activation, then never again', () => {
    const p = pro(todayKey());
    expect(needsProWelcome({ premium: p, proIntroFor: null })).toBe(true);
    expect(needsProWelcome({ premium: p, proIntroFor: p.since })).toBe(false);
  });

  it('a renewal extends months but keeps `since`, so it does not repeat', () => {
    const since = addDays(todayKey(), -20);
    expect(needsProWelcome({ premium: pro(since, 3), proIntroFor: since })).toBe(false);
    expect(needsProWelcome({ premium: pro(since, 6), proIntroFor: since })).toBe(false);
  });

  it('a new activation after a lapse shows it again', () => {
    const old = addDays(todayKey(), -400);
    expect(needsProWelcome({ premium: pro(todayKey()), proIntroFor: old })).toBe(true);
  });

  it('an expired Pro plan does not trigger it', () => {
    expect(needsProWelcome({ premium: pro(addDays(todayKey(), -400)), proIntroFor: null })).toBe(false);
  });

  it('upgrading Smart to Pro triggers it, and marking it seen survives a restart', async () => {
    let h = await launch();
    await act(async () => h.result.current.subscribe('smart', 3, 1));
    expect(needsProWelcome(h.result.current.state)).toBe(false);

    await act(async () => h.result.current.subscribe('pro', 6, 1));
    expect(needsProWelcome(h.result.current.state)).toBe(true);

    await act(async () => h.result.current.markProIntroSeen());
    expect(h.result.current.state.proIntroFor).toBe(h.result.current.state.premium!.since);

    h = await restart(h);
    expect(needsProWelcome(h.result.current.state)).toBe(false);
  });

  it('restoring the same Pro plan does not show it a second time', async () => {
    const h = await launch();
    await act(async () => h.result.current.subscribe('pro', 3, 1));
    await act(async () => h.result.current.markProIntroSeen());
    const restored = h.result.current.state.premium!;

    await act(async () => h.result.current.setPremium(null));
    await act(async () => h.result.current.setPremium(restored));
    expect(needsProWelcome(h.result.current.state)).toBe(false);
  });
});
