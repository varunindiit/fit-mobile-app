/**
 * The single source of truth for what each plan unlocks.
 *
 * Screens never compare `state.premium.tier` themselves — they ask `useAccess()`
 * (or these helpers) so a plan change is a one-file edit and Free/Smart/Pro can
 * never drift apart between screens.
 *
 * Three tiers: `free` (no purchase), `smart` and `pro` (the two purchasable
 * `PlanTier`s). A cancelled plan keeps its tier until the paid period ends; once
 * that passes the user drops to `free` but **keeps every log and day of program
 * progress** — nothing here ever deletes data.
 */
import { FOCUS_SESSIONS, PROGRAM_DAYS } from '@/data/program';
import type { PlanTier } from '@/data/plans';
import { parseKey, todayKey } from './calc';
import type { Premium } from './store';

export type Tier = 'free' | PlanTier;

/** Ordered so `RANK[a] >= RANK[b]` answers "does a include b?". */
export const RANK: Record<Tier, number> = { free: 0, smart: 1, pro: 2 };

export const TIER_LABEL: Record<Tier, string> = { free: 'Free', smart: 'Smart', pro: 'Pro' };

/** Program days a Free account can train. Day 1 only — Day 2 onward needs Smart. */
export const FREE_PROGRAM_DAYS = 1;

/** Everything that can be gated. Add a key here, then a row in `ENTITLEMENTS`. */
export type Feature =
  /** Program days beyond the Free allowance. */
  | 'program.allDays'
  /** The full body-focus / guided-class library (Free sees beginner sessions only). */
  | 'library.full'
  /** Full analytics history rather than the recent-days summary. */
  | 'progress.full'
  /** Editing a session's exercise list. */
  | 'plan.customise'
  /** The Pro coaching dashboard and the assigned trainer. */
  | 'trainer'
  | 'trainer.chat'
  | 'trainer.call'
  /** Pro-only real-athlete exercise demonstrations. */
  | 'trainer.demos'
  /** Trainer-authored workout programs. */
  | 'trainer.plans';

const ENTITLEMENTS: Record<Feature, Tier> = {
  'program.allDays': 'smart',
  'library.full': 'smart',
  'progress.full': 'smart',
  'plan.customise': 'smart',
  trainer: 'pro',
  'trainer.chat': 'pro',
  'trainer.call': 'pro',
  'trainer.demos': 'pro',
  'trainer.plans': 'pro',
};

/** Lowest plan that unlocks `f`. */
export const requiredTier = (f: Feature): PlanTier => ENTITLEMENTS[f] as PlanTier;

export const can = (tier: Tier, f: Feature) => RANK[tier] >= RANK[ENTITLEMENTS[f]];

/* ---------- Subscription status ---------- */

/** The day a plan's paid period ends (exclusive). */
export const periodEnd = (since: string, months: number) => {
  const d = parseKey(since);
  d.setMonth(d.getMonth() + months);
  return d;
};

export type PlanStatus = {
  /** What the account can use right now. */
  tier: Tier;
  /** The tier that was paid for, even once it has lapsed — so "Renew Pro" can be offered. */
  purchased: PlanTier | null;
  /** A paid plan is still inside its period. */
  active: boolean;
  /** A paid plan whose period has run out. */
  expired: boolean;
  /** Cancelled but still inside the paid period. */
  cancelled: boolean;
  /** Last day of access, `null` on Free. */
  endsOn: Date | null;
};

/**
 * Resolve a stored `premium` record into today's access.
 * Handles renewals (months accumulate), cancellation (access until the period ends)
 * and expiry (silently back to Free, data untouched).
 */
export function planStatus(premium: Premium | null, today = todayKey()): PlanStatus {
  if (!premium || !Number.isFinite(premium.months) || typeof premium.since !== 'string')
    return { tier: 'free', purchased: null, active: false, expired: false, cancelled: false, endsOn: null };
  const endsOn = periodEnd(premium.since, premium.months);
  const active = parseKey(today) < endsOn;
  return {
    tier: active ? premium.tier : 'free',
    purchased: premium.tier,
    active,
    expired: !active,
    cancelled: active && !!premium.cancelledAt,
    endsOn,
  };
}

export const activeTier = (premium: Premium | null, today = todayKey()): Tier => planStatus(premium, today).tier;

