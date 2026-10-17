import { describe, expect, it } from '@jest/globals';

import { addDays, todayKey } from '../calc';
import { FREE_PROGRAM_DAYS, can, classLock, featureLock, planStatus, sessionLock, unlockedProgramDays } from '../entitlements';
import { PRO_DEMOS, proDemo } from '@/data/proDemos';
import type { Premium } from '../store';

const today = todayKey();
const sub = (tier: 'smart' | 'pro', months: number, since: string, cancelledAt?: string): Premium => ({ tier, months, since, cancelledAt });

describe('planStatus', () => {
  it('no purchase is Free', () => {
    expect(planStatus(null, today)).toMatchObject({ tier: 'free', purchased: null, active: false, expired: false });
  });

  it('an in-period plan is active at its tier', () => {
    const s = planStatus(sub('pro', 3, addDays(today, -30)), today);
    expect(s).toMatchObject({ tier: 'pro', purchased: 'pro', active: true, expired: false, cancelled: false });
  });

  it('a cancelled plan keeps access until the period ends', () => {
    const s = planStatus(sub('smart', 6, addDays(today, -10), addDays(today, -2)), today);
    expect(s).toMatchObject({ tier: 'smart', active: true, cancelled: true });
  });

  it('an expired plan drops to Free but remembers what was bought', () => {
    const s = planStatus(sub('pro', 3, addDays(today, -400)), today);
    expect(s).toMatchObject({ tier: 'free', purchased: 'pro', active: false, expired: true });
  });

  it('a malformed record is treated as Free rather than crashing', () => {
    expect(planStatus({ tier: 'pro', months: NaN, since: '2026-01-01' } as Premium, today).tier).toBe('free');
  });
});

describe('can', () => {
  it('Pro includes everything Smart has', () => {
    for (const f of ['program.allDays', 'library.full', 'progress.full', 'plan.customise'] as const) {
      expect(can('smart', f)).toBe(true);
      expect(can('pro', f)).toBe(true);
      expect(can('free', f)).toBe(false);
    }
  });

  it('trainer features are Pro only', () => {
    for (const f of ['trainer', 'trainer.chat', 'trainer.call', 'trainer.demos', 'trainer.plans'] as const) {
      expect(can('free', f)).toBe(false);
      expect(can('smart', f)).toBe(false);
      expect(can('pro', f)).toBe(true);
    }
  });
});

describe('sessionLock — program days', () => {
  it('Free gets Day 1 and nothing beyond it', () => {
    expect(sessionLock('free', `program:belly:${FREE_PROGRAM_DAYS}`)).toBeNull();
    expect(sessionLock('free', 'program:belly:2')).toMatchObject({ need: 'smart' });
  });

  it('Smart and Pro open every day', () => {
    expect(sessionLock('smart', 'program:belly:30')).toBeNull();
    expect(sessionLock('pro', 'program:belly:17')).toBeNull();
  });

  it('the Free cap does not move with progress — a lapsed plan locks the days again', () => {
    // The days themselves stay in `programProgress` (see the store tests); they are
    // locked, not deleted, and come straight back when the plan is renewed.
    expect(sessionLock('free', 'program:abs:12')).toMatchObject({ need: 'smart' });
    expect(sessionLock('smart', 'program:abs:12')).toBeNull();
  });

  it('unlockedProgramDays reflects the same rule', () => {
    expect(unlockedProgramDays('free')).toBe(FREE_PROGRAM_DAYS);
    expect(unlockedProgramDays('smart')).toBe(30);
    expect(unlockedProgramDays('pro')).toBe(30);
  });

  it('an out-of-range or malformed day is not locked — the screen reports it as missing instead', () => {
    expect(sessionLock('free', 'program:belly:99')).toBeNull();
    expect(sessionLock('free', 'program:belly:abc')).toBeNull();
  });
});

describe('sessionLock — library and trainer plans', () => {
  it('Free trains the beginner focus sessions only', () => {
    expect(sessionLock('free', 'focus:abs-beginner')).toBeNull();
    expect(sessionLock('free', 'focus:rock-hard')).toMatchObject({ need: 'smart' });
    expect(sessionLock('smart', 'focus:rock-hard')).toBeNull();
  });

  it('trainer plans need Pro', () => {
    expect(sessionLock('free', 'trainer:chest-triceps')).toMatchObject({ need: 'pro' });
    expect(sessionLock('smart', 'trainer:chest-triceps')).toMatchObject({ need: 'pro' });
    expect(sessionLock('pro', 'trainer:chest-triceps')).toBeNull();
  });

  it('guided classes follow the same beginner rule', () => {
    expect(classLock('free', 'Beginner')).toBeNull();
    expect(classLock('free', 'Advanced')).toMatchObject({ need: 'smart' });
    expect(classLock('smart', 'Advanced')).toBeNull();
  });
});

describe('featureLock', () => {
  it('returns null when unlocked and copy naming the needed plan when not', () => {
    expect(featureLock('pro', 'trainer.chat')).toBeNull();
    const lock = featureLock('free', 'trainer.chat');
    expect(lock).toMatchObject({ need: 'pro', badge: 'PRO' });
    expect(lock!.title.length).toBeGreaterThan(0);
    expect(lock!.text.length).toBeGreaterThan(0);
  });
});

describe('Pro demonstrations stay Pro-only', () => {
  const anId = Object.keys(PRO_DEMOS)[0];

  it('a Pro account gets the asset', () => {
    expect(proDemo(anId, true)).toBeDefined();
  });

  it('Free and Smart can never be handed one', () => {
    expect(proDemo(anId, false)).toBeUndefined();
  });

  it('an exercise without a Pro demonstration falls back for everyone', () => {
    expect(proDemo('jumping-jacks', true)).toBeUndefined();
    expect(proDemo(undefined, true)).toBeUndefined();
  });
});
