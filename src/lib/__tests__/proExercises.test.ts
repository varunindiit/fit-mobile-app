/**
 * Pro shows real-athlete demonstrations only.
 *
 * These tests guard the two ways that rule can break: an exercise without a
 * demonstration leaking into a Pro session, and the filter emptying a session so
 * the day screen has nothing to list and the player nothing to run.
 */
import { describe, expect, it } from '@jest/globals';

import { EXERCISES, FOCUS_SESSIONS, PROGRAMS, PROGRAM_DAYS, programDay, type Session } from '@/data/program';
import { PRO_DEMOS, hasProDemo, hiddenFromPro, proItems, proSession, proVisible } from '@/data/proDemos';
import { TRAINER_PLANS } from '@/data/trainerPlans';

/** Every session a user can open: each program day, each body-focus session, each coach plan. */
const allSessions = (): Session[] => [
  ...PROGRAMS.flatMap((p) => Array.from({ length: PROGRAM_DAYS }, (_, i) => programDay(p.id, i + 1))),
  ...FOCUS_SESSIONS,
  ...TRAINER_PLANS,
];
const trainable = () => allSessions().filter((s) => !s.restDay && s.items.length > 0);

describe('pro exercise filter', () => {
  it('hides exactly the exercises with no real-athlete demonstration', () => {
    expect(hiddenFromPro().sort()).toEqual(EXERCISES.filter((e) => !PRO_DEMOS[e.id]).map((e) => e.id).sort());
    expect(hiddenFromPro().every((id) => !hasProDemo(id))).toBe(true);
  });

  it('leaves Free and Smart untouched', () => {
    for (const s of trainable()) {
      expect(proItems(s.items, false)).toBe(s.items);
      expect(proSession(s, false)).toBe(s);
    }
    expect(proVisible('jumping-jacks', false)).toBe(true);
    expect(proVisible('jumping-jacks', true)).toBe(false);
    expect(proVisible('plank', true)).toBe(true);
  });

  it('gives Pro only exercises it can demonstrate', () => {
    for (const s of trainable()) {
      const kept = proItems(s.items, true);
      const leaked = kept.filter((it) => !hasProDemo(it.exerciseId)).map((it) => it.exerciseId);
      expect({ key: s.key, leaked }).toEqual({ key: s.key, leaked: [] });
    }
  });

  it('never empties a session, so no screen loses its list or its start button', () => {
    for (const s of trainable()) expect({ key: s.key, moves: proItems(s.items, true).length > 0 }).toEqual({ key: s.key, moves: true });
  });

  it('keeps the session identity so navigation and logging still work', () => {
    for (const s of trainable()) {
      const filtered = proSession(s, true);
      expect(filtered.key).toBe(s.key);
      expect(filtered.title).toBe(s.title);
      // The authored list is never mutated — Free and Smart read the same object afterwards.
      expect(s.items.length).toBeGreaterThanOrEqual(filtered.items.length);
    }
  });
});