/* ---------- Locks ---------- */

/** Why something is locked, and what unlocks it. Screens render this; they don't compose the copy. */
export type Lock = {
  need: PlanTier;
  title: string;
  text: string;
  /** Short label for a badge or toast. */
  badge: string;
};

const upgradeLock = (need: PlanTier, title: string, text: string, badge: string): Lock => ({ need, title, text, badge });

/** Focus sessions a Free account can train: the beginner tier of the library. */
export const isFreeSession = (key: string) => FOCUS_SESSIONS.some((s) => s.key === key && s.level === 'Beginner');

/**
 * Lock for a session key, or `null` when it is open.
 *
 * Free is capped at `FREE_PROGRAM_DAYS` regardless of how far the account has got:
 * a completed day still shows its tick and its log, it just can't be trained again
 * until the plan is renewed. Nothing is ever deleted — the progress is waiting when
 * they upgrade.
 */
export function sessionLock(tier: Tier, key: string): Lock | null {
  if (key.startsWith('trainer:'))
    return can(tier, 'trainer.plans')
      ? null
      : upgradeLock('pro', 'Trainer plans are a Pro feature', 'Fittelo Pro assigns you a personal trainer who builds your plan, checks your form and answers you in chat.', 'PRO');

  if (key.startsWith('program:')) {
    const day = Number(key.split(':')[2]);
    if (!Number.isInteger(day) || day < 1 || day > PROGRAM_DAYS) return null;
    if (can(tier, 'program.allDays') || day <= FREE_PROGRAM_DAYS) return null;
    return upgradeLock(
      'smart',
      `Day ${day} is locked`,
      `The Free plan includes Day ${FREE_PROGRAM_DAYS} so you can try the program. Upgrade to Smart to unlock all ${PROGRAM_DAYS} days — your progress so far is kept.`,
      'SMART',
    );
  }

  if (key.startsWith('focus:')) {
    if (can(tier, 'library.full') || isFreeSession(key)) return null;
    return upgradeLock('smart', 'Workout locked', 'Free includes our beginner workouts. Smart unlocks the full library at every level.', 'SMART');
  }

  return null;
}

/** Guided classes follow the focus-library rule: Free trains the beginner ones. */
export function classLock(tier: Tier, level: string): Lock | null {
  if (can(tier, 'library.full') || level === 'Beginner') return null;
  return upgradeLock('smart', 'Class locked', 'Free includes our beginner classes. Smart unlocks every guided class at every level.', 'SMART');
}

/** Gate for anything that is not a session. */
export function featureLock(tier: Tier, f: Feature): Lock | null {
  if (can(tier, f)) return null;
  const need = requiredTier(f);
  const copy: Partial<Record<Feature, [string, string]>> = {
    'plan.customise': ['Editing is a Smart feature', 'Smart lets you swap moves and tune reps and times on any workout.'],
    'progress.full': ['Full analytics with Smart', 'Smart keeps your complete history — weight, calories, workouts and trends over time.'],
    'library.full': ['Full workout library with Smart', 'Unlock every body-focus workout and guided class at all levels.'],
    'program.allDays': ['Unlock all 30 days', `The Free plan includes Day ${FREE_PROGRAM_DAYS}. Smart unlocks the whole program.`],
    trainer: ['Your personal trainer', 'Pro assigns you a certified trainer with a coaching dashboard, chat and calls.'],
    'trainer.chat': ['Chat with your trainer', 'Pro members message their trainer and get workouts built for them.'],
    'trainer.call': ['Call your trainer', 'Pro members can start an audio or video session with their trainer.'],
    'trainer.demos': ['Real-athlete demonstrations', 'Pro swaps the illustrated animations for photo demonstrations of each move.'],
    'trainer.plans': ['Trainer-built plans', 'Pro members train on programs their coach writes for them.'],
  };
  const [title, text] = copy[f] ?? ['Locked', `Upgrade to ${TIER_LABEL[need]} to unlock this.`];
  return upgradeLock(need, title, text, need === 'pro' ? 'PRO' : 'SMART');
}

/** The highest program day this plan may train. */
export const unlockedProgramDays = (tier: Tier) => (can(tier, 'program.allDays') ? PROGRAM_DAYS : FREE_PROGRAM_DAYS);
