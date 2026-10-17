import { describe, expect, it } from '@jest/globals';

import { findSession, sessionMeta } from '@/components/program/session';
import { EXERCISES } from '@/data/program';
import { PRO_DEMOS } from '@/data/proDemos';
import { QUICK_ASKS, seedConversation, trainerReply } from '@/data/trainerChat';
import { TRAINER_PLANS, planOnDay, planSummary, trainerPlanByKey, weekPlan } from '@/data/trainerPlans';
import { TRAINERS, WEEKDAYS, availability, bookedFor, trainerById, weekdayOf } from '@/data/trainers';

const EX_IDS = new Set(EXERCISES.map((e) => e.id));

describe('trainer plans reference real exercises', () => {
  it('every plan item is an exercise the app can demonstrate and explain', () => {
    for (const p of TRAINER_PLANS)
      for (const it of p.items) expect({ plan: p.key, id: it.exerciseId, known: EX_IDS.has(it.exerciseId) }).toMatchObject({ known: true });
  });

  it('every plan has a key, a coach note and a real trainer', () => {
    for (const p of TRAINER_PLANS) {
      expect(p.key.startsWith('trainer:')).toBe(true);
      expect(p.note.length).toBeGreaterThan(20);
      expect(TRAINERS.some((t) => t.id === p.trainerId)).toBe(true);
      expect(WEEKDAYS).toContain(p.day);
    }
  });

  it('summaries are usable numbers', () => {
    for (const p of TRAINER_PLANS) {
      const s = planSummary(p);
      expect(s.exercises).toBe(p.items.length);
      expect(s.minutes).toBeGreaterThan(0);
      expect(s.kcal).toBeGreaterThan(0);
    }
  });
});

describe('trainer plans run through the existing session machinery', () => {
  it('findSession resolves a trainer key to its plan', () => {
    const p = TRAINER_PLANS[0];
    expect(findSession(p.key)).toBe(trainerPlanByKey(p.key));
  });

  it('an unknown trainer key resolves to nothing instead of throwing', () => {
    expect(findSession('trainer:does-not-exist')).toBeUndefined();
  });

  it('sessionMeta credits the coach who wrote it', () => {
    const p = TRAINER_PLANS[0];
    const meta = sessionMeta(p);
    expect(meta.eyebrow).toContain(trainerById(p.trainerId).name);
    expect(meta.program).toBeUndefined();
  });
});

describe('Pro demonstrations map to real exercises', () => {
  it('every Pro demo id is an exercise in the app', () => {
    for (const id of Object.keys(PRO_DEMOS)) expect({ id, known: EX_IDS.has(id) }).toMatchObject({ known: true });
  });
});

describe('trainer chat', () => {
  const name = 'Asha';

  it('every shared plan key in a scripted reply resolves', () => {
    const asks = [...QUICK_ASKS, 'chest', 'abs', 'legs', 'hiit', 'my back hurts', 'hello', 'thanks', 'what about tomorrow', 'done', 'anything else'];
    for (const a of asks)
      for (const b of trainerReply(a, TRAINERS[0].id, name)) {
        expect(b.text.length).toBeGreaterThan(0);
        if (b.planKey) expect(trainerPlanByKey(b.planKey)).toBeDefined();
      }
  });

  it('always replies with at least one bubble', () => {
    expect(trainerReply('', TRAINERS[0].id, name).length).toBeGreaterThan(0);
    expect(trainerReply('qwertyuiop', TRAINERS[0].id, name).length).toBeGreaterThan(0);
  });

  it('the seeded conversation is ordered and its shared plan exists', () => {
    const msgs = seedConversation(TRAINERS[0].id, name);
    expect(msgs.length).toBeGreaterThan(1);
    for (let i = 1; i < msgs.length; i++) expect(msgs[i].at).toBeGreaterThanOrEqual(msgs[i - 1].at);
    for (const m of msgs) if (m.planKey) expect(trainerPlanByKey(m.planKey)).toBeDefined();
  });
});

describe('trainer profiles', () => {
  it('availability always produces a label and, where hours exist, a next slot', () => {
    for (const t of TRAINERS) {
      const a = availability(t, new Date(2026, 9, 14, 11, 30));
      expect(a.label.length).toBeGreaterThan(0);
      expect(a.next).not.toBeNull();
    }
  });

  it('a trainer who is off all week still reports a label instead of crashing', () => {
    const off: (typeof TRAINERS)[number] = { ...TRAINERS[0], hours: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] } };
    const a = availability(off);
    expect(a.online).toBe(false);
    expect(a.next).toBeNull();
    expect(a.label).toBe('Off this week');
  });

  it('an unknown or missing trainer id falls back rather than returning undefined', () => {
    expect(trainerById(null).id).toBe(TRAINERS[0].id);
    expect(trainerById('nobody').id).toBe(TRAINERS[0].id);
    expect(bookedFor('nobody').length).toBeGreaterThan(0);
  });

  it('every trainer has a plan in their week and a schedule the dashboard can render', () => {
    for (const t of TRAINERS) expect(weekPlan(t.id).length).toBeGreaterThan(0);
    expect(WEEKDAYS).toContain(weekdayOf());
    // planOnDay returns a plan or nothing, never a plan belonging to another coach
    for (const t of TRAINERS)
      for (const d of WEEKDAYS) {
        const p = planOnDay(t.id, d);
        if (p) expect(weekPlan(t.id)).toContain(p);
      }
  });
});
