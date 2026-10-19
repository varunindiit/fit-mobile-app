/**
 * Pro shows real-athlete demonstrations only.
 *
 * These tests guard the two ways that rule can break: an exercise without a
 * demonstration leaking into a Pro session, and the filter emptying a session so
 * the day screen has nothing to list and the player nothing to run.
 */
import { describe, expect, it } from '@jest/globals';

import { EXERCISES, FOCUS_SESSIONS, PROGRAMS, PROGRAM_DAYS, programDay, type Session } from '@/data/program';
import { PRO_DEMOS, PRO_DEMO_CREDIT, PRO_VIDEOS, PRO_VIDEO_CREDIT, hasProDemo, hiddenFromPro, proDemo, proDemoCredit, proItems, proSession, proVideo, proVisible } from '@/data/proDemos';
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
    expect(hiddenFromPro().sort()).toEqual(EXERCISES.filter((e) => !PRO_DEMOS[e.id] && !PRO_VIDEOS[e.id]).map((e) => e.id).sort());
    expect(hiddenFromPro().every((id) => !hasProDemo(id))).toBe(true);
  });

  it('leaves Free and Smart untouched', () => {
    for (const s of trainable()) {
      expect(proItems(s.items, false)).toBe(s.items);
      expect(proSession(s, false)).toBe(s);
    }
    for (const e of EXERCISES) {
      expect(proVisible(e.id, false)).toBe(true);
      expect(proVisible(e.id, true)).toBe(hasProDemo(e.id));
    }
  });

  it('gives Pro only exercises it can demonstrate', () => {
    for (const s of trainable()) {
      const kept = proItems(s.items, true);
      const leaked = kept.filter((it) => !hasProDemo(it.exerciseId)).map((it) => it.exerciseId);
      expect({ key: s.key, leaked }).toEqual({ key: s.key, leaked: [] });
    }
  });

  it('hands Pro media only to Pro accounts', () => {
    for (const e of EXERCISES) {
      expect(proVideo(e.id, false)).toBeUndefined();
      expect(proDemo(e.id, false)).toBeUndefined();
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

describe('pro demonstration videos', () => {
  it('cover every exercise, each with its poster', () => {
    const ids = new Set(EXERCISES.map((e) => e.id));
    expect(Object.keys(PRO_VIDEOS).sort()).toEqual([...ids].sort());
    for (const [id, v] of Object.entries(PRO_VIDEOS)) expect({ id, video: !!v.video, poster: !!v.poster }).toEqual({ id, video: true, poster: true });
  });

  it('win over the photo demonstration, which stays as the fallback', () => {
    for (const id of Object.keys(PRO_DEMOS)) {
      expect(proVideo(id, true)).toBe(PRO_VIDEOS[id]);
      expect(proDemo(id, true)).toBe(PRO_DEMOS[id]);
    }
  });

  it('are captioned as video, and photos keep their credit', () => {
    expect(proDemoCredit(['plank', 'burpees'])).toBe(PRO_VIDEO_CREDIT);
    expect(proDemoCredit([])).toBe(PRO_VIDEO_CREDIT);
    expect(PRO_DEMO_CREDIT).toContain('Photo');
  });
});
