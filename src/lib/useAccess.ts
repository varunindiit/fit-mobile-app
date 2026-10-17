import { useMemo } from 'react';

import { can, classLock, featureLock, planStatus, sessionLock, unlockedProgramDays, type Feature, type Lock, type PlanStatus, type Tier } from './entitlements';
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
  /** Lock for a guided class of this level. */
  lockClass: (level: string) => Lock | null;
  /** Highest program day this plan may train. */
  daysOpen: () => number;
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
  const { premium } = state;

  return useMemo(() => {
    const status = planStatus(premium);
    const tier: Tier = status.tier;
    return {
      ...status,
      isFree: tier === 'free',
      isSmart: tier === 'smart',
      isPro: tier === 'pro',
      can: (f) => can(tier, f),
      lock: (f) => featureLock(tier, f),
      lockFor: (key) => sessionLock(tier, key),
      lockClass: (level) => classLock(tier, level),
      daysOpen: () => unlockedProgramDays(tier),
    };
  }, [premium]);
}
