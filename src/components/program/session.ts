import { FOCUS_SESSIONS, PROGRAM_DAYS, PROGRAMS, programById, sessionByKey, type Session, type SessionItem } from '@/data/program';
import { proItems, proSession } from '@/data/proDemos';
import { trainerPlanByKey } from '@/data/trainerPlans';
import { trainerById } from '@/data/trainers';
import { pad } from '@/lib/calc';
import { fade, onFill } from '@/theme';

/** The session's exercise list, with the user's saved edits (store `planEdits`) applied and,
 *  on Pro, the exercises without a real-athlete demonstration filtered out. */
export const planItems = (s: Session, planEdits: Record<string, SessionItem[]>, pro = false) =>
  proItems(planEdits[s.key]?.length ? planEdits[s.key] : s.items, pro);

/** The session as this plan sees it — the baseline a day screen compares its edits against,
 *  and what every card should measure for its "x moves · y min" line. */
export const planSession = (s: Session, pro = false) => proSession(s, pro);

/** Like sessionByKey, but rejects malformed program keys (unknown plan / out-of-range day). */
export function findSession(key: string): Session | undefined {
  if (!key) return undefined;
  // Coach-assigned plans run through the same day screen and player as everything else.
  if (key.startsWith('trainer:')) return trainerPlanByKey(key);
  if (key.startsWith('program:')) {
    const [, pid, d] = key.split(':');
    const day = Number(d);
    if (!PROGRAMS.some((p) => p.id === pid) || !Number.isInteger(day) || day < 1 || day > PROGRAM_DAYS) return undefined;
  }
  return sessionByKey(key);
}

const LEVEL_BOLTS: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 };

export function sessionMeta(s: Session) {
  if (s.key.startsWith('trainer:')) {
    const plan = trainerPlanByKey(s.key);
    const coach = trainerById(plan?.trainerId);
    return { program: undefined, day: undefined, level: 'Coach plan', bolts: 2, eyebrow: `Written by ${coach.name}` };
  }
  if (s.key.startsWith('program:')) {
    const [, pid, d] = s.key.split(':');
    const program = programById(pid);
    return { program, day: Number(d), level: program.level as string, bolts: program.bolts, eyebrow: program.title };
  }
  const f = FOCUS_SESSIONS.find((x) => x.key === s.key);
  const level = f?.level ?? 'Beginner';
  return { program: undefined, day: undefined, level, bolts: LEVEL_BOLTS[level] ?? 1, eyebrow: f ? `${f.part} workout` : 'Workout' };
}

export function logTitle(s: Session) {
  const m = sessionMeta(s);
  return m.program ? `${m.program.title} · Day ${m.day}` : s.title;
}

export const fmtClock = (sec: number) => {
  const t = Math.max(0, Math.round(sec));
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
};

export const itemLabel = (it: SessionItem) => (it.seconds ? fmtClock(it.seconds) : `x ${it.reps ?? 10}`);

const FOCUS_COLORS: Record<string, string> = {
  'Rectus abdominis': '#3B82F6',
  Obliques: '#F59E0B',
  'Full body': '#27AD15',
  Cardio: '#E5484D',
  Quadriceps: '#8B5CF6',
  Glutes: '#EC4899',
  Chest: '#F97316',
  Arm: '#14B8A6',
  Leg: '#6366F1',
  Back: '#0EA5E9',
};
export const focusColor = (name: string) => FOCUS_COLORS[name] ?? '#64748B';

/** Every surface a session owns — its day page and its player — is themed off the session's own
 *  gradient, so header, CTA, pills and timeline all read as one colour. */
export type Accent = ReturnType<typeof accentTheme>;
export function accentTheme([from, to]: [string, string]) {
  return {
    /** The session gradient itself, reused for the CTA so header and button match. */
    cta: [from, to] as [string, string],
    accent: to,
    soft: fade(from, 0.15),
    tint: fade(to, 0.26),
    on: onFill(to),
    art: ['#FFFFFF', fade(from, 0.18)] as [string, string],
  };
}
