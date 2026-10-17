import { useMemo } from 'react';

import { can, featureLock, planStatus, sessionLock, unlockedProgramDays, type Feature, type Lock, type PlanStatus, type Tier } from './entitlements';
import { useStore } from './store';

export type Access = PlanStatus & {
  isFree: boolean;
  isSmart: boolean;
  isPro: boolean;
  /** Has at least this feature. */
  can: (f: Feature) => boolean;
  /** Lock for a feature, or `null` when unlocked. */
  lock: (f: Feature) => Lock | null;
  /** Lock for a session key (program day, focus session, trainer plan). */
  lockFor: (key: string) => Lock | null;
  /** Highest program day this account may open, for `programId`. */
  daysOpen: (programId: string) => number;
};

/**
 * Plan-aware access for a screen. The only way UI should ask "can this user…?".
 *
 * ```ts
 * const a = useAccess();
 * const lock = a.lockFor(session.key);
 * if (lock) return <LockedSession lock={lock} />;
 * ```
 */
export function useAccess(): Access {
  const { state } = useStore();
  const { premium, programProgress } = state;

  return useMemo(() => {
    const status = planStatus(premium);
    const tier: Tier = status.tier;
    const doneFor = (key: string) => (key.startsWith('program:') ? programProgress[key.split(':')[1]] ?? 0 : 0);
    return {
      ...status,
      isFree: tier === 'free',
      isSmart: tier === 'smart',
      isPro: tier === 'pro',
      can: (f) => can(tier, f),
      lock: (f) => featureLock(tier, f),
      lockFor: (key) => sessionLock(tier, key, doneFor(key)),
      daysOpen: (programId) => unlockedProgramDays(tier, programProgress[programId] ?? 0),
    };
  }, [premium, programProgress]);
}
